import {
  sequelize,
  Customer,
  Vehicle,
  VehiclePrice,
  Driver,
  SaleOrder,
  RentalBooking,
  Payment,
  Referral,
  StatusEventLog,
  ActivityLog,
  CustomerOTPVerification,
  CustomerDocument
} from './src/models/index.js';

async function seed() {
  await sequelize.authenticate();
  console.log('Database connected successfully for seeding.');

  // Force delete in reverse order of foreign key dependencies
  await Payment.destroy({ where: {}, force: true });
  await Referral.destroy({ where: {}, force: true });
  await RentalBooking.destroy({ where: {}, force: true });
  await SaleOrder.destroy({ where: {}, force: true });
  await VehiclePrice.destroy({ where: {}, force: true });
  await Driver.destroy({ where: {}, force: true });
  await Vehicle.destroy({ where: {}, force: true });
  await CustomerOTPVerification.destroy({ where: {}, force: true });
  await CustomerDocument.destroy({ where: {}, force: true });
  await Customer.destroy({ where: {}, force: true });

  console.log('Cleared all dynamic tables.');

  // 1. Create 5 Customers
  const customers = await Customer.bulkCreate([
    { name: 'Arun Kumar', email: 'arun@example.com', phone: '9876543210', customer_type: 'buyer', verified: true },
    { name: 'Balaji S', email: 'balaji@example.com', phone: '9876543211', customer_type: 'lender', verified: true },
    { name: 'Chandran P', email: 'chandran@example.com', phone: '9876543212', customer_type: 'both', verified: true },
    { name: 'Deepak Raj', email: 'deepak@example.com', phone: '9876543213', customer_type: 'buyer', verified: true },
    { name: 'Eshwar Moorthy', email: 'eshwar@example.com', phone: '9876543214', customer_type: 'both', verified: true }
  ]);
  console.log('Created 5 customers.');

  // 2. Create 10 Vehicles
  const vehicles = await Vehicle.bulkCreate([
    { make: 'Maruti Suzuki', model: 'Swift', year: 2018, fuel_type: 'Petrol', transmission: 'Manual', location: 'Chennai', status: 'sold', listing_mode: 'sale' },
    { make: 'Hyundai', model: 'i20', year: 2019, fuel_type: 'Petrol', transmission: 'Automatic', location: 'Chennai', status: 'sold', listing_mode: 'sale' },
    { make: 'Honda', model: 'City', year: 2017, fuel_type: 'Diesel', transmission: 'Manual', location: 'Coimbatore', status: 'sold', listing_mode: 'sale' },
    { make: 'Tata', model: 'Nexon', year: 2021, fuel_type: 'Petrol', transmission: 'Automatic', location: 'Chennai', status: 'sold', listing_mode: 'sale' },
    { make: 'Mahindra', model: 'Thar', year: 2020, fuel_type: 'Diesel', transmission: 'Manual', location: 'Madurai', status: 'sold', listing_mode: 'sale' },

    { make: 'Ford', model: 'EcoSport', year: 2016, fuel_type: 'Diesel', transmission: 'Manual', location: 'Chennai', status: 'rented', listing_mode: 'rental' },
    { make: 'Toyota', model: 'Innova', year: 2015, fuel_type: 'Diesel', transmission: 'Manual', location: 'Chennai', status: 'rented', listing_mode: 'rental' },
    { make: 'Renault', model: 'Kwid', year: 2018, fuel_type: 'Petrol', transmission: 'Manual', location: 'Coimbatore', status: 'available', listing_mode: 'rental' },
    { make: 'Kia', model: 'Seltos', year: 2020, fuel_type: 'Petrol', transmission: 'Automatic', location: 'Madurai', status: 'available', listing_mode: 'both' },
    { make: 'Skoda', model: 'Rapid', year: 2017, fuel_type: 'Petrol', transmission: 'Manual', location: 'Chennai', status: 'available', listing_mode: 'both' }
  ]);
  console.log('Created 10 vehicles.');

  // Create Vehicle Price Records for all 10 Vehicles
  const prices = await VehiclePrice.bulkCreate([
    { vehicle_id: vehicles[0].vehicle_id, listing_mode: 'sale', price: 450000.00 },
    { vehicle_id: vehicles[1].vehicle_id, listing_mode: 'sale', price: 600000.00 },
    { vehicle_id: vehicles[2].vehicle_id, listing_mode: 'sale', price: 550000.00 },
    { vehicle_id: vehicles[3].vehicle_id, listing_mode: 'sale', price: 850000.00 },
    { vehicle_id: vehicles[4].vehicle_id, listing_mode: 'sale', price: 1200000.00 },

    { vehicle_id: vehicles[5].vehicle_id, listing_mode: 'rental', hourly_rate: 150.00, daily_rate: 3000.00 },
    { vehicle_id: vehicles[6].vehicle_id, listing_mode: 'rental', hourly_rate: 300.00, daily_rate: 6000.00 },
    { vehicle_id: vehicles[7].vehicle_id, listing_mode: 'rental', hourly_rate: 100.00, daily_rate: 2000.00 },
    { vehicle_id: vehicles[8].vehicle_id, listing_mode: 'rental', hourly_rate: 250.00, daily_rate: 5000.00, price: 1100000.00 },
    { vehicle_id: vehicles[9].vehicle_id, listing_mode: 'rental', hourly_rate: 120.00, daily_rate: 2400.00, price: 500000.00 }
  ]);
  console.log('Created pricing records for vehicles.');

  // 3. Create 5 Drivers
  const drivers = await Driver.bulkCreate([
    { name: 'Karthik Raja', licence_number: 'DL-1120180000001', licence_class: 'LMV', licence_expiry: '2030-12-31', home_city: 'Chennai', status: 'booked' },
    { name: 'Manoj Kumar', licence_number: 'DL-1120180000002', licence_class: 'LMV', licence_expiry: '2029-06-30', home_city: 'Chennai', status: 'booked' },
    { name: 'Naveen Vignesh', licence_number: 'DL-1120180000003', licence_class: 'HMV', licence_expiry: '2031-03-15', home_city: 'Coimbatore', status: 'available' },
    { name: 'Pradeep J', licence_number: 'DL-1120180000004', licence_class: 'LMV', licence_expiry: '2028-09-22', home_city: 'Madurai', status: 'available' },
    { name: 'Suresh Raina', licence_number: 'DL-1120180000005', licence_class: 'LMV', licence_expiry: '2027-01-01', home_city: 'Chennai', status: 'available' }
  ]);
  console.log('Created 5 drivers.');

  // 4. Create 5 SaleOrders (linked to the first 5 vehicles which are 'sold')
  const sales = await SaleOrder.bulkCreate([
    { vehicle_id: vehicles[0].vehicle_id, customer_id: customers[0].customer_id, price: 450000.00, payment_status: 'paid', sale_date: new Date('2026-05-10') },
    { vehicle_id: vehicles[1].vehicle_id, customer_id: customers[2].customer_id, price: 600000.00, payment_status: 'paid', sale_date: new Date('2026-05-15') },
    { vehicle_id: vehicles[2].vehicle_id, customer_id: customers[3].customer_id, price: 550000.00, payment_status: 'partial', sale_date: new Date('2026-05-20') },
    { vehicle_id: vehicles[3].vehicle_id, customer_id: customers[0].customer_id, price: 850000.00, payment_status: 'paid', sale_date: new Date('2026-05-25') },
    { vehicle_id: vehicles[4].vehicle_id, customer_id: customers[4].customer_id, price: 1200000.00, payment_status: 'unpaid', sale_date: new Date('2026-05-28') }
  ]);
  console.log('Created 5 sale orders.');

  // 5. Create 5 RentalBookings representing vehicle rentals (vehicle_id not null)
  const rentals = await RentalBooking.bulkCreate([
    { vehicle_id: vehicles[5].vehicle_id, customer_id: customers[1].customer_id, pickup_time: new Date('2026-06-01 10:00'), expected_return_time: new Date('2026-06-03 10:00'), price: 3000.00, payment_status: 'paid', status: 'completed' },
    { vehicle_id: vehicles[6].vehicle_id, customer_id: customers[2].customer_id, pickup_time: new Date('2026-06-05 12:00'), expected_return_time: new Date('2026-06-08 12:00'), price: 6000.00, payment_status: 'paid', status: 'completed' },
    { vehicle_id: vehicles[5].vehicle_id, customer_id: customers[4].customer_id, pickup_time: new Date('2026-06-10 09:00'), expected_return_time: new Date('2026-06-12 09:00'), price: 4000.00, payment_status: 'partial', status: 'ongoing' },
    { vehicle_id: vehicles[6].vehicle_id, customer_id: customers[1].customer_id, pickup_time: new Date('2026-06-15 08:00'), expected_return_time: new Date('2026-06-17 08:00'), price: 5000.00, payment_status: 'unpaid', status: 'ongoing' },
    { vehicle_id: vehicles[7].vehicle_id, customer_id: customers[2].customer_id, pickup_time: new Date('2026-06-20 10:00'), expected_return_time: new Date('2026-06-22 10:00'), price: 2500.00, payment_status: 'paid', status: 'completed' }
  ]);
  console.log('Created 5 vehicle rentals.');

  // 6. Create 5 RentalBookings representing driver bookings (driver_id not null, vehicle_id null)
  const driverBookings = await RentalBooking.bulkCreate([
    { driver_id: drivers[0].driver_id, customer_id: customers[1].customer_id, pickup_time: new Date('2026-06-01 09:00'), expected_return_time: new Date('2026-06-01 18:00'), price: 1000.00, payment_status: 'paid', status: 'completed' },
    { driver_id: drivers[1].driver_id, customer_id: customers[2].customer_id, pickup_time: new Date('2026-06-02 08:00'), expected_return_time: new Date('2026-06-02 20:00'), price: 1500.00, payment_status: 'paid', status: 'completed' },
    { driver_id: drivers[0].driver_id, customer_id: customers[4].customer_id, pickup_time: new Date('2026-06-03 10:00'), expected_return_time: new Date('2026-06-03 16:00'), price: 800.00, payment_status: 'partial', status: 'ongoing' },
    { driver_id: drivers[1].driver_id, customer_id: customers[1].customer_id, pickup_time: new Date('2026-06-04 07:00'), expected_return_time: new Date('2026-06-04 19:00'), price: 1600.00, payment_status: 'unpaid', status: 'ongoing' },
    { driver_id: drivers[2].driver_id, customer_id: customers[2].customer_id, pickup_time: new Date('2026-06-05 09:00'), expected_return_time: new Date('2026-06-05 17:00'), price: 1200.00, payment_status: 'paid', status: 'completed' }
  ]);
  console.log('Created 5 driver bookings.');

  // 7. Create 5 Payments
  const payments = await Payment.bulkCreate([
    { sale_order_id: sales[0].sale_order_id, amount: 450000.00, payment_method: 'Bank Transfer', payment_status: 'completed', paid_at: new Date('2026-05-10') },
    { sale_order_id: sales[1].sale_order_id, amount: 600000.00, payment_method: 'UPI', payment_status: 'completed', paid_at: new Date('2026-05-15') },
    { sale_order_id: sales[2].sale_order_id, amount: 250000.00, payment_method: 'Card', payment_status: 'completed', paid_at: new Date('2026-05-20') },
    { rental_id: rentals[0].rental_id, amount: 3000.00, payment_method: 'Cash', payment_status: 'completed', paid_at: new Date('2026-06-03') },
    { rental_id: rentals[1].rental_id, amount: 6000.00, payment_method: 'UPI', payment_status: 'completed', paid_at: new Date('2026-06-08') }
  ]);
  console.log('Created 5 payments.');

  // 8. Create 5 Referrals
  const referrals = await Referral.bulkCreate([
    { referral_code: 'REFXYZ123456', referrer_customer_id: customers[1].customer_id, vehicle_id: vehicles[7].vehicle_id, referred_customer_id: customers[0].customer_id, status: 'converted', commission_amount: 5000.00, commission_status: 'paid', expires_at: new Date('2026-09-01') },
    { referral_code: 'REFAAA111222', referrer_customer_id: customers[2].customer_id, vehicle_id: vehicles[8].vehicle_id, status: 'visited', expires_at: new Date('2026-09-05') },
    { referral_code: 'REFBBB333444', referrer_customer_id: customers[4].customer_id, vehicle_id: vehicles[9].vehicle_id, status: 'generated', expires_at: new Date('2026-09-10') },
    { referral_code: 'REFCCC555666', referrer_customer_id: customers[1].customer_id, vehicle_id: vehicles[7].vehicle_id, referred_customer_id: customers[3].customer_id, status: 'converted', commission_amount: 4000.00, commission_status: 'pending', expires_at: new Date('2026-09-15') },
    { referral_code: 'REFDDD777888', referrer_customer_id: customers[2].customer_id, vehicle_id: vehicles[8].vehicle_id, referred_customer_id: customers[0].customer_id, status: 'converted', commission_amount: 6000.00, commission_status: 'approved', expires_at: new Date('2026-09-20') }
  ]);
  console.log('Created 5 referrals.');

  console.log('Seeding completed successfully!');
  await sequelize.close();
}

seed().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
