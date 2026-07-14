import { Referral, Vehicle, Customer, SaleOrder, StatusEventLog, ActivityLog } from '../models/index.js';
import { generateReferralLink, resolveReferralLink } from '../services/referralService.js';
import { nanoid } from 'nanoid';

// POST /api/referrals/generate - Customer generates referral link
export const generateLink = async (req, res, next) => {
  try {
    const { vehicle_id } = req.body;
    const customerId = req.customer.customer_id;
    
    if (!vehicle_id) {
      return res.status(400).json({ message: 'vehicle_id is required' });
    }
    
    const vehicle = await Vehicle.findByPk(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const result = await generateReferralLink(customerId, vehicle_id);
    
    return res.status(201).json({
      message: 'Referral link generated successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/referrals/resolve/:code - Public resolves code details and tracks visit
export const resolveLink = async (req, res, next) => {
  try {
    const { code } = req.params;
    const result = await resolveReferralLink(code);
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// GET /api/referrals/my - Customer views their own generated referrals
export const getMyReferrals = async (req, res, next) => {
  try {
    const customerId = req.customer.customer_id;
    
    const referrals = await Referral.findAll({
      where: { referrer_customer_id: customerId },
      include: [
        { model: Vehicle },
        { model: Customer, as: 'ReferredCustomer', attributes: ['name', 'phone'] },
        { model: SaleOrder }
      ],
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({ referrals });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/referrals - Admin only: List all referrals
export const listAdminReferrals = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status, commission_status } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (commission_status) whereClause.commission_status = commission_status;
    
    const referrals = await Referral.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      include: [
        { model: Customer, as: 'Referrer', attributes: ['name', 'phone', 'email'] },
        { model: Customer, as: 'ReferredCustomer', attributes: ['name', 'phone', 'email'] },
        { model: Vehicle },
        { model: SaleOrder }
      ],
      order: [['created_at', 'DESC']],
    });
    
    return res.status(200).json({
      referrals: referrals.rows,
      totalCount: referrals.count,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/referrals/:id - Admin only: Get detail
export const getAdminReferralDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const referral = await Referral.findByPk(id, {
      include: [
        { model: Customer, as: 'Referrer' },
        { model: Customer, as: 'ReferredCustomer' },
        { model: Vehicle },
        { model: SaleOrder }
      ]
    });
    
    if (!referral) {
      return res.status(404).json({ message: 'Referral record not found' });
    }
    
    return res.status(200).json({ referral });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/referrals/:id/commission - Admin only: Approve/pay commission
export const updateCommissionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_status, commission_amount } = req.body;
    const adminId = req.admin.admin_id;
    
    const referral = await Referral.findByPk(id);
    if (!referral) {
      return res.status(404).json({ message: 'Referral record not found' });
    }
    
    const oldStatus = referral.commission_status;
    const oldRefStatus = referral.status;
    
    if (commission_status) referral.commission_status = commission_status;
    if (commission_amount !== undefined) referral.commission_amount = commission_amount;
    
    // Automatically transition overall referral status based on commission status
    if (commission_status === 'paid') {
      referral.status = 'commission_paid';
    }
    
    referral.processed_by_admin_id = adminId;
    await referral.save();
    
    // Write STATUS_EVENT_LOG
    await StatusEventLog.create({
      event_type: 'Referral Commission Updated',
      entity_type: 'REFERRAL',
      entity_id: referral.referral_id,
      previous_status: oldStatus,
      new_status: commission_status,
      triggered_by: `admin:${adminId}`,
      payload: { commission_status, commission_amount: referral.commission_amount },
    });
    
    // Write ActivityLog
    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_commission',
      entity_type: 'REFERRAL',
      entity_id: referral.referral_id,
      old_data: { commission_status: oldStatus, status: oldRefStatus },
      new_data: { commission_status: referral.commission_status, status: referral.status },
    });
    
    return res.status(200).json({ message: 'Commission status updated successfully', referral });
  } catch (error) {
    next(error);
  }
};

// POST /api/referrals/admin - Admin manually create a referral
export const createAdminReferral = async (req, res, next) => {
  try {
    const {
      referrer_customer_id,
      vehicle_id,
      referred_customer_id,
      status,
      commission_amount,
      commission_status,
      referral_code,
      expires_at,
    } = req.body;
    const adminId = req.admin.admin_id;

    if (!referrer_customer_id) {
      return res.status(400).json({ message: 'Referrer Customer is required.' });
    }
    if (!vehicle_id) {
      return res.status(400).json({ message: 'Vehicle is required.' });
    }

    // Verify referrer exists
    const referrer = await Customer.findByPk(referrer_customer_id);
    if (!referrer) {
      return res.status(404).json({ message: 'Referrer Customer not found.' });
    }

    // Verify vehicle exists
    const vehicle = await Vehicle.findByPk(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Verify referred customer if provided
    if (referred_customer_id) {
      const referred = await Customer.findByPk(referred_customer_id);
      if (!referred) {
        return res.status(404).json({ message: 'Referred Customer not found.' });
      }
      if (referrer_customer_id.toString() === referred_customer_id.toString()) {
        return res.status(400).json({ message: 'Self-referral is not allowed.' });
      }
    }

    // Generate code if not provided
    const code = referral_code || nanoid(12);

    // Check uniqueness if custom code provided
    if (referral_code) {
      const existingCode = await Referral.findOne({ where: { referral_code: code } });
      if (existingCode) {
        return res.status(400).json({ message: 'Referral code already exists.' });
      }
    }

    const defaultExpiresAt = new Date();
    defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 90);

    const referral = await Referral.create({
      referral_code: code,
      referrer_customer_id,
      vehicle_id,
      referred_customer_id: referred_customer_id || null,
      status: status || 'generated',
      commission_amount: commission_amount ? parseFloat(commission_amount) : null,
      commission_status: commission_status || 'not_applicable',
      expires_at: expires_at ? new Date(expires_at) : defaultExpiresAt,
    });

    // Write ActivityLog
    await ActivityLog.create({
      admin_id: adminId,
      action: 'create_referral_manual',
      entity_type: 'REFERRAL',
      entity_id: referral.referral_id,
      new_data: referral.toJSON(),
    });

    return res.status(201).json({
      message: 'Referral created successfully',
      referral,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/referrals/admin/:id - Admin update referral
export const updateReferral = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { referrer_customer_id, vehicle_id, referred_customer_id, status, commission_amount, commission_status, referral_code, expires_at } = req.body;
    const adminId = req.admin.admin_id;

    const referral = await Referral.findByPk(id);
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }

    const oldData = referral.toJSON();

    if (referrer_customer_id !== undefined) referral.referrer_customer_id = parseInt(referrer_customer_id, 10);
    if (vehicle_id !== undefined) referral.vehicle_id = parseInt(vehicle_id, 10);
    if (status !== undefined) referral.status = status;
    if (commission_status !== undefined) referral.commission_status = commission_status;
    if (expires_at !== undefined) referral.expires_at = new Date(expires_at);
    
    referral.referred_customer_id = referred_customer_id !== undefined ? (referred_customer_id ? parseInt(referred_customer_id, 10) : null) : referral.referred_customer_id;
    referral.commission_amount = commission_amount !== undefined ? (commission_amount ? parseFloat(commission_amount) : null) : referral.commission_amount;
    referral.referral_code = referral_code !== undefined ? referral_code : referral.referral_code;

    await referral.save();

    await StatusEventLog.create({
      event_type: 'Referral Updated',
      entity_type: 'REFERRAL',
      entity_id: id,
      previous_status: oldData.status,
      new_status: referral.status,
      triggered_by: `admin:${adminId}`,
      payload: { referral_code: referral.referral_code },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'update_referral_manual',
      entity_type: 'REFERRAL',
      entity_id: id,
      old_data: oldData,
      new_data: referral.toJSON(),
    });

    return res.status(200).json({ message: 'Referral updated successfully', referral });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/referrals/admin/:id - Admin delete referral
export const deleteReferral = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.admin_id;

    const referral = await Referral.findByPk(id);
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }

    const oldData = referral.toJSON();
    await referral.destroy();

    await StatusEventLog.create({
      event_type: 'Referral Deleted',
      entity_type: 'REFERRAL',
      entity_id: id,
      previous_status: oldData.status,
      new_status: null,
      triggered_by: `admin:${adminId}`,
      payload: { referral_code: oldData.referral_code },
    });

    await ActivityLog.create({
      admin_id: adminId,
      action: 'delete_referral_manual',
      entity_type: 'REFERRAL',
      entity_id: id,
      old_data: oldData,
    });

    return res.status(200).json({ message: 'Referral deleted successfully' });
  } catch (error) {
    next(error);
  }
};
