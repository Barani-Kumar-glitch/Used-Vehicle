import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class PriceChangeLog extends Model {}

PriceChangeLog.init({
  log_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  price_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  old_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  new_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  changed_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'PriceChangeLog',
  tableName: 'price_change_logs',
});
