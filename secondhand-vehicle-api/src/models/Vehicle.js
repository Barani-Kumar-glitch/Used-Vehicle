import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Vehicle extends Model { }

Vehicle.init({
  vehicle_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  make: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fuel_type: {
    type: DataTypes.STRING, // e.g. Petrol, Diesel, Electric
    allowNull: false,
  },
  transmission: {
    type: DataTypes.STRING, // e.g. Manual, Automatic
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // e.g. available, sold, rented
    allowNull: false,
    defaultValue: 'available',
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  listing_mode: {
    type: DataTypes.STRING, // e.g. sale, rental, both
    allowNull: false,
    defaultValue: 'sale',
  },
  photo_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rate_per_hour: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  },
  rate_per_day: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  },
  km_driven: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'Vehicle',
  tableName: 'vehicles',
});
