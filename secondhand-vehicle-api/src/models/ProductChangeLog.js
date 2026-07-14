import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class ProductChangeLog extends Model {}

ProductChangeLog.init({
  log_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  field_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  changed_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'ProductChangeLog',
  tableName: 'product_change_logs',
});
