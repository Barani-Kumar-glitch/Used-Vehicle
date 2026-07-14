import { sequelize } from '../config/db.js';

// Import all models
import { AdminUser } from './AdminUser.js';
import { Customer } from './Customer.js';
import { CustomerOTPVerification } from './CustomerOTPVerification.js';
import { CustomerDocument } from './CustomerDocument.js';
import { Vehicle } from './Vehicle.js';
import { VehiclePrice } from './VehiclePrice.js';
import { VehicleAvailability } from './VehicleAvailability.js';
import { VehicleRemovalLog } from './VehicleRemovalLog.js';
import { ProductChangeLog } from './ProductChangeLog.js';
import { PriceChangeLog } from './PriceChangeLog.js';
import { Driver } from './Driver.js';
import { DriverLocation } from './DriverLocation.js';
import { DriverAvailability } from './DriverAvailability.js';
import { SaleOrder } from './SaleOrder.js';
import { RentalBooking } from './RentalBooking.js';
import { Payment } from './Payment.js';
import { Referral } from './Referral.js';
import { RequestLog } from './RequestLog.js';
import { StatusEventLog } from './StatusEventLog.js';
import { ActivityLog } from './ActivityLog.js';
import { DailyAdminSummary } from './DailyAdminSummary.js';

// Setup associations

// VEHICLE Associations
Vehicle.hasMany(VehiclePrice, { foreignKey: 'vehicle_id', as: 'prices' });
VehiclePrice.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(VehicleAvailability, { foreignKey: 'vehicle_id', as: 'availabilities' });
VehicleAvailability.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(VehicleRemovalLog, { foreignKey: 'vehicle_id', as: 'removal_logs' });
VehicleRemovalLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(ProductChangeLog, { foreignKey: 'vehicle_id', as: 'product_logs' });
ProductChangeLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(SaleOrder, { foreignKey: 'vehicle_id', as: 'sales' });
SaleOrder.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(RentalBooking, { foreignKey: 'vehicle_id', as: 'rentals' });
RentalBooking.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(Referral, { foreignKey: 'vehicle_id', as: 'referrals' });
Referral.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

Vehicle.hasMany(RequestLog, { foreignKey: 'vehicle_id', as: 'requests' });
RequestLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });

// CUSTOMER Associations
Customer.hasMany(CustomerOTPVerification, { foreignKey: 'customer_id', as: 'otps' });
CustomerOTPVerification.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(CustomerDocument, { foreignKey: 'customer_id', as: 'documents' });
CustomerDocument.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(SaleOrder, { foreignKey: 'customer_id', as: 'sales' });
SaleOrder.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(RentalBooking, { foreignKey: 'customer_id', as: 'rentals' });
RentalBooking.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(Referral, { foreignKey: 'referrer_customer_id', as: 'sent_referrals' });
Referral.belongsTo(Customer, { foreignKey: 'referrer_customer_id', as: 'Referrer' });

Customer.hasMany(Referral, { foreignKey: 'referred_customer_id', as: 'received_referrals' });
Referral.belongsTo(Customer, { foreignKey: 'referred_customer_id', as: 'ReferredCustomer' });

Customer.hasMany(RequestLog, { foreignKey: 'customer_id', as: 'requests' });
RequestLog.belongsTo(Customer, { foreignKey: 'customer_id' });

// DRIVER Associations
Driver.hasMany(DriverLocation, { foreignKey: 'driver_id', as: 'locations' });
DriverLocation.belongsTo(Driver, { foreignKey: 'driver_id' });

Driver.hasMany(DriverAvailability, { foreignKey: 'driver_id', as: 'availabilities' });
DriverAvailability.belongsTo(Driver, { foreignKey: 'driver_id' });

Driver.hasMany(RentalBooking, { foreignKey: 'driver_id', as: 'rentals' });
RentalBooking.belongsTo(Driver, { foreignKey: 'driver_id' });

Driver.hasMany(RequestLog, { foreignKey: 'driver_id', as: 'requests' });
RequestLog.belongsTo(Driver, { foreignKey: 'driver_id' });

// ADMIN Associations
AdminUser.hasMany(CustomerDocument, { foreignKey: 'verified_by_admin_id', as: 'verified_documents' });
CustomerDocument.belongsTo(AdminUser, { foreignKey: 'verified_by_admin_id', as: 'Verifier' });

AdminUser.hasMany(VehicleRemovalLog, { foreignKey: 'removed_by_admin_id', as: 'removed_vehicles' });
VehicleRemovalLog.belongsTo(AdminUser, { foreignKey: 'removed_by_admin_id', as: 'Remover' });

AdminUser.hasMany(ProductChangeLog, { foreignKey: 'changed_by_admin_id', as: 'product_changes' });
ProductChangeLog.belongsTo(AdminUser, { foreignKey: 'changed_by_admin_id', as: 'Changer' });

AdminUser.hasMany(PriceChangeLog, { foreignKey: 'changed_by_admin_id', as: 'price_changes' });
PriceChangeLog.belongsTo(AdminUser, { foreignKey: 'changed_by_admin_id', as: 'Changer' });

AdminUser.hasMany(DriverLocation, { foreignKey: 'assigned_by_admin_id', as: 'driver_assignments' });
DriverLocation.belongsTo(AdminUser, { foreignKey: 'assigned_by_admin_id', as: 'Assigner' });

AdminUser.hasMany(Referral, { foreignKey: 'processed_by_admin_id', as: 'processed_referrals' });
Referral.belongsTo(AdminUser, { foreignKey: 'processed_by_admin_id', as: 'Processor' });

AdminUser.hasMany(ActivityLog, { foreignKey: 'admin_id', as: 'activity_logs' });
ActivityLog.belongsTo(AdminUser, { foreignKey: 'admin_id' });

// ORDERS & PAYMENT Associations
SaleOrder.hasMany(Payment, { foreignKey: 'sale_order_id', as: 'payments' });
Payment.belongsTo(SaleOrder, { foreignKey: 'sale_order_id' });

RentalBooking.hasMany(Payment, { foreignKey: 'rental_id', as: 'payments' });
Payment.belongsTo(RentalBooking, { foreignKey: 'rental_id' });

// REFERRAL & SALE Associations
SaleOrder.hasOne(Referral, { foreignKey: 'sale_order_id', as: 'referral' });
Referral.belongsTo(SaleOrder, { foreignKey: 'sale_order_id' });

SaleOrder.belongsTo(SaleOrder, { foreignKey: 'exchange_ref_id', as: 'ExchangeOrder' });

// Price Change Log relationship to VehiclePrice
VehiclePrice.hasMany(PriceChangeLog, { foreignKey: 'price_id', as: 'price_logs' });
PriceChangeLog.belongsTo(VehiclePrice, { foreignKey: 'price_id' });

// Export everything
export {
  sequelize,
  AdminUser,
  Customer,
  CustomerOTPVerification,
  CustomerDocument,
  Vehicle,
  VehiclePrice,
  VehicleAvailability,
  VehicleRemovalLog,
  ProductChangeLog,
  PriceChangeLog,
  Driver,
  DriverLocation,
  DriverAvailability,
  SaleOrder,
  RentalBooking,
  Payment,
  Referral,
  RequestLog,
  StatusEventLog,
  ActivityLog,
  DailyAdminSummary,
};
