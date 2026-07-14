import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class VehiclePrice extends Model {}

VehiclePrice.init({
  price_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  listing_mode: {
    type: DataTypes.STRING, // sale, rental, driver
    allowNull: false,
    defaultValue: 'sale',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // for sale price
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // for vehicle rental
  },
  daily_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // for vehicle rental
  },
  driver_hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // if rented with driver
  },
  driver_daily_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  effective_from: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  effective_to: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'VehiclePrice',
  tableName: 'vehicle_prices',
});
