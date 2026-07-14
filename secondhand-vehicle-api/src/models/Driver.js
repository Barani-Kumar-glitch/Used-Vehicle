import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Driver extends Model {}

Driver.init({
  driver_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  licence_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  licence_class: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  licence_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  home_city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // e.g. available, active, inactive
    allowNull: false,
    defaultValue: 'available',
  },
}, {
  sequelize,
  modelName: 'Driver',
  tableName: 'drivers',
});
