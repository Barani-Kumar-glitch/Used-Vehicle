import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Referral extends Model {}

Referral.init({
  referral_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  referral_code: {
    type: DataTypes.STRING(12),
    allowNull: false,
    unique: true,
  },
  referrer_customer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  referred_customer_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('generated', 'visited', 'converted', 'commission_paid', 'expired'),
    allowNull: false,
    defaultValue: 'generated',
  },
  visited_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  converted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sale_order_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  commission_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  commission_status: {
    type: DataTypes.ENUM('not_applicable', 'pending', 'approved', 'paid'),
    allowNull: false,
    defaultValue: 'not_applicable',
  },
  admin_notified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  processed_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Referral',
  tableName: 'referrals',
});
