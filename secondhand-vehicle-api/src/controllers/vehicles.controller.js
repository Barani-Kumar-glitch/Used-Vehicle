import { Op } from 'sequelize';
import {
  Vehicle,
  VehiclePrice,
  VehicleAvailability,
  VehicleRemovalLog,
  ProductChangeLog,
  PriceChangeLog,
  StatusEventLog,
  ActivityLog,
  RequestLog
} from '../models/index.js';

// GET /api/vehicles - List all active vehicles with filters
export const listVehicles = async (req, res, next) => {
  try {
    const { status, fuel_type, location, price_min, price_max, listing_mode, make, search, transmission, year, year_min, year_max } = req.query;
    
    // Default filter out delisted/sold unless asked
    const whereClause = {};
    if (status) {
      if (status !== 'all') {
        whereClause.status = status;
      }
    } else {
      whereClause.status = { [Op.notIn]: ['delisted', 'sold'] };
    }

    // Keep vehicles list consistent with status = available
    // Do not filter out vehicles with pending requests so they remain visible on buyer/lending catalog until approved/sold/rented
    
    if (fuel_type) {
      whereClause.fuel_type = fuel_type;
    }
    
    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (transmission) {
      whereClause.transmission = transmission;
    }

    if (year) {
      whereClause.year = parseInt(year, 10);
    } else {
      if (year_min || year_max) {
        whereClause.year = {};
        if (year_min) whereClause.year[Op.gte] = parseInt(year_min, 10);
        if (year_max) whereClause.year[Op.lte] = parseInt(year_max, 10);
      }
    }
    
    if (listing_mode) {
      // Include vehicles listed as 'both' when filtering by 'sale' or 'rental'
      whereClause.listing_mode = { [Op.in]: [listing_mode, 'both'] };
    }
    
    if (make) {
      whereClause.make = { [Op.iLike]: `%${make}%` };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { make: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    // Query vehicles including pricing
    const vehicles = await Vehicle.findAll({
      where: whereClause,
      include: [
        {
          model: VehiclePrice,
          as: 'prices',
          required: false,
          where: {
            effective_to: null, // Only active pricing
          }
        }
      ],
      order: [['created_at', 'DESC']],
    });
    
    // Filter by price range client-side or check queries
    let filteredVehicles = vehicles;
    if (price_min || price_max) {
      const min = parseFloat(price_min || '0');
      const max = parseFloat(price_max || '999999999');
      
      filteredVehicles = vehicles.filter(v => {
        const activePrice = v.prices && v.prices[0];
        if (!activePrice) return false;
        
        const cost = v.listing_mode === 'sale' ? activePrice.price : activePrice.daily_rate;
        return parseFloat(cost) >= min && parseFloat(cost) <= max;
      });
    }
    
    return res.status(200).json({ vehicles: filteredVehicles });
  } catch (error) {
    next(error);
  }
};

// GET /api/vehicles/:id - Full details + pricing + availability
export const getVehicleDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findByPk(id, {
      include: [
        { model: VehiclePrice, as: 'prices' },
        { model: VehicleAvailability, as: 'availabilities' }
      ]
    });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    return res.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
};

// POST /api/vehicles - Admin only: Add new vehicle
export const createVehicle = async (req, res, next) => {
  try {
    const {
      make, model, year, fuel_type, transmission, location, listing_mode, photo_url,
      price, hourly_rate, daily_rate, driver_hourly_rate, driver_daily_rate, km_driven
    } = req.body;
    
    const adminId = req.admin.admin_id;
    
    // 1. Create vehicle
    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      fuel_type,
      transmission,
      location,
      listing_mode: listing_mode || 'sale',
      photo_url,
      status: 'available',
      rate_per_hour: hourly_rate || null,
      rate_per_day: daily_rate || null,
      km_driven: km_driven || 0,
    });
    
    // 2. Create pricing entry
    const vehiclePrice = await VehiclePrice.create({
      vehicle_id: vehicle.vehicle_id,
      listing_mode: listing_mode || 'sale',
      price: price || null,
      hourly_rate: hourly_rate || null,
      daily_rate: daily_rate || null,
      driver_hourly_rate: driver_hourly_rate || null,
      driver_daily_rate: driver_daily_rate || null,
      effective_from: new Date(),
    });
    
    // 3. Write StatusEventLog
    await StatusEventLog.create({
      event_type: 'Vehicle Added',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      new_status: 'available',
      triggered_by: `admin:${adminId}`,
      payload: { make, model, year, price },
    });
    
    // 4. Write ActivityLog
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_vehicle',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      new_data: { vehicle, price: vehiclePrice },
    });
    
    return res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: {
        ...vehicle.toJSON(),
        prices: [vehiclePrice]
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/vehicles/:id - Admin only: Update vehicle
export const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;
    const updates = req.body;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const oldData = vehicle.toJSON();
    const productChanges = [];
    
    // Track change log fields
    const trackableFields = ['make', 'model', 'year', 'fuel_type', 'transmission', 'location', 'status', 'listing_mode', 'photo_url', 'km_driven'];
    
    for (const field of trackableFields) {
      if (updates[field] !== undefined && String(updates[field]) !== String(oldData[field])) {
        productChanges.push({
          vehicle_id: vehicle.vehicle_id,
          field_name: field,
          old_value: oldData[field] !== null ? String(oldData[field]) : null,
          new_value: String(updates[field]),
          changed_by_admin_id: adminId,
        });
        vehicle[field] = updates[field];
      }
    }

    // Also update rate_per_hour and rate_per_day on Vehicle model itself
    if (updates.hourly_rate !== undefined && String(updates.hourly_rate) !== String(oldData.rate_per_hour)) {
      productChanges.push({
        vehicle_id: vehicle.vehicle_id,
        field_name: 'rate_per_hour',
        old_value: oldData.rate_per_hour !== null ? String(oldData.rate_per_hour) : null,
        new_value: String(updates.hourly_rate),
        changed_by_admin_id: adminId,
      });
      vehicle.rate_per_hour = updates.hourly_rate;
    }

    if (updates.daily_rate !== undefined && String(updates.daily_rate) !== String(oldData.rate_per_day)) {
      productChanges.push({
        vehicle_id: vehicle.vehicle_id,
        field_name: 'rate_per_day',
        old_value: oldData.rate_per_day !== null ? String(oldData.rate_per_day) : null,
        new_value: String(updates.daily_rate),
        changed_by_admin_id: adminId,
      });
      vehicle.rate_per_day = updates.daily_rate;
    }
    
    // Save vehicle updates
    await vehicle.save();
    
    // Save product change log records
    if (productChanges.length > 0) {
      await ProductChangeLog.bulkCreate(productChanges);
    }
    
    // Handle optional pricing updates (if prices fields are passed)
    let activePriceRecord = null;
    const hasPriceUpdates = updates.price !== undefined ||
                            updates.hourly_rate !== undefined ||
                            updates.daily_rate !== undefined ||
                            updates.driver_hourly_rate !== undefined ||
                            updates.driver_daily_rate !== undefined;
                            
    if (hasPriceUpdates) {
      // Find current pricing
      const currentPrice = await VehiclePrice.findOne({
        where: { vehicle_id: id, effective_to: null }
      });
      
      if (currentPrice) {
        const oldPrice = currentPrice.price;
        
        // Update the existing pricing record instead of creating a new one
        currentPrice.listing_mode = updates.listing_mode || currentPrice.listing_mode;
        if (updates.price !== undefined) currentPrice.price = updates.price;
        if (updates.hourly_rate !== undefined) currentPrice.hourly_rate = updates.hourly_rate;
        if (updates.daily_rate !== undefined) currentPrice.daily_rate = updates.daily_rate;
        if (updates.driver_hourly_rate !== undefined) currentPrice.driver_hourly_rate = updates.driver_hourly_rate;
        if (updates.driver_daily_rate !== undefined) currentPrice.driver_daily_rate = updates.driver_daily_rate;
        
        await currentPrice.save();
        activePriceRecord = currentPrice;
        
        // Log price change if price changed
        if (updates.price !== undefined && String(oldPrice) !== String(updates.price)) {
          await PriceChangeLog.create({
            price_id: currentPrice.price_id,
            old_price: oldPrice,
            new_price: currentPrice.price,
            changed_by_admin_id: adminId,
          });
        }
      } else {
        // Create initial pricing if none exists
        activePriceRecord = await VehiclePrice.create({
          vehicle_id: id,
          listing_mode: vehicle.listing_mode,
          price: updates.price || null,
          hourly_rate: updates.hourly_rate || null,
          daily_rate: updates.daily_rate || null,
          driver_hourly_rate: updates.driver_hourly_rate || null,
          driver_daily_rate: updates.driver_daily_rate || null,
          effective_from: new Date(),
        });
      }
    } else {
      // Fetch the active price record to return in response
      activePriceRecord = await VehiclePrice.findOne({
        where: { vehicle_id: id, effective_to: null }
      });
    }
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_vehicle',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      old_data: oldData,
      new_data: vehicle.toJSON(),
    });
    
    // Log Status Event
    await StatusEventLog.create({
      event_type: 'Vehicle Updated',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      previous_status: oldData.status,
      new_status: vehicle.status,
      triggered_by: `admin:${adminId}`,
      payload: { changedFields: productChanges.map(c => c.field_name) },
    });
    
    return res.status(200).json({
      message: 'Vehicle updated successfully',
      vehicle: {
        ...vehicle.toJSON(),
        prices: activePriceRecord ? [activePriceRecord] : []
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/vehicles/:id/remove - Admin only: Remove vehicle
export const removeVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.admin_id;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const previousStatus = vehicle.status;
    vehicle.status = 'delisted';
    await vehicle.save();
    
    // Create removal log
    const removalLog = await VehicleRemovalLog.create({
      vehicle_id: vehicle.vehicle_id,
      reason: reason || 'Withdrawn by Admin',
      removed_at: new Date(),
      removed_by_admin_id: adminId,
    });
    
    // Log Status Event
    await StatusEventLog.create({
      event_type: 'Vehicle Removed',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      previous_status: previousStatus,
      new_status: 'delisted',
      triggered_by: `admin:${adminId}`,
      payload: { reason },
    });
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'remove_vehicle',
      entity_type: 'VEHICLE',
      entity_id: vehicle.vehicle_id,
      old_data: { status: previousStatus },
      new_data: { status: 'delisted', removal: removalLog },
    });
    
    return res.status(200).json({ message: 'Vehicle removed from listing' });
  } catch (error) {
    next(error);
  }
};

