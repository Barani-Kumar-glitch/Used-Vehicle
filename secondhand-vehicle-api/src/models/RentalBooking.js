import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class RentalBooking extends Model {}

RentalBooking.init({
  rental_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  driver_id: {
    type: DataTypes.BIGINT,
    allowNull: true, // Drivers are optional for rentals
  },
  pickup_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  expected_return_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  actual_return_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.STRING, // unpaid, partial, paid
    allowNull: false,
    defaultValue: 'unpaid',
  },
}, {
  sequelize,
  modelName: 'RentalBooking',
  tableName: 'rental_bookings',
});
