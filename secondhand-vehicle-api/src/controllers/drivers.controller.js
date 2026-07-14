import { Op } from 'sequelize';
import {
  Driver,
  DriverLocation,
  DriverAvailability,
  ActivityLog,
  RequestLog,
  StatusEventLog
} from '../models/index.js';

// GET /api/drivers - List drivers with filter
export const listDrivers = async (req, res, next) => {
  try {
    const { status, city, zone } = req.query;
    
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { [Op.ne]: 'inactive' };
    }

    if (whereClause.status === 'available') {
      const pendingRequests = await RequestLog.findAll({
        where: {
          status: 'pending',
          request_type: ['rent', 'driver']
        },
        attributes: ['driver_id'],
        raw: true
      });
      const pendingDriverIds = pendingRequests.map(r => r.driver_id).filter(Boolean);
      if (pendingDriverIds.length > 0) {
        whereClause.driver_id = { [Op.notIn]: pendingDriverIds };
      }
    }
    
    if (city) {
      whereClause.home_city = { [Op.iLike]: `%${city}%` };
    }
    
    const includeClause = [];
    if (zone || city) {
      const locationWhere = {};
      if (city) locationWhere.city = { [Op.iLike]: `%${city}%` };
      if (zone) locationWhere.zone = { [Op.iLike]: `%${zone}%` };
      
      includeClause.push({
        model: DriverLocation,
        as: 'locations',
        where: locationWhere,
        required: zone ? true : false,
      });
    } else {
      includeClause.push({
        model: DriverLocation,
        as: 'locations',
        required: false,
      });
    }
    
    const drivers = await Driver.findAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({ drivers });
  } catch (error) {
    next(error);
  }
};

// GET /api/drivers/:id - Full details
export const getDriverDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findByPk(id, {
      include: [
        { model: DriverLocation, as: 'locations' },
        { model: DriverAvailability, as: 'availabilities' }
      ]
    });
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    return res.status(200).json({ driver });
  } catch (error) {
    next(error);
  }
};

// POST /api/drivers - Admin: Register driver
export const createDriver = async (req, res, next) => {
  try {
    const { name, licence_number, licence_class, licence_expiry, home_city, city, zone } = req.body;
    const adminId = req.admin.admin_id;
    
    // Check licence duplicate
    const existing = await Driver.findOne({ where: { licence_number } });
    if (existing) {
      return res.status(400).json({ message: 'Driver with this licence number already registered.' });
    }
    
    const driver = await Driver.create({
      name,
      licence_number,
      licence_class,
      licence_expiry,
      home_city,
      status: 'available',
    });
    
    // Assign location if specified
    let driverLocation = null;
    if (city || zone) {
      driverLocation = await DriverLocation.create({
        driver_id: driver.driver_id,
        city: city || home_city,
        zone: zone || 'default',
        assigned_by_admin_id: adminId,
      });
    }
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'register_driver',
      entity_type: 'DRIVER',
      entity_id: driver.driver_id,
      new_data: { driver, location: driverLocation },
    });
    
    return res.status(201).json({
      message: 'Driver registered successfully',
      driver: {
        ...driver.toJSON(),
        locations: driverLocation ? [driverLocation] : []
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/drivers/:id - Admin: Update driver
export const updateDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.admin.admin_id;
    
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const oldData = driver.toJSON();
    const trackableFields = ['name', 'licence_number', 'licence_class', 'licence_expiry', 'home_city', 'status'];
    
    for (const field of trackableFields) {
      if (updates[field] !== undefined) {
        driver[field] = updates[field];
      }
    }
    
    await driver.save();
    
    await StatusEventLog.create({
      event_type: 'Driver Updated',
      entity_type: 'DRIVER',
      entity_id: driver.driver_id,
      previous_status: oldData.status,
      new_status: driver.status,
      triggered_by: `admin:${adminId}`,
      payload: { name: driver.name },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_driver',
      entity_type: 'DRIVER',
      entity_id: driver.driver_id,
      old_data: oldData,
      new_data: driver.toJSON(),
    });
    
    return res.status(200).json({ message: 'Driver details updated', driver });
  } catch (error) {
    next(error);
  }
};

// POST /api/drivers/:id/location - Admin: Assign location
export const assignDriverLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { city, zone } = req.body;
    const adminId = req.admin.admin_id;
    
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const driverLocation = await DriverLocation.create({
      driver_id: id,
      city: city || driver.home_city,
      zone: zone || 'default',
      assigned_by_admin_id: adminId,
    });
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'assign_driver_location',
      entity_type: 'DRIVER',
      entity_id: id,
      new_data: driverLocation,
    });
    
    return res.status(201).json({ message: 'Driver location assigned successfully', location: driverLocation });
  } catch (error) {
    next(error);
  }
};

// POST /api/drivers/:id/availability - Admin: Block schedule
export const blockDriverAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, blocked_reason } = req.body;
    const adminId = req.admin.admin_id;
    
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const block = await DriverAvailability.create({
      driver_id: id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      blocked_reason: blocked_reason || 'booking',
    });
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'block_driver',
      entity_type: 'DRIVER',
      entity_id: id,
      new_data: block,
    });
    
    return res.status(201).json({ message: 'Driver availability blocked successfully', block });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/drivers/:id - Admin: Delete driver record
export const deleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const oldData = driver.toJSON();
    
    // Destroy locations and availabilities first
    await DriverLocation.destroy({ where: { driver_id: id } });
    await DriverAvailability.destroy({ where: { driver_id: id } });
    await driver.destroy();

    await StatusEventLog.create({
      event_type: 'Driver Deleted',
      entity_type: 'DRIVER',
      entity_id: id,
      previous_status: oldData.status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { name: oldData.name },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_driver_manual',
      entity_type: 'DRIVER',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    next(error);
  }
};
