import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class ActivityLog extends Model {}

ActivityLog.init({
  activity_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  admin_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING, // e.g. create_vehicle, update_vehicle, approve_commission
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING, // e.g. VEHICLE, REFERRAL, etc.
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  old_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'ActivityLog',
  tableName: 'activity_logs',
});
