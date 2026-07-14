import {
  SaleOrder,
  RentalBooking,
  Payment,
  Vehicle,
  Driver,
  VehicleRemovalLog,
  VehicleAvailability,
  DriverAvailability,
  StatusEventLog,
  ActivityLog,
  Customer,
  RequestLog,
  Referral
} from '../models/index.js';
import { checkAndTriggerConversion } from '../services/referralService.js';

// Sync payment record helper
export const syncPaymentRecord = async ({ sale_order_id, rental_id, amount, payment_method, payment_status, adminId }) => {
  const whereClause = {};
  if (sale_order_id) whereClause.sale_order_id = sale_order_id;
  if (rental_id) whereClause.rental_id = rental_id;

  // If payment status is updated to something other than 'paid', remove any completed payment records
  if (payment_status && payment_status !== 'paid') {
    await Payment.destroy({ where: whereClause });
    return null;
  }

  // Otherwise, ensure the payment record is present and synchronized
  const existingPayment = await Payment.findOne({ where: whereClause });
  if (!existingPayment) {
    const payment = await Payment.create({
      sale_order_id: sale_order_id || null,
      rental_id: rental_id || null,
      amount,
      payment_method: payment_method || 'UPI',
      payment_status: 'completed',
      paid_at: new Date(),
    });

    await StatusEventLog.create({
      event_type: 'Payment Received (Full)',
      entity_type: sale_order_id ? 'SALE_ORDER' : 'RENTAL_BOOKING',
      entity_id: sale_order_id || rental_id,
      new_status: 'paid',
      triggered_by: adminId ? `admin:${adminId}` : 'system',
      payload: { amount, totalPaid: amount, price: amount, payment_method: payment.payment_method },
    });
    return payment;
  } else {
    // Sync any changes to amount and payment method
    existingPayment.amount = amount;
    existingPayment.payment_method = payment_method || 'UPI';
    await existingPayment.save();
    return existingPayment;
  }
};

