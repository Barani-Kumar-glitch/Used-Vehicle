import {
  RequestLog,
  Customer,
  Vehicle,
  Driver,
  SaleOrder,
  RentalBooking,
  VehiclePrice,
  VehicleRemovalLog,
  VehicleAvailability,
  DriverAvailability,
  StatusEventLog,
  ActivityLog,
  Payment
} from '../models/index.js';
import { syncPaymentRecord } from './orders.controller.js';
import { checkAndTriggerConversion } from '../services/referralService.js';

// POST /api/requests - Customer: Submit request (buy/rent/driver)
export const createRequest = async (req, res, next) => {
  try {
    const { vehicle_id, driver_id, request_type, referral_code, details } = req.body;
    const customerId = req.customer.customer_id;
    
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }
    
    // Verify vehicle if provided
    let vehicle = null;
    if (vehicle_id) {
      vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      if (request_type !== 'extension' && vehicle.status !== 'available') {
        return res.status(400).json({ message: 'Vehicle is not available' });
      }
    }
    
    // Verify driver if provided
    let driver = null;
    if (driver_id) {
      driver = await Driver.findByPk(driver_id);
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      if (driver.status !== 'available') {
        return res.status(400).json({ message: 'Driver is not available' });
      }
    }
    
    // Create Request
    const request = await RequestLog.create({
      customer_id: customerId,
      vehicle_id: vehicle_id || null,
      driver_id: driver_id || null,
      request_type, // buy, rent, driver
      referral_code: referral_code || null,
      details: details || '',
      status: 'pending',
    });
    
    // Log Status Event
    let eventType = 'Request Submitted';
    if (request_type === 'buy') eventType = 'Sale Request';
    else if (request_type === 'rent') eventType = 'Rental Request';
    else if (request_type === 'driver') eventType = 'Driver Request';
    else if (request_type === 'extension') eventType = 'Rental Extension Request';
    
    await StatusEventLog.create({
      event_type: eventType,
      entity_type: 'REQUEST_LOG',
      entity_id: request.request_id,
      new_status: 'pending',
      triggered_by: `customer:${customerId}`,
      payload: {
        customer_name: customer.name,
        vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
        driver: driver ? driver.name : null,
        referral_code
      },
    });
    
    return res.status(201).json({
      message: 'Request submitted successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests - Admin: List all requests
export const listRequests = async (req, res, next) => {
  try {
    const { status, request_type, request_id } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (request_type) whereClause.request_type = request_type;
    if (request_id) whereClause.request_id = request_id;
    
    const requests = await RequestLog.findAll({
      where: whereClause,
      include: [
        { model: Customer, attributes: ['name', 'phone', 'email'] },
        { 
          model: Vehicle, 
          required: false, 
          include: [{ association: 'prices', required: false }] 
        },
        { model: Driver, required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({ requests });
  } catch (error) {
    next(error);
  }
};

// POST /api/requests/:id/accept - Admin: Accept request and generate order
export const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { final_price, start_time, end_time, payment_status, transfer_date, payment_method } = req.body;
    const adminId = req.admin.admin_id;
    
    const request = await RequestLog.findByPk(id, {
      include: [Customer, Vehicle, Driver]
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed.' });
    }
    
    // Update request status
    request.status = 'accepted';
    await request.save();

    // Update the corresponding status event log status to accepted
    await StatusEventLog.update(
      { new_status: 'accepted' },
      { where: { entity_type: 'REQUEST_LOG', entity_id: id } }
    );
    
    let createdOrder = null;
    
    if (request.request_type === 'buy') {
      // 1. Double check vehicle availability
      const vehicle = request.Vehicle;
      if (!vehicle || vehicle.status !== 'available') {
        return res.status(400).json({ message: 'Vehicle is no longer available for purchase.' });
      }
      
      // Get vehicle active price
      const priceRecord = await VehiclePrice.findOne({
        where: { vehicle_id: vehicle.vehicle_id, effective_to: null }
      });
      const salePrice = final_price || (priceRecord ? priceRecord.price : 0.00);
      
      // 2. Create SaleOrder
      createdOrder = await SaleOrder.create({
        vehicle_id: vehicle.vehicle_id,
        customer_id: request.customer_id,
        price: salePrice,
        payment_status: payment_status || 'unpaid',
        ownership_transfer_date: transfer_date ? new Date(transfer_date) : null,
        sale_date: new Date(),
      });

      if (payment_status === 'paid') {
        await syncPaymentRecord({
          sale_order_id: createdOrder.sale_order_id,
          amount: createdOrder.price,
          payment_method: payment_method || 'UPI',
          adminId
        });
      }
      
      // 3. Mark vehicle as sold and log removal
      vehicle.status = 'sold';
      await vehicle.save();
      
      await VehicleRemovalLog.create({
        vehicle_id: vehicle.vehicle_id,
        reason: 'sold',
        removed_at: new Date(),
        removed_by_admin_id: adminId,
      });
      
      // 4. Trigger referral conversion check!
      if (request.referral_code) {
        await checkAndTriggerConversion(
          createdOrder.sale_order_id,
          request.customer_id,
          vehicle.vehicle_id,
          request.referral_code
        );
      } else {
        // Run general check to see if customer had a visit
        await checkAndTriggerConversion(
          createdOrder.sale_order_id,
          request.customer_id,
          vehicle.vehicle_id
        );
      }
      
      // Log Status Event
      await StatusEventLog.create({
        event_type: 'Sale Completed',
        entity_type: 'SALE_ORDER',
        entity_id: createdOrder.sale_order_id,
        new_status: 'completed',
        triggered_by: `admin:${adminId}`,
        payload: {
          customer: request.Customer.name,
          vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          price: salePrice,
        },
      });
      
    } else if (request.request_type === 'rent') {
      // 1. Double check vehicle availability
      const vehicle = request.Vehicle;
      if (!vehicle || vehicle.status !== 'available') {
        return res.status(400).json({ message: 'Vehicle is no longer available for rent.' });
      }
      
      // Get rental price
      const priceRecord = await VehiclePrice.findOne({
        where: { vehicle_id: vehicle.vehicle_id, effective_to: null }
      });
      
      // Calculate rental price based on start/end times if not provided
      let rentalPrice = final_price;
      const start = start_time ? new Date(start_time) : new Date();
      const end = end_time ? new Date(end_time) : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day default
      
      if (!rentalPrice && priceRecord) {
        const diffMs = Math.abs(end - start);
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffHours < 24) {
          rentalPrice = diffHours * parseFloat(priceRecord.hourly_rate || '0');
        } else {
          rentalPrice = diffDays * parseFloat(priceRecord.daily_rate || '0');
        }
      }
      rentalPrice = rentalPrice || 0.00;
      
      // 2. Create RentalBooking
      createdOrder = await RentalBooking.create({
        vehicle_id: vehicle.vehicle_id,
        customer_id: request.customer_id,
        driver_id: request.driver_id || null,
        pickup_time: start,
        expected_return_time: end,
        price: rentalPrice,
        payment_status: payment_status || 'unpaid',
      });

      if (payment_status === 'paid') {
        await syncPaymentRecord({
          rental_id: createdOrder.rental_id,
          amount: createdOrder.price,
          payment_method: payment_method || 'UPI',
          adminId
        });
      }
      
      // 3. Update vehicle status and block availability
      vehicle.status = 'rented';
      await vehicle.save();
      
      await VehicleAvailability.create({
        vehicle_id: vehicle.vehicle_id,
        start_time: start,
        end_time: end,
        blocked_reason: 'rental',
      });
      
      // 4. Block driver availability if driver exists
      if (request.driver_id) {
        const driver = request.Driver;
        driver.status = 'booked';
        await driver.save();
        
        await DriverAvailability.create({
          driver_id: driver.driver_id,
          start_time: start,
          end_time: end,
          blocked_reason: 'booking',
        });
      }
      
      // Log Status Event
      await StatusEventLog.create({
        event_type: 'Rental Request Accepted',
        entity_type: 'RENTAL_BOOKING',
        entity_id: createdOrder.rental_id,
        new_status: 'active',
        triggered_by: `admin:${adminId}`,
        payload: {
          customer: request.Customer.name,
          vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          price: rentalPrice,
          driver: request.Driver ? request.Driver.name : null,
        },
      });
      
    } else if (request.request_type === 'driver') {
      // Driver hire only
      const driver = request.Driver;
      if (!driver || driver.status !== 'available') {
        return res.status(400).json({ message: 'Driver is no longer available.' });
      }
      
      const start = start_time ? new Date(start_time) : new Date();
      const end = end_time ? new Date(end_time) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Get driver price
      let driverPrice = final_price || 0.00;
      
      // Create RentalBooking with null vehicle
      createdOrder = await RentalBooking.create({
        vehicle_id: request.vehicle_id || null, // Null if driver only
        customer_id: request.customer_id,
        driver_id: driver.driver_id,
        pickup_time: start,
        expected_return_time: end,
        price: driverPrice,
        payment_status: payment_status || 'unpaid',
      });

      if (payment_status === 'paid') {
        await syncPaymentRecord({
          rental_id: createdOrder.rental_id,
          amount: createdOrder.price,
          payment_method: payment_method || 'UPI',
          adminId
        });
      }
      
      // Block driver availability
      driver.status = 'booked';
      await driver.save();
      
      await DriverAvailability.create({
        driver_id: driver.driver_id,
        start_time: start,
        end_time: end,
        blocked_reason: 'booking',
      });
      
      // Log Status Event
      await StatusEventLog.create({
        event_type: 'Driver Request Accepted',
        entity_type: 'RENTAL_BOOKING',
        entity_id: createdOrder.rental_id,
        new_status: 'active',
        triggered_by: `admin:${adminId}`,
        payload: {
          customer: request.Customer.name,
          driver: driver.name,
          price: driverPrice,
        },
      });
    } else if (request.request_type === 'extension') {
      // Rental Extension Request
      const bookingId = request.referral_code;
      if (!bookingId) {
        return res.status(400).json({ message: 'Invalid extension request: Missing target booking ID.' });
      }

      const booking = await RentalBooking.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Target rental booking not found' });
      }

      const newReturnTime = end_time || start_time;
      if (!newReturnTime) {
        return res.status(400).json({ message: 'Please specify the new extended return date and time.' });
      }

      // Create a NEW RentalBooking record for the extension to prevent overwriting the original rental record
      const extensionBooking = await RentalBooking.create({
        vehicle_id: booking.vehicle_id,
        customer_id: booking.customer_id,
        driver_id: booking.driver_id || null,
        pickup_time: booking.expected_return_time, // Extension starts when the old booking expected return time ends
        expected_return_time: new Date(newReturnTime),
        price: final_price ? parseFloat(final_price) : 0.00,
        payment_status: payment_status || 'unpaid',
      });

      // Mark the original booking as transitioned/completed by setting its actual return time
      booking.actual_return_time = booking.expected_return_time;
      await booking.save();

      // Create a new vehicle availability block for the extension period
      if (booking.vehicle_id) {
        await VehicleAvailability.create({
          vehicle_id: booking.vehicle_id,
          start_time: booking.expected_return_time,
          end_time: new Date(newReturnTime),
          blocked_reason: 'rental',
        });
      }

      // Create a new driver availability block for the extension period
      if (booking.driver_id) {
        await DriverAvailability.create({
          driver_id: booking.driver_id,
          start_time: booking.expected_return_time,
          end_time: new Date(newReturnTime),
          blocked_reason: 'booking',
        });
      }

      // Create orders object reference for logging
      createdOrder = extensionBooking;

      if (payment_status === 'paid') {
        await syncPaymentRecord({
          rental_id: createdOrder.rental_id,
          amount: createdOrder.price,
          payment_method: payment_method || 'UPI',
          adminId
        });
      }

      // Log Status Event (linking it to the new extension booking)
      await StatusEventLog.create({
        event_type: 'Rental Extension Approved',
        entity_type: 'RENTAL_BOOKING',
        entity_id: extensionBooking.rental_id,
        new_status: 'extended',
        triggered_by: `admin:${adminId}`,
        payload: {
          customer: request.Customer.name,
          vehicle: request.Vehicle ? `${request.Vehicle.year} ${request.Vehicle.make} ${request.Vehicle.model}` : 'Driver Only',
          new_return_time: newReturnTime,
          price: final_price || 0.00,
          original_booking_id: booking.rental_id,
        },
      });
    }
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'accept_request',
      entity_type: 'REQUEST_LOG',
      entity_id: id,
      old_data: { status: 'pending' },
      new_data: { status: 'accepted', order: createdOrder },
    });
    
    return res.status(200).json({
      message: 'Request accepted and order created successfully',
      order: createdOrder,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/requests/:id/reject - Admin: Reject request
export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const request = await RequestLog.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed.' });
    }

    // Update request status to rejected
    request.status = 'rejected';
    await request.save();

    // Update the corresponding status event log status to rejected
    await StatusEventLog.update(
      { new_status: 'rejected' },
      { where: { entity_type: 'REQUEST_LOG', entity_id: id } }
    );

    // Create a new event log for request rejection
    let eventType = 'Request Rejected';
    if (request.request_type === 'buy') eventType = 'Sale Request Rejected';
    else if (request.request_type === 'rent') eventType = 'Rental Request Rejected';
    else if (request.request_type === 'driver') eventType = 'Driver Request Rejected';
    else if (request.request_type === 'extension') eventType = 'Rental Extension Request Rejected';

    await StatusEventLog.create({
      event_type: eventType,
      entity_type: 'REQUEST_LOG',
      entity_id: id,
      new_status: 'rejected',
      triggered_by: `admin:${adminId}`,
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'reject_request',
      entity_type: 'REQUEST_LOG',
      entity_id: id,
      old_data: { status: 'pending' },
      new_data: { status: 'rejected' },
    });

    return res.status(200).json({
      message: 'Request rejected successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};
