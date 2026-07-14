import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class VehicleAvailability extends Model {}

VehicleAvailability.init({
  availability_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
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
    type: DataTypes.STRING, // e.g. maintenance, rental
    allowNull: false,
    defaultValue: 'rental',
  },
}, {
  sequelize,
  modelName: 'VehicleAvailability',
  tableName: 'vehicle_availabilities',
});