// GET /api/orders/sale - List sale orders
export const listSaleOrders = async (req, res, next) => {
  try {
    const whereClause = {};
    if (req.customer) {
      whereClause.customer_id = req.customer.customer_id;
    } else if (req.query.customer_id) {
      whereClause.customer_id = req.query.customer_id;
    }

    const orders = await SaleOrder.findAll({
      where: whereClause,
      include: [
        { model: Customer, attributes: ['name', 'phone', 'email'] },
        { model: Vehicle },
        {
          model: Referral,
          as: 'referral',
          include: [
            { model: Customer, as: 'Referrer', attributes: ['name', 'phone', 'email'] }
          ]
        },
        {
          model: SaleOrder,
          as: 'ExchangeOrder',
          include: [
            { model: Vehicle }
          ]
        }
      ],
      order: [['sale_date', 'DESC']],
    });
    return res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/sale - Admin create sale order
export const createSaleOrder = async (req, res, next) => {
  try {
    const { vehicle_id, customer_id, price, payment_status, transfer_date, referral_code, payment_method } = req.body;
    const adminId = req.admin.admin_id;

    // Verify vehicle
    const vehicle = await Vehicle.findByPk(vehicle_id);
    if (!vehicle || vehicle.status !== 'available') {
      return res.status(400).json({ message: 'Vehicle is not available for purchase.' });
    }

    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const saleOrder = await SaleOrder.create({
      vehicle_id,
      customer_id,
      price,
      payment_status: payment_status || 'unpaid',
      ownership_transfer_date: transfer_date ? new Date(transfer_date) : null,
      sale_date: new Date(),
    });

    // Mark vehicle sold
    vehicle.status = 'sold';
    await vehicle.save();

    // Create removal log
    await VehicleRemovalLog.create({
      vehicle_id: vehicle.vehicle_id,
      reason: 'sold',
      removed_at: new Date(),
      removed_by_admin_id: adminId,
    });

    // Trigger referral conversion check
    await checkAndTriggerConversion(
      saleOrder.sale_order_id,
      customer_id,
      vehicle_id,
      referral_code
    );

    // Log Status Event
    await StatusEventLog.create({
      event_type: 'Sale Completed',
      entity_type: 'SALE_ORDER',
      entity_id: saleOrder.sale_order_id,
      new_status: 'completed',
      triggered_by: `admin:${adminId}`,
      payload: {
        customer: customer.name,
        vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        price: price,
      },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_sale_order',
      entity_type: 'SALE_ORDER',
      entity_id: saleOrder.sale_order_id,
      new_data: saleOrder,
    });

    if (payment_status === 'paid') {
      await syncPaymentRecord({
        sale_order_id: saleOrder.sale_order_id,
        amount: saleOrder.price,
        payment_method: payment_method || 'UPI',
        adminId
      });
    }

    return res.status(201).json({ message: 'Sale order created successfully', order: saleOrder });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/sale/:id - Get detail
export const getSaleOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await SaleOrder.findByPk(id, {
      include: [
        Customer,
        Vehicle,
        { model: Payment, as: 'payments' },
        {
          model: Referral,
          as: 'referral',
          include: [
            { model: Customer, as: 'Referrer', attributes: ['name', 'phone', 'email'] }
          ]
        },
        {
          model: SaleOrder,
          as: 'ExchangeOrder',
          include: [
            { model: Vehicle }
          ]
        }
      ]
    });
    if (!order) {
      return res.status(404).json({ message: 'Sale order not found' });
    }
    return res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/sale/:id - Update order
export const updateSaleOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status, transfer_date, payment_method } = req.body;
    const adminId = req.admin.admin_id;

    const order = await SaleOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Sale order not found' });
    }

    const oldData = order.toJSON();
    if (payment_status) order.payment_status = payment_status;
    if (transfer_date) order.ownership_transfer_date = new Date(transfer_date);
    await order.save();

    await StatusEventLog.create({
      event_type: 'Sale Order Updated',
      entity_type: 'SALE_ORDER',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: order.payment_status,
      triggered_by: `admin:${adminId}`,
      payload: { price: order.price },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_sale_order',
      entity_type: 'SALE_ORDER',
      entity_id: id,
      old_data: oldData,
      new_data: order.toJSON(),
    });

    await syncPaymentRecord({
      sale_order_id: order.sale_order_id,
      amount: order.price,
      payment_method: payment_method || 'UPI',
      payment_status: order.payment_status,
      adminId
    });

    return res.status(200).json({ message: 'Order updated successfully', order });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/rental - List rentals
export const listRentals = async (req, res, next) => {
  try {
    const whereClause = {};

    // If client is customer, restrict to their own bookings
    if (req.customer) {
      whereClause.customer_id = req.customer.customer_id;
    } else if (req.query.customer_id) {
      whereClause.customer_id = req.query.customer_id;
    }

    const rentals = await RentalBooking.findAll({
      where: whereClause,
      include: [
        { model: Customer, attributes: ['name', 'phone', 'email'] },
        { model: Vehicle, required: false },
        { model: Driver, required: false },
      ],
      order: [['pickup_time', 'DESC']],
    });

    // Fetch accepted extension requests
    const extensions = await RequestLog.findAll({
      where: { request_type: 'extension', status: 'accepted' }
    });

    const rentalsWithExtensions = rentals.map(rental => {
      const matchingExt = extensions.find(ext => ext.referral_code === rental.rental_id.toString());
      return {
        ...rental.toJSON(),
        extension: matchingExt ? {
          details: matchingExt.details,
          accepted_at: matchingExt.updatedAt
        } : null
      };
    });

    return res.status(200).json({ rentals: rentalsWithExtensions });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/rental - Admin create rental
export const createRental = async (req, res, next) => {
  try {
    const { vehicle_id, customer_id, driver_id, pickup_time, return_time, price, payment_status, payment_method } = req.body;
    const adminId = req.admin.admin_id;

    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // If vehicle provided, check it
    let vehicle = null;
    if (vehicle_id) {
      vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle || vehicle.status !== 'available') {
        return res.status(400).json({ message: 'Vehicle is not available for rent.' });
      }
    }

    // If driver provided, check it
    let driver = null;
    if (driver_id) {
      driver = await Driver.findByPk(driver_id);
      if (!driver || driver.status !== 'available') {
        return res.status(400).json({ message: 'Driver is not available.' });
      }
    }

    const pickup = new Date(pickup_time);
    const expectedReturn = new Date(return_time);

    const booking = await RentalBooking.create({
      vehicle_id: vehicle_id || null,
      customer_id,
      driver_id: driver_id || null,
      pickup_time: pickup,
      expected_return_time: expectedReturn,
      price,
      payment_status: payment_status || 'unpaid',
    });

    // Update vehicle status & block dates
    if (vehicle) {
      vehicle.status = 'rented';
      await vehicle.save();

      await VehicleAvailability.create({
        vehicle_id: vehicle.vehicle_id,
        start_time: pickup,
        end_time: expectedReturn,
        blocked_reason: 'rental',
      });
    }

    // Update driver status & block dates
    if (driver) {
      driver.status = 'booked';
      await driver.save();

      await DriverAvailability.create({
        driver_id: driver.driver_id,
        start_time: pickup,
        end_time: expectedReturn,
        blocked_reason: 'booking',
      });
    }

    // Log Status Event
    await StatusEventLog.create({
      event_type: 'Rental Created',
      entity_type: 'RENTAL_BOOKING',
      entity_id: booking.rental_id,
      new_status: 'active',
      triggered_by: `admin:${adminId}`,
      payload: {
        customer: customer.name,
        vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
        driver: driver ? driver.name : null,
        price,
      },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_rental_booking',
      entity_type: 'RENTAL_BOOKING',
      entity_id: booking.rental_id,
      new_data: booking,
    });

    if (payment_status === 'paid') {
      await syncPaymentRecord({
        rental_id: booking.rental_id,
        amount: booking.price,
        payment_method: payment_method || 'UPI',
        adminId
      });
    }

    return res.status(201).json({ message: 'Rental booking created successfully', booking });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/rental/:id/return - Mark returned
export const returnRental = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const booking = await RentalBooking.findByPk(id, {
      include: [Vehicle, Driver, Customer]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Rental booking not found' });
    }
    if (booking.actual_return_time) {
      return res.status(400).json({ message: 'Vehicle has already been returned' });
    }

    booking.actual_return_time = new Date();
    await booking.save();

    // Free vehicle availability block & update status
    if (booking.Vehicle) {
      booking.Vehicle.status = 'available';
      await booking.Vehicle.save();

      // Delete or update the availability block
      await VehicleAvailability.destroy({
        where: {
          vehicle_id: booking.vehicle_id,
          blocked_reason: 'rental',
          start_time: booking.pickup_time
        }
      });
    }

    // Free driver availability & update status
    if (booking.Driver) {
      booking.Driver.status = 'available';
      await booking.Driver.save();

      await DriverAvailability.destroy({
        where: {
          driver_id: booking.driver_id,
          blocked_reason: 'booking',
          start_time: booking.pickup_time
        }
      });
    }

    // Log Status Event
    await StatusEventLog.create({
      event_type: booking.Vehicle ? 'Vehicle Returned' : 'Driver Returned',
      entity_type: 'RENTAL_BOOKING',
      entity_id: booking.rental_id,
      new_status: 'returned',
      triggered_by: `admin:${adminId}`,
      payload: {
        customer: booking.Customer ? booking.Customer.name : 'Unknown',
        vehicle: booking.Vehicle ? `${booking.Vehicle.year} ${booking.Vehicle.make} ${booking.Vehicle.model}` : null,
        driver: booking.Driver ? booking.Driver.name : null,
      },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'return_rental_booking',
      entity_type: 'RENTAL_BOOKING',
      entity_id: id,
      new_data: { return_time: booking.actual_return_time },
    });

    return res.status(200).json({ message: 'Rental returned and logged successfully.', booking });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/payment - Record payment
export const recordPayment = async (req, res, next) => {
  try {
    const { sale_order_id, rental_id, amount, payment_method } = req.body;
    const adminId = req.admin.admin_id;

    if (!sale_order_id && !rental_id) {
      return res.status(400).json({ message: 'Either sale_order_id or rental_id must be provided.' });
    }

    const payment = await Payment.create({
      sale_order_id: sale_order_id || null,
      rental_id: rental_id || null,
      amount,
      payment_method: payment_method || 'UPI',
      payment_status: 'completed',
      paid_at: new Date(),
    });

    // Calculate total payments and check if balance is cleared
    if (sale_order_id) {
      const order = await SaleOrder.findByPk(sale_order_id);
      if (order) {
        const totalPaid = await Payment.sum('amount', { where: { sale_order_id } }) || 0.0;
        const previousStatus = order.payment_status;

        if (parseFloat(totalPaid) >= parseFloat(order.price)) {
          order.payment_status = 'paid';
        } else {
          order.payment_status = 'partial';
        }
        await order.save();

        // Log status event
        await StatusEventLog.create({
          event_type: order.payment_status === 'paid' ? 'Payment Received (Full)' : 'Payment Received (Partial)',
          entity_type: 'SALE_ORDER',
          entity_id: sale_order_id,
          previous_status: previousStatus,
          new_status: order.payment_status,
          triggered_by: `admin:${adminId}`,
          payload: { amount, totalPaid, price: order.price },
        });
      }
    } else if (rental_id) {
      const booking = await RentalBooking.findByPk(rental_id);
      if (booking) {
        const totalPaid = await Payment.sum('amount', { where: { rental_id } }) || 0.0;
        const previousStatus = booking.payment_status;

        if (parseFloat(totalPaid) >= parseFloat(booking.price)) {
          booking.payment_status = 'paid';
        } else {
          booking.payment_status = 'partial';
        }
        await booking.save();

        // Log status event
        await StatusEventLog.create({
          event_type: booking.payment_status === 'paid' ? 'Payment Received (Full)' : 'Payment Received (Partial)',
          entity_type: 'RENTAL_BOOKING',
          entity_id: rental_id,
          previous_status: previousStatus,
          new_status: booking.payment_status,
          triggered_by: `admin:${adminId}`,
          payload: { amount, totalPaid, price: booking.price },
        });
      }
    }

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'record_payment',
      entity_type: 'PAYMENT',
      entity_id: payment.payment_id,
      new_data: payment,
    });

    return res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/exchange - Exchange transaction
export const createExchangeOrder = async (req, res, next) => {
  try {
    const { customer_id, offered_vehicle_id, taken_vehicle_id, offered_price, taken_price, payment_status } = req.body;
    const adminId = req.admin.admin_id;

    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // Check both vehicles
    const offeredVehicle = await Vehicle.findByPk(offered_vehicle_id);
    const takenVehicle = await Vehicle.findByPk(taken_vehicle_id);

    if (!offeredVehicle || !takenVehicle) {
      return res.status(404).json({ message: 'One of the vehicles in the exchange was not found.' });
    }

    if (takenVehicle.status !== 'available') {
      return res.status(400).json({ message: 'The vehicle being taken is not available.' });
    }

    // 1. Create Order 1 (Vehicle Taken by customer)
    const order1 = await SaleOrder.create({
      vehicle_id: taken_vehicle_id,
      customer_id,
      price: taken_price,
      payment_status: payment_status || 'unpaid',
      sale_date: new Date(),
    });

    // 2. Create Order 2 (Vehicle Given by customer to company)
    const order2 = await SaleOrder.create({
      vehicle_id: offered_vehicle_id,
      customer_id,
      price: offered_price, // positive amount or negative as accounting standard
      payment_status: 'paid', // Mark paid as we received their vehicle
      sale_date: new Date(),
    });

    // Link exchange IDs
    order1.exchange_ref_id = order2.sale_order_id;
    await order1.save();

    order2.exchange_ref_id = order1.sale_order_id;
    await order2.save();

    if (payment_status === 'paid') {
      await syncPaymentRecord({
        sale_order_id: order1.sale_order_id,
        amount: order1.price,
        payment_method: 'UPI', // Default for exchange
        adminId
      });
    }

    await syncPaymentRecord({
      sale_order_id: order2.sale_order_id,
      amount: order2.price,
      payment_method: 'Cash', // Default for received vehicle exchange value
      adminId
    });

    // 3. Mark taken vehicle as sold and offered vehicle as available
    takenVehicle.status = 'sold';
    await takenVehicle.save();

    await VehicleRemovalLog.create({
      vehicle_id: taken_vehicle_id,
      reason: 'sold',
      removed_at: new Date(),
      removed_by_admin_id: adminId,
    });

    offeredVehicle.status = 'available';
    await offeredVehicle.save();

    // Log Status Event
    await StatusEventLog.create({
      event_type: 'Vehicle Added',
      entity_type: 'VEHICLE',
      entity_id: offered_vehicle_id,
      new_status: 'available',
      triggered_by: `admin:${adminId}`,
      payload: { exchange: true, customer: customer.name },
    });

    await StatusEventLog.create({
      event_type: 'Exchange Completed',
      entity_type: 'SALE_ORDER',
      entity_id: order1.sale_order_id,
      new_status: 'completed',
      triggered_by: `admin:${adminId}`,
      payload: {
        customer: customer.name,
        offered_vehicle: `${offeredVehicle.year} ${offeredVehicle.make} ${offeredVehicle.model}`,
        taken_vehicle: `${takenVehicle.year} ${takenVehicle.make} ${takenVehicle.model}`,
      },
    });

    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_exchange_order',
      entity_type: 'SALE_ORDER',
      entity_id: order1.sale_order_id,
      new_data: { order1, order2 },
    });

    return res.status(201).json({
      message: 'Exchange order recorded successfully',
      taken_order: order1,
      offered_order: order2,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/rental/:id - Admin: Update rental booking
export const updateRentalBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vehicle_id, customer_id, driver_id, pickup_time, return_time, price, payment_status, status, payment_method } = req.body;
    const adminId = req.admin.admin_id;

    const booking = await RentalBooking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Rental Booking not found' });
    }

    const oldData = booking.toJSON();

    if (pickup_time !== undefined) booking.pickup_time = new Date(pickup_time);
    if (return_time !== undefined) booking.expected_return_time = new Date(return_time);
    if (price !== undefined) booking.price = parseFloat(price);
    if (payment_status !== undefined) booking.payment_status = payment_status;
    if (status !== undefined) booking.status = status; // e.g. ongoing, completed, cancelled

    booking.customer_id = customer_id !== undefined ? parseInt(customer_id, 10) : booking.customer_id;
    booking.vehicle_id = vehicle_id !== undefined ? (vehicle_id ? parseInt(vehicle_id, 10) : null) : booking.vehicle_id;
    booking.driver_id = driver_id !== undefined ? (driver_id ? parseInt(driver_id, 10) : null) : booking.driver_id;

    await booking.save();

    await StatusEventLog.create({
      event_type: 'Rental Booking Updated',
      entity_type: 'RENTAL_BOOKING',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: booking.payment_status,
      triggered_by: `admin:${adminId}`,
      payload: { price: booking.price, booking_status: booking.status },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_rental_booking_manual',
      entity_type: 'RENTAL_BOOKING',
      entity_id: id,
      old_data: oldData,
      new_data: booking.toJSON(),
    });

    await syncPaymentRecord({
      rental_id: booking.rental_id,
      amount: booking.price,
      payment_method: payment_method || 'UPI',
      payment_status: booking.payment_status,
      adminId
    });

    return res.status(200).json({ message: 'Rental Booking updated successfully', booking });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/orders/rental/:id - Admin: Delete rental booking
export const deleteRentalBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const booking = await RentalBooking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Rental Booking not found' });
    }

    const oldData = booking.toJSON();

    // Delete payments linked to this rental
    await Payment.destroy({ where: { rental_id: id } });
    await booking.destroy();

    await StatusEventLog.create({
      event_type: 'Rental Booking Deleted',
      entity_type: 'RENTAL_BOOKING',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { price: oldData.price },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_rental_booking_manual',
      entity_type: 'RENTAL_BOOKING',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Rental Booking deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/orders/sale/:id - Admin: Delete sale order
export const deleteSaleOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const order = await SaleOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Sale Order not found' });
    }

    const oldData = order.toJSON();

    // Delete payments linked to this sale
    await Payment.destroy({ where: { sale_order_id: id } });
    await order.destroy();

    await StatusEventLog.create({
      event_type: 'Sale Order Deleted',
      entity_type: 'SALE_ORDER',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { price: oldData.price },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_sale_order_manual',
      entity_type: 'SALE_ORDER',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Sale Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};
