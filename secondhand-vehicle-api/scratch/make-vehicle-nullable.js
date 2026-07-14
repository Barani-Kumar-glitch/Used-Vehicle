import { sequelize } from '../src/config/db.js';

async function main() {
  try {
    console.log('Altering rental_bookings table to drop NOT NULL constraint on vehicle_id...');
    await sequelize.query('ALTER TABLE rental_bookings ALTER COLUMN vehicle_id DROP NOT NULL;');
    console.log('Table altered successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  process.exit(0);
}

main();
