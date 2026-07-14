import { nanoid } from 'nanoid';
import { Referral, Vehicle, Customer, SaleOrder, StatusEventLog } from '../models/index.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

// Step 1: Generate unique referral link code
export const generateReferralLink = async (customerId, vehicleId) => {
  // Prevent customer from referring their own vehicle listing if it was theirs (out of scope for now since listings are admin-managed, but good practice)
  
  // Expiry date (default 90 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFERRAL_LINK_EXPIRY_DAYS);
  
  // Rule: One vehicle can have only one active (non-expired, non-converted) referral link per referrer
  const existingReferral = await Referral.findOne({
    where: {
      referrer_customer_id: customerId,
      vehicle_id: vehicleId,
      status: ['generated', 'visited']
    }
  });
  
  if (existingReferral) {
    // Return existing code
    return {
      referral_code: existingReferral.referral_code,
      expires_at: existingReferral.expires_at,
      status: existingReferral.status,
      share_url: `/buy/vehicle/${vehicleId}?ref=${existingReferral.referral_code}&vehicle_id=${vehicleId}&referrer_id=${customerId}`
    };
  }
  
  // Generate code via nanoid (12 chars)
  const referralCode = nanoid(12);
  
  const newReferral = await Referral.create({
    referral_code: referralCode,
    referrer_customer_id: customerId,
    vehicle_id: vehicleId,
    status: 'generated',
    commission_status: 'not_applicable',
    expires_at: expiresAt,
  });
  
  return {
    referral_code: referralCode,
    expires_at: newReferral.expires_at,
    status: 'generated',
    share_url: `/buy/vehicle/${vehicleId}?ref=${referralCode}&vehicle_id=${vehicleId}&referrer_id=${customerId}`
  };
};

// Step 3: Resolve referral link details (Record visit)
export const resolveReferralLink = async (code) => {
  const referral = await Referral.findOne({
    where: { referral_code: code },
    include: [
      { model: Vehicle },
      { model: Customer, as: 'Referrer', attributes: ['name', 'phone'] }
    ]
  });
  
  if (!referral) {
    throw new Error('Referral code not found or invalid');
  }
  
  // Check if expired
  if (new Date() > new Date(referral.expires_at)) {
    if (referral.status === 'generated' || referral.status === 'visited') {
      referral.status = 'expired';
      await referral.save();
    }
    throw new Error('Referral code has expired');
  }
  
  // Set status = visited and visited_at on first visit only
  if (referral.status === 'generated') {
    referral.status = 'visited';
    referral.visited_at = new Date();
    await referral.save();
  }
  
  return {
    referral_code: referral.referral_code,
    vehicle: referral.Vehicle,
    referrer: referral.Referrer,
    status: referral.status,
  };
};

// Step 5: Check and trigger Referral Conversion
export const checkAndTriggerConversion = async (saleOrderId, customerId, vehicleId, referralCode = null) => {
  let referral = null;
  
  // 1. Try to find by explicit referral code
  if (referralCode) {
    referral = await Referral.findOne({
      where: {
        referral_code: referralCode,
        status: ['generated', 'visited']
      }
    });
  }
  
  // 2. If not found, try to look up based on referred_customer_id fallback (for any vehicle)
  if (!referral) {
    referral = await Referral.findOne({
      where: {
        referred_customer_id: customerId,
        status: ['generated', 'visited']
      },
      order: [['created_at', 'DESC']]
    });
  }
  
  if (!referral) {
    return null; // No referral conversion found for this sale
  }
  
  // Ensure referrer is not the buyer (self-referral prevention)
  if (referral.referrer_customer_id.toString() === customerId.toString()) {
    logger.warn(`[Referral Engine] Self-referral detected. Refusing conversion for Referrer: ${referral.referrer_customer_id} and Buyer: ${customerId}`);
    return null;
  }
  
  // Retrieve sale details and buyer/referrer details
  const saleOrder = await SaleOrder.findByPk(saleOrderId);
  const referrer = await Customer.findByPk(referral.referrer_customer_id);
  const buyer = await Customer.findByPk(customerId);
  const vehicle = await Vehicle.findByPk(vehicleId);
  
  if (!saleOrder || !referrer || !buyer || !vehicle) {
    logger.error('[Referral Engine] Conversion check missing crucial models — saleOrder/referrer/buyer/vehicle not found.');
    return null;
  }
  
  // Calculate commission
  const commissionPercent = env.REFERRAL_COMMISSION_PERCENT;
  const salePrice = parseFloat(saleOrder.price);
  const calculatedCommission = (salePrice * commissionPercent) / 100.0;
  
  // Update Referral row
  referral.status = 'converted';
  referral.converted_at = new Date();
  referral.sale_order_id = saleOrderId;
  referral.commission_amount = calculatedCommission;
  referral.commission_status = 'approved'; // Set directly to 'approved'
  referral.admin_notified_at = new Date();
  referral.referred_customer_id = customerId; // Ensure it is linked
  referral.vehicle_id = vehicleId; // Ensure the database stores the actual vehicle sold
  await referral.save();
  
  // Write STATUS_EVENT_LOG
  await StatusEventLog.create({
    event_type: 'Referral Converted',
    entity_type: 'REFERRAL',
    entity_id: referral.referral_id,
    previous_status: 'visited',
    new_status: 'converted',
    triggered_by: `system`,
    payload: {
      referrer_name: referrer.name,
      referrer_phone: referrer.phone,
      referrer_email: referrer.email,
      referred_customer_name: buyer.name,
      vehicle_name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      sale_price: salePrice,
      commission_amount: calculatedCommission,
    },
  });
  
  logger.info(`[Referral Engine] Code ${referral.referral_code} converted! Commission ₹${calculatedCommission} → ${referrer.name} (Customer #${referral.referrer_customer_id})`);
  
  return referral;
};
