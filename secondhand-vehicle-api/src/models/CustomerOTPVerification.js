import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcrypt';

export class CustomerOTPVerification extends Model {
  async compareOTP(code) {
    return bcrypt.compare(code, this.otp_code);
  }
}

CustomerOTPVerification.init({
  otp_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.BIGINT,
    allowNull: true, // Nullable because during signup, customer doesn't exist yet
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otp_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING, // e.g. login, signup
    allowNull: false,
    defaultValue: 'login',
  },
  attempt_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'CustomerOTPVerification',
  tableName: 'customer_otp_verifications',
});
