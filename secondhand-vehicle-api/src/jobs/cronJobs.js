import cron from 'node-cron';
import { Op } from 'sequelize';
import {
  CustomerOTPVerification,
  RentalBooking,
  Referral,
  SaleOrder,
  Payment,
  DailyAdminSummary,
  StatusEventLog,
  Vehicle
} from '../models/index.js';
import logger from '../config/logger.js';

export const initCronJobs = () => {
  logger.info('Initializing scheduled background cron jobs...');

  // ─── 1. OTP Expiry Sweep ─── Every hour ─────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      logger.debug('[Cron] Running OTP Expiry Sweep...');
      const deletedCount = await CustomerOTPVerification.destroy({
        where: {
          expires_at: { [Op.lt]: new Date() }
        }
      });
      logger.info(`[Cron] OTP Expiry Sweep complete. Cleaned ${deletedCount} expired records.`);
    } catch (error) {
      logger.error(`[Cron] OTP Expiry Sweep failed: ${error.message}`);
    }
  });

  // ─── 2. Overdue Rental Check ─── Every 15 minutes ────────────────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      logger.debug('[Cron] Running Overdue Rental Check...');
      const now = new Date();

      const overdueRentals = await RentalBooking.findAll({
        where: {
          expected_return_time: { [Op.lt]: now },
          actual_return_time: null
        },
        include: [Vehicle]
      });

      let alertsLogged = 0;
      for (const rental of overdueRentals) {
        // Avoid spam: only log once per 4 hours per rental
        const existingAlert = await StatusEventLog.findOne({
          where: {
            event_type: 'Overdue Rental Alert',
            entity_id: rental.rental_id,
            created_at: {
              [Op.gt]: new Date(Date.now() - 4 * 60 * 60 * 1000)
            }
          }
        });

        if (!existingAlert) {
          const vehicleName = rental.Vehicle
            ? `${rental.Vehicle.year} ${rental.Vehicle.make} ${rental.Vehicle.model}`
            : 'Driver-Only Rental';

          await StatusEventLog.create({
            event_type: 'Overdue Rental Alert',
            entity_type: 'RENTAL_BOOKING',
            entity_id: rental.rental_id,
            new_status: 'overdue',
            triggered_by: 'system',
            payload: {
              rental_id: rental.rental_id,
              vehicle_name: vehicleName,
              expected_return: rental.expected_return_time,
            }
          });
          alertsLogged++;
          logger.warn(`[Cron] Overdue Rental Alert logged — Rental #${rental.rental_id} (${vehicleName})`);
        }
      }

      logger.info(`[Cron] Overdue Rental Check complete. ${overdueRentals.length} overdue found, ${alertsLogged} new alerts logged.`);
    } catch (error) {
      logger.error(`[Cron] Overdue Rental Check failed: ${error.message}`);
    }
  });

  // ─── 3. Referral Link Expiry ─── Daily at 1 AM ───────────────────────
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.debug('[Cron] Running Referral Link Expiry job...');
      const now = new Date();

      const [updatedCount] = await Referral.update(
        { status: 'expired' },
        {
          where: {
            status: { [Op.in]: ['generated', 'visited'] },
            expires_at: { [Op.lt]: now }
          }
        }
      );

      logger.info(`[Cron] Referral Link Expiry complete. Expired ${updatedCount} referral links.`);
    } catch (error) {
      logger.error(`[Cron] Referral Link Expiry failed: ${error.message}`);
    }
  });

  // ─── 4. Daily Admin Summary ─── Daily at midnight ────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.debug('[Cron] Generating Daily Admin Summary...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Revenue from yesterday
      const salesTotal = await SaleOrder.sum('price', {
        where: {
          payment_status: 'paid',
          sale_date: { [Op.between]: [yesterday, today] }
        }
      }) || 0.0;

      const rentalsTotal = await RentalBooking.sum('price', {
        where: {
          payment_status: 'paid',
          created_at: { [Op.between]: [yesterday, today] }
        }
      }) || 0.0;

      const totalRevenue = parseFloat(salesTotal) + parseFloat(rentalsTotal);

      // Counts
      const salesCount = await SaleOrder.count({
        where: { sale_date: { [Op.between]: [yesterday, today] } }
      });

      const rentalsCount = await RentalBooking.count({
        where: { created_at: { [Op.between]: [yesterday, today] } }
      });

      const referralsCount = await Referral.count({
        where: { created_at: { [Op.between]: [yesterday, today] } }
      });

      const conversionsCount = await Referral.count({
        where: {
          status: 'converted',
          converted_at: { [Op.between]: [yesterday, today] }
        }
      });

      const commissionPaid = await Referral.sum('commission_amount', {
        where: {
          commission_status: 'paid',
          updated_at: { [Op.between]: [yesterday, today] }
        }
      }) || 0.0;

      await DailyAdminSummary.create({
        summary_date: yesterday,
        total_revenue: totalRevenue,
        total_sales: salesCount,
        total_rentals: rentalsCount,
        total_referrals: referralsCount,
        total_conversions: conversionsCount,
        total_commission_paid: parseFloat(commissionPaid),
        details: {
          salesRevenue: parseFloat(salesTotal),
          rentalRevenue: parseFloat(rentalsTotal),
        }
      });

      logger.info(`[Cron] Daily Admin Summary created for ${yesterday.toISOString().split('T')[0]} — Revenue: ₹${totalRevenue}, Sales: ${salesCount}, Rentals: ${rentalsCount}`);
    } catch (error) {
      logger.error(`[Cron] Daily Admin Summary generation failed: ${error.message}`);
    }
  });

  logger.info('All cron jobs scheduled successfully.');
};
