import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const localUrl = process.env.DATABASE_URL;
const remoteUrl = process.env.NEON_DATABASE_URL;

if (!localUrl) {
  console.error("❌ ERROR: DATABASE_URL (local DB) is not set in environment.");
  process.exit(1);
}
if (!remoteUrl) {
  console.error("❌ ERROR: NEON_DATABASE_URL (remote Neon DB) is not set in environment. Please add it to your .env file.");
  process.exit(1);
}

const run = async () => {
  console.log("-----------------------------------------------------------------");
  console.log("🚀 STARTING DATABASE MIGRATION & DATA COPY FROM LOCAL TO NEON DB");
  console.log("-----------------------------------------------------------------");

  // Step 1: Sync schemas on Remote DB first using Sequelize models
  try {
    console.log("🔄 Step 1: Syncing remote Neon DB schemas using Sequelize...");
    // Overwrite env variable temporarily for dynamic import
    process.env.DATABASE_URL = remoteUrl;
    process.env.NODE_ENV = 'production'; // Force SSL configuration in db.js
    
    const { sequelize } = await import('./src/models/index.js');
    await sequelize.sync({ alter: true });
    console.log("✅ Remote Neon DB schemas synced successfully.");
    await sequelize.close();
  } catch (err) {
    console.error("❌ Failed to sync schemas on remote DB:", err);
    process.exit(1);
  }

  // Restore local environment variables for the pg clients
  process.env.DATABASE_URL = localUrl;
  process.env.NODE_ENV = 'development';

  // Step 2: Establish pg connections
  console.log("🔌 Step 2: Connecting to local and remote databases...");
  const localClient = new pg.Client({ connectionString: localUrl });
  const remoteClient = new pg.Client({
    connectionString: remoteUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await localClient.connect();
    await remoteClient.connect();
    console.log("✅ Database connections established.");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    await localClient.end().catch(() => {});
    await remoteClient.end().catch(() => {});
    process.exit(1);
  }

  // Step 3: Check if Neon DB is empty
  try {
    console.log("🔍 Step 3: Checking if remote Neon DB is empty of user data...");
    
    // Check if the tables exist and get counts
    const customerCheck = await remoteClient.query("SELECT COUNT(*) FROM customers").catch(() => ({ rows: [{ count: '0' }] }));
    const vehicleCheck = await remoteClient.query("SELECT COUNT(*) FROM vehicles").catch(() => ({ rows: [{ count: '0' }] }));
    
    const customerCount = parseInt(customerCheck.rows[0].count, 10);
    const vehicleCount = parseInt(vehicleCheck.rows[0].count, 10);

    console.log(`📊 Remote database status: ${customerCount} customers, ${vehicleCount} vehicles.`);

    if (customerCount > 0 || vehicleCount > 0) {
      console.log("⚠️ WARNING: Neon DB already contains user data. Pushing local data is skipped to prevent duplicate conflicts.");
      console.log("ℹ️ If you want to force clone, please truncate the remote tables first, or empty the DB.");
      await localClient.end();
      await remoteClient.end();
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Error checking remote DB status:", err);
    await localClient.end();
    await remoteClient.end();
    process.exit(1);
  }

  // Step 4: Truncate and Copy data in correct dependency order
  const tablesInOrder = [
    'admin_users',
    'customers',
    'vehicles',
    'drivers',
    'customer_documents',
    'customer_otp_verifications',
    'vehicle_prices',
    'vehicle_availabilities',
    'vehicle_removal_logs',
    'product_change_logs',
    'price_change_logs',
    'driver_locations',
    'driver_availabilities',
    'sale_orders',
    'rental_bookings',
    'referrals',
    'payments',
    'request_logs',
    'status_event_logs',
    'activity_logs',
    'daily_admin_summaries'
  ];

  const primaryKeys = {
    admin_users: 'admin_id',
    customers: 'customer_id',
    vehicles: 'vehicle_id',
    drivers: 'driver_id',
    customer_documents: 'document_id',
    customer_otp_verifications: 'otp_id',
    vehicle_prices: 'price_id',
    vehicle_availabilities: 'availability_id',
    vehicle_removal_logs: 'log_id',
    product_change_logs: 'log_id',
    price_change_logs: 'log_id',
    driver_locations: 'location_id',
    driver_availabilities: 'availability_id',
    sale_orders: 'sale_order_id',
    rental_bookings: 'rental_id',
    referrals: 'referral_id',
    payments: 'payment_id',
    request_logs: 'log_id',
    status_event_logs: 'log_id',
    activity_logs: 'log_id',
    daily_admin_summaries: 'summary_id'
  };

  try {
    console.log("🧹 Step 4: Truncating all remote dynamic tables to ensure clean state...");
    const reverseTables = [...tablesInOrder].reverse();
    for (const table of reverseTables) {
      await remoteClient.query(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    console.log("✅ Remote tables cleaned.");

    console.log("🚚 Step 5: Copying table contents from local to remote...");
    for (const table of tablesInOrder) {
      // Fetch all local records
      const localRes = await localClient.query(`SELECT * FROM "${table}" ORDER BY "${primaryKeys[table]}" ASC;`);
      const localRows = localRes.rows;

      if (localRows.length === 0) {
        console.log(`⚪ Table "${table}" has 0 local records. Skipping.`);
        continue;
      }

      console.log(`📥 Table "${table}": Copying ${localRows.length} records...`);

      for (const row of localRows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(row);

        await remoteClient.query(
          `INSERT INTO "${table}" (${columns}) VALUES (${placeholders});`,
          values
        );
      }

      // Reset auto-increment serial sequences
      const pk = primaryKeys[table];
      try {
        await remoteClient.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', '${pk}'),
            COALESCE((SELECT MAX("${pk}") FROM "${table}"), 1)
          );
        `);
        console.log(`✅ Table "${table}": Copy finished and serial sequence reset.`);
      } catch (seqErr) {
        console.log(`✅ Table "${table}": Copy finished (Sequence reset skipped/not needed: ${seqErr.message}).`);
      }
    }

    console.log("\n🎉 DATABASE CLONING COMPLETED SUCCESSFULLY!");
    console.log("All local database records have been copied to Neon DB.");
  } catch (err) {
    console.error("❌ CRITICAL ERROR during migration:", err);
  } finally {
    await localClient.end().catch(() => {});
    await remoteClient.end().catch(() => {});
  }
};

run();
