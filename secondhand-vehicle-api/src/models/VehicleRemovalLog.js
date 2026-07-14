import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class VehicleRemovalLog extends Model {}

VehicleRemovalLog.init({
  removal_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING, // e.g. sold, delisted by admin
    allowNull: false,
  },
  removed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  removed_by_admin_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'VehicleRemovalLog',
  tableName: 'vehicle_removal_logs',
  timestamps: false, // removed_at serves as timestamp
});
