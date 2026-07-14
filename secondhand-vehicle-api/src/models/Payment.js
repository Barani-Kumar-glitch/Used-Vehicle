import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Payment extends Model {}

Payment.init({
  payment_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  sale_order_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  rental_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_method: {
    type: DataTypes.STRING, // e.g. Card, Cash, UPI, Bank Transfer
    allowNull: false,
    defaultValue: 'UPI',
  },
  payment_status: {
    type: DataTypes.STRING, // e.g. pending, completed, failed
    allowNull: false,
    defaultValue: 'completed',
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
});
