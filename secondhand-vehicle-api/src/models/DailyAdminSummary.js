import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class DailyAdminSummary extends Model {}

DailyAdminSummary.init({
  summary_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  summary_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  total_revenue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_sales: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_rentals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_referrals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_conversions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_commission_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'DailyAdminSummary',
  tableName: 'daily_admin_summaries',
});
