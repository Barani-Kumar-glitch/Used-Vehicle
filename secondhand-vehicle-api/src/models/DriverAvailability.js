import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class DriverAvailability extends Model {}

DriverAvailability.init({
  availability_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  driver_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  blocked_reason: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'booking',
  },
}, {
  sequelize,
  modelName: 'DriverAvailability',
  tableName: 'driver_availabilities',
});
