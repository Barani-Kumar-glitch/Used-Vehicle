import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class RequestLog extends Model {}

RequestLog.init({
  request_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  driver_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  request_type: {
    type: DataTypes.STRING, // e.g. buy, rent, driver
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // e.g. pending, accepted, rejected
    allowNull: false,
    defaultValue: 'pending',
  },
  referral_code: {
    type: DataTypes.STRING(12),
    allowNull: true,
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'RequestLog',
  tableName: 'request_logs',
});
