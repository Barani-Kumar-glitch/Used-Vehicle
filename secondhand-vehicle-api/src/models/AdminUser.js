import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcrypt';

export class AdminUser extends Model {
  async comparePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

AdminUser.init({
  admin_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'staff', // e.g. superadmin, manager, staff
  },
}, {
  sequelize,
  modelName: 'AdminUser',
  tableName: 'admin_users',
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password_hash) {
        admin.password_hash = await bcrypt.hash(admin.password_hash, 10);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password_hash')) {
        admin.password_hash = await bcrypt.hash(admin.password_hash, 10);
      }
    },
  },
});
