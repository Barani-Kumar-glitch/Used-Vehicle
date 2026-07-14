import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class SaleOrder extends Model {}

SaleOrder.init({
  sale_order_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
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
  ownership_transfer_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sale_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  exchange_ref_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'SaleOrder',
  tableName: 'sale_orders',
});