// GET /api/vehicles/:id/pricing - Get pricing history
export const getVehiclePricingHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prices = await VehiclePrice.findAll({
      where: { vehicle_id: id },
      order: [['effective_from', 'DESC']],
    });
    return res.status(200).json({ prices });
  } catch (error) {
    next(error);
  }
};

// POST /api/vehicles/:id/pricing - Create new pricing record
export const createVehiclePricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { listing_mode, price, hourly_rate, daily_rate, driver_hourly_rate, driver_daily_rate } = req.body;
    const adminId = req.admin.admin_id;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // End active pricing record
    const currentPrice = await VehiclePrice.findOne({
      where: { vehicle_id: id, effective_to: null }
    });
    
    if (currentPrice) {
      currentPrice.effective_to = new Date();
      await currentPrice.save();
    }
    
    // Create new pricing record
    const newPrice = await VehiclePrice.create({
      vehicle_id: id,
      listing_mode: listing_mode || vehicle.listing_mode,
      price: price || null,
      hourly_rate: hourly_rate || null,
      daily_rate: daily_rate || null,
      driver_hourly_rate: driver_hourly_rate || null,
      driver_daily_rate: driver_daily_rate || null,
      effective_from: new Date(),
    });
    
    if (currentPrice) {
      // Log Price change log
      await PriceChangeLog.create({
        price_id: currentPrice.price_id,
        old_price: currentPrice.price,
        new_price: newPrice.price,
        changed_by_admin_id: adminId,
      });
    }
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_pricing',
      entity_type: 'VEHICLE',
      entity_id: id,
      new_data: newPrice,
    });
    
    return res.status(201).json({ message: 'Pricing record created', pricing: newPrice });
  } catch (error) {
    next(error);
  }
};

