// Migration: add rate_per_hour and rate_per_day columns to vehicles table
// Then update existing vehicles with per-vehicle rental rates and set listing_mode='both'
import { connectDB, sequelize } from './src/config/db.js';
import { Vehicle } from './src/models/index.js';
import { QueryTypes } from 'sequelize';

const migrate = async () => {
  await connectDB();

  // Add columns if they don't exist
  const columns = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='vehicles' AND column_name IN ('rate_per_hour','rate_per_day')`,
    { type: QueryTypes.SELECT }
  );
  const existingCols = columns.map(c => c.column_name);

  if (!existingCols.includes('rate_per_hour')) {
    await sequelize.query(`ALTER TABLE vehicles ADD COLUMN rate_per_hour DECIMAL(10,2) DEFAULT NULL`);
    console.log('✅ Added column: rate_per_hour');
  } else {
    console.log('ℹ️  Column rate_per_hour already exists');
  }

  if (!existingCols.includes('rate_per_day')) {
    await sequelize.query(`ALTER TABLE vehicles ADD COLUMN rate_per_day DECIMAL(10,2) DEFAULT NULL`);
    console.log('✅ Added column: rate_per_day');
  } else {
    console.log('ℹ️  Column rate_per_day already exists');
  }

  // Now update vehicles with rental rates and listing_mode='both'
  const vehicleRates = [
    { make: 'Toyota', model: 'Camry',    rate_per_hour: 350,  rate_per_day: 2800 }, // Compact Sedan
    { make: 'Toyota', model: 'Fortuner', rate_per_hour: 700,  rate_per_day: 5500 }, // Premium SUV
  ];

  for (const v of vehicleRates) {
    const [count] = await Vehicle.update(
      { listing_mode: 'both', rate_per_hour: v.rate_per_hour, rate_per_day: v.rate_per_day },
      { where: { make: v.make, model: v.model } }
    );
    console.log(`✅ Updated ${count} row(s): ${v.make} ${v.model} → listing_mode=both | ₹${v.rate_per_hour}/hr | ₹${v.rate_per_day}/day`);
  }

  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
