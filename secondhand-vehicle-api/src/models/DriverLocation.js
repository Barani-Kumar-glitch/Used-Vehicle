import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class DriverLocation extends Model {}

DriverLocation.init({
  location_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  driver_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assigned_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'DriverLocation',
  tableName: 'driver_locations',
});
