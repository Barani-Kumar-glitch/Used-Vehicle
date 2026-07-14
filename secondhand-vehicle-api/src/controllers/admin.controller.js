import {
  StatusEventLog,
  ActivityLog,
  AdminUser,
  SaleOrder,
  RentalBooking,
  Vehicle,
  Referral,
  RequestLog,
  Customer,
  CustomerDocument,
  Payment
} from '../models/index.js';
import { sequelize } from '../config/db.js';

// GET /api/status-events - Paginated list of Status Event Logs
export const getStatusEvents = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, event_type } = req.query;
    
    const whereClause = {};
    if (event_type) {
      whereClause.event_type = event_type;
    }
    
    const events = await StatusEventLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({
      events: events.rows,
      totalCount: events.count,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/activity-log - List administrative Activity Logs
export const getActivityLogs = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await ActivityLog.findAndCountAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      include: [
        { model: AdminUser, attributes: ['username', 'role'] }
      ],
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({
      logs: logs.rows,
      totalCount: logs.count,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/summary - Live Dashboard KPI stats
export const getAdminSummary = async (req, res, next) => {
  try {
    // 1. Calculate Revenue (Sales + Rentals)
    const salesTotal = await SaleOrder.sum('price', { where: { payment_status: 'paid' } }) || 0.0;
    const rentalsTotal = await RentalBooking.sum('price', { where: { payment_status: 'paid' } }) || 0.0;
    const totalRevenue = parseFloat(salesTotal) + parseFloat(rentalsTotal);
    
    // 2. Counts
    const activeVehicles = await Vehicle.count({ where: { status: 'available' } });
    const pendingRequests = await RequestLog.count({ where: { status: 'pending' } });
    
    // 3. Referral KPIs
    const totalReferrals = await Referral.count();
    const totalConversions = await Referral.count({ where: { status: 'converted' } });
    const pendingCommission = await Referral.sum('commission_amount', {
      where: { commission_status: 'approved' }
    }) || 0.0;
    const paidCommission = await Referral.sum('commission_amount', {
      where: { commission_status: 'paid' }
    }) || 0.0;
    
    // Monthly stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const conversionsThisMonth = await Referral.count({
      where: {
        status: 'converted',
        converted_at: {
          [sequelize.Sequelize.Op.gte]: thirtyDaysAgo
        }
      }
    });

    return res.status(200).json({
      revenue: {
        total: totalRevenue,
        sales: parseFloat(salesTotal),
        rentals: parseFloat(rentalsTotal),
      },
      listings: {
        active: activeVehicles,
      },
      requests: {
        pending: pendingRequests,
      },
      referrals: {
        total: totalReferrals,
        conversions: totalConversions,
        conversionsThisMonth,
        pendingCommission: parseFloat(pendingCommission),
        paidCommission: parseFloat(paidCommission),
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/customers - List all customers with their documents
export const listCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.findAll({
      include: [
        { model: CustomerDocument, as: 'documents' }
      ],
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/customers/verify-document/:id - Verify document
export const verifyCustomerDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected
    const adminId = req.admin.admin_id;
    
    const doc = await CustomerDocument.findByPk(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const oldStatus = doc.status;
    doc.status = status || 'approved';
    doc.verified_by_admin_id = adminId;
    await doc.save();
    
    // Check if all documents are approved, if so mark customer verified
    if (status === 'approved') {
      const customer = await Customer.findByPk(doc.customer_id);
      if (customer) {
        customer.verified = true;
        await customer.save();
      }
    }
    
    // Log Activity
    await ActivityLog.create({
      admin_id: adminId,
      action: 'verify_document',
      entity_type: 'CUSTOMER_DOCUMENT',
      entity_id: id,
      old_data: { status: oldStatus },
      new_data: { status: doc.status },
    });
    
    return res.status(200).json({ message: 'Document verification updated', document: doc });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payments - List all payments
export const listPayments = async (req, res, next) => {
  try {
    const payments = await Payment.findAll({
      include: [
        { model: SaleOrder, required: false, include: [Customer, Vehicle] },
        { model: RentalBooking, required: false, include: [Customer, Vehicle] },
      ],
      order: [['paid_at', 'DESC']],
    });
    
    return res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payments - Admin manually record a payment
export const createPayment = async (req, res, next) => {
  try {
    const { sale_order_id, rental_id, amount, payment_method, payment_status, paid_at } = req.body;
    const adminId = req.admin.admin_id;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }
    if (!payment_method) {
      return res.status(400).json({ message: 'Payment method is required.' });
    }
    if (!payment_status) {
      return res.status(400).json({ message: 'Payment status is required.' });
    }

    // Validate relationships if provided
    if (sale_order_id) {
      const order = await SaleOrder.findByPk(sale_order_id);
      if (!order) {
        return res.status(404).json({ message: `Sale Order #${sale_order_id} not found.` });
      }
    }
    if (rental_id) {
      const booking = await RentalBooking.findByPk(rental_id);
      if (!booking) {
        return res.status(404).json({ message: `Rental Booking #${rental_id} not found.` });
      }
    }

    const payment = await Payment.create({
      sale_order_id: sale_order_id ? parseInt(sale_order_id, 10) : null,
      rental_id: rental_id ? parseInt(rental_id, 10) : null,
      amount: parseFloat(amount),
      payment_method,
      payment_status,
      paid_at: paid_at ? new Date(paid_at) : new Date(),
    });

    // If payment is completed, update sale order / rental booking status
    if (payment_status === 'completed') {
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
    }

    // Write ActivityLog
    await ActivityLog.create({
      admin_id: adminId,
      action: 'record_payment_manual',
      entity_type: 'PAYMENT',
      entity_id: payment.payment_id,
      new_data: payment.toJSON(),
    });

    return res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/customers - Admin: Register a new customer
export const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, customer_type } = req.body;
    const adminId = req.admin.admin_id;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    // Check duplicate email
    const existingEmail = await Customer.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Customer with this email is already registered.' });
    }

    // Check duplicate phone
    const existingPhone = await Customer.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ message: 'Customer with this phone number is already registered.' });
    }

    const newCustomer = await Customer.create({
      name,
      email,
      phone,
      customer_type: customer_type || 'Individual',
      verified: true, // Mark verified directly when added by admin
    });

    // Write ActivityLog
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_customer',
      entity_type: 'CUSTOMER',
      entity_id: newCustomer.customer_id,
      new_data: newCustomer.toJSON(),
    });

    return res.status(201).json({
      message: 'Customer registered successfully',
      customer: newCustomer
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/customers/:id - Admin update customer
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, customer_type, verified } = req.body;
    const adminId = req.admin.admin_id;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const oldData = customer.toJSON();

    if (name !== undefined) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (phone !== undefined) customer.phone = phone;
    if (customer_type !== undefined) customer.customer_type = customer_type;
    if (verified !== undefined) customer.verified = verified;

    await customer.save();

    await StatusEventLog.create({
      event_type: 'Customer Updated',
      entity_type: 'CUSTOMER',
      entity_id: id,
      previous_status: oldData.verified ? 'verified' : 'unverified',
      new_status: customer.verified ? 'verified' : 'unverified',
      triggered_by: `admin:${adminId}`,
      payload: { name: customer.name, email: customer.email },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_customer_manual',
      entity_type: 'CUSTOMER',
      entity_id: id,
      old_data: oldData,
      new_data: customer.toJSON(),
    });

    return res.status(200).json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/customers/:id - Admin delete customer
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const oldData = customer.toJSON();
    await customer.destroy();

    await StatusEventLog.create({
      event_type: 'Customer Deleted',
      entity_type: 'CUSTOMER',
      entity_id: id,
      previous_status: oldData.verified ? 'verified' : 'unverified',
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { name: oldData.name, email: oldData.email },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_customer_manual',
      entity_type: 'CUSTOMER',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/payments/:id - Admin update payment
export const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sale_order_id, rental_id, amount, payment_method, payment_status, paid_at } = req.body;
    const adminId = req.admin.admin_id;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldData = payment.toJSON();

    if (amount !== undefined) payment.amount = parseFloat(amount);
    if (payment_method !== undefined) payment.payment_method = payment_method;
    if (payment_status !== undefined) payment.payment_status = payment_status;
    if (paid_at !== undefined) payment.paid_at = new Date(paid_at);
    payment.sale_order_id = sale_order_id !== undefined ? (sale_order_id ? parseInt(sale_order_id, 10) : null) : payment.sale_order_id;
    payment.rental_id = rental_id !== undefined ? (rental_id ? parseInt(rental_id, 10) : null) : payment.rental_id;

    await payment.save();

    await StatusEventLog.create({
      event_type: 'Payment Updated',
      entity_type: 'PAYMENT',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: payment.payment_status,
      triggered_by: `admin:${adminId}`,
      payload: { amount: payment.amount, payment_method: payment.payment_method },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_payment_manual',
      entity_type: 'PAYMENT',
      entity_id: id,
      old_data: oldData,
      new_data: payment.toJSON(),
    });

    return res.status(200).json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/payments/:id - Admin delete payment
export const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldData = payment.toJSON();
    await payment.destroy();

    // Revert associated records to unpaid / pending
    if (oldData.sale_order_id) {
      const saleOrder = await SaleOrder.findByPk(oldData.sale_order_id);
      if (saleOrder) {
        const oldPaymentStatus = saleOrder.payment_status;
        saleOrder.payment_status = 'unpaid';
        await saleOrder.save();

        await StatusEventLog.create({
          event_type: 'Sale Order Updated',
          entity_type: 'SALE_ORDER',
          entity_id: oldData.sale_order_id,
          previous_status: oldPaymentStatus,
          new_status: 'unpaid',
          triggered_by: `admin:${adminId}`,
          payload: { note: `Payment ${id} was deleted by admin` },
        });

        // Revert referral commission status if exists
        const referral = await Referral.findOne({
          where: { sale_order_id: oldData.sale_order_id }
        });
        if (referral) {
          const oldCommStatus = referral.commission_status;
          const oldRefStatus = referral.status;
          referral.commission_status = 'pending';
          referral.status = 'converted';
          await referral.save();

          await StatusEventLog.create({
            event_type: 'Referral Commission Updated',
            entity_type: 'REFERRAL',
            entity_id: referral.referral_id,
            previous_status: oldCommStatus,
            new_status: 'pending',
            triggered_by: `admin:${adminId}`,
            payload: { note: `Payment ${id} deleted, commission reverted to pending` },
          });

          await ActivityLog.create({
            admin_id: adminId,
            action: 'revert_referral_commission',
            entity_type: 'REFERRAL',
            entity_id: referral.referral_id,
            old_data: { commission_status: oldCommStatus, status: oldRefStatus },
            new_data: { commission_status: referral.commission_status, status: referral.status },
          });
        }
      }
    } else if (oldData.rental_id) {
      const rentalBooking = await RentalBooking.findByPk(oldData.rental_id);
      if (rentalBooking) {
        const oldPaymentStatus = rentalBooking.payment_status;
        rentalBooking.payment_status = 'unpaid';
        await rentalBooking.save();

        await StatusEventLog.create({
          event_type: 'Rental Booking Updated',
          entity_type: 'RENTAL_BOOKING',
          entity_id: oldData.rental_id,
          previous_status: oldPaymentStatus,
          new_status: 'unpaid',
          triggered_by: `admin:${adminId}`,
          payload: { note: `Payment ${id} was deleted by admin` },
        });
      }
    }

    await StatusEventLog.create({
      event_type: 'Payment Deleted',
      entity_type: 'PAYMENT',
      entity_id: id,
      previous_status: oldData.payment_status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { amount: oldData.amount, payment_method: oldData.payment_method },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_payment_manual',
      entity_type: 'PAYMENT',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
