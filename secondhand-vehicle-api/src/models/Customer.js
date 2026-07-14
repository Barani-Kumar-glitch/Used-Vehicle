import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Customer extends Model {}

Customer.init({
  customer_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  customer_type: {
    type: DataTypes.ENUM('buyer', 'lender', 'both'), // allowed values
    allowNull: false,
    defaultValue: 'buyer',
  },
}, {
  sequelize,
  modelName: 'Customer',
  tableName: 'customers',
});
