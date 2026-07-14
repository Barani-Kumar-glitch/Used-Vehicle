import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class CustomerDocument extends Model {}

CustomerDocument.init({
  document_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  document_type: {
    type: DataTypes.STRING, // e.g. Aadhaar, License
    allowNull: false,
  },
  document_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  verified_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // e.g. pending, approved, rejected
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  sequelize,
  modelName: 'CustomerDocument',
  tableName: 'customer_documents',
});
