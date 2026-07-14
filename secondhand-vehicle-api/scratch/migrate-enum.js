import { connectDB, sequelize } from '../src/config/db.js';

async function main() {
  await connectDB();
  try {
    // 1. Add new enum values to Postgres type
    console.log('Adding ENUM values...');
    // We cannot run ALTER TYPE ADD VALUE in a transaction block in some postgres versions/settings, 
    // so we run it directly or handle it.
    await sequelize.query(`ALTER TYPE "enum_customers_customer_type" ADD VALUE IF NOT EXISTS 'Individual';`);
    await sequelize.query(`ALTER TYPE "enum_customers_customer_type" ADD VALUE IF NOT EXISTS 'Dealer';`);
    
    // 2. Update existing rows
    console.log('Updating customer_type values in customers table...');
    await sequelize.query(`UPDATE customers SET customer_type = 'Individual' WHERE customer_type = 'buyer';`);
    await sequelize.query(`UPDATE customers SET customer_type = 'Dealer' WHERE customer_type = 'lender';`);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  process.exit(0);
}

main();
