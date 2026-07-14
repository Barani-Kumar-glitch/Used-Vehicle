import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class StatusEventLog extends Model {}

StatusEventLog.init({
  event_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  event_type: {
    type: DataTypes.STRING, // e.g. vehicle_added, referral_converted, etc.
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING, // e.g. VEHICLE, REFERRAL, SALE_ORDER
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  previous_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  new_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  triggered_by: {
    type: DataTypes.STRING, // e.g. "customer:1", "admin:3", "system"
    allowNull: false,
    defaultValue: 'system',
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'StatusEventLog',
  tableName: 'status_event_logs',
});