// GET /api/vehicles/:id/availability - Get vehicle availability schedule
export const getVehicleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const availabilities = await VehicleAvailability.findAll({
      where: { vehicle_id: id },
      order: [['start_time', 'ASC']],
    });
    return res.status(200).json({ availabilities });
  } catch (error) {
    next(error);
  }
};

// POST /api/vehicles/:id/availability - Admin: Block schedule
export const createVehicleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, blocked_reason } = req.body;
    const adminId = req.admin.admin_id;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const block = await VehicleAvailability.create({
      vehicle_id: id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      blocked_reason: blocked_reason || 'maintenance',
    });
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'block_vehicle',
      entity_type: 'VEHICLE',
      entity_id: id,
      new_data: block,
    });
    
    return res.status(201).json({ message: 'Vehicle availability blocked successfully', block });
  } catch (error) {
    next(error);
  }
};

// POST /api/vehicles/upload - Admin: Upload vehicle image
export const uploadVehiclePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const photoUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ photoUrl });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/vehicles/:id - Admin physically delete a vehicle
export const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const oldData = vehicle.toJSON();
    
    // Delete associated entries first to avoid constraint issues
    await VehiclePrice.destroy({ where: { vehicle_id: id } });
    await VehicleAvailability.destroy({ where: { vehicle_id: id } });
    await vehicle.destroy();

    await StatusEventLog.create({
      event_type: 'Vehicle Deleted',
      entity_type: 'VEHICLE',
      entity_id: id,
      previous_status: oldData.status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { make: oldData.make, model: oldData.model, year: oldData.year },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_vehicle_manual',
      entity_type: 'VEHICLE',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    next(error);
  }
};

