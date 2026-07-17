import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const localUrl = process.env.DATABASE_URL;

if (!localUrl) {
  console.error("❌ ERROR: DATABASE_URL is not set in environment.");
  process.exit(1);
}

const formatValue = (val) => {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'object') {
    // If it's a JSON/JSONB column
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  // Treat as string and escape single quotes
  const escaped = val.toString().replace(/'/g, "''");
  return `'${escaped}'`;
};

const run = async () => {
  console.log("Connecting to local database to generate SQL dump...");
  const client = new pg.Client({ connectionString: localUrl });
  
  try {
    await client.connect();
    console.log("Connected.");
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }

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
    vehicle_removal_logs: 'removal_id',
    product_change_logs: 'log_id',
    price_change_logs: 'log_id',
    driver_locations: 'location_id',
    driver_availabilities: 'availability_id',
    sale_orders: 'sale_order_id',
    rental_bookings: 'rental_id',
    referrals: 'referral_id',
    payments: 'payment_id',
    request_logs: 'request_id',
    status_event_logs: 'event_id',
    activity_logs: 'activity_id',
    daily_admin_summaries: 'summary_id'
  };

  let sqlOutput = `-- =====================================================================\n`;
  sqlOutput += `-- SQL DUMP: Local Database to Neon SQL Editor\n`;
  sqlOutput += `-- Generated at: ${new Date().toISOString()}\n`;
  sqlOutput += `-- =====================================================================\n\n`;

  // Start transaction
  sqlOutput += `BEGIN;\n\n`;

  // Add cleanup truncates
  sqlOutput += `-- 1. Truncate remote dynamic tables to prevent duplication\n`;
  const reverseTables = [...tablesInOrder].reverse();
  for (const table of reverseTables) {
    sqlOutput += `TRUNCATE TABLE "${table}" CASCADE;\n`;
  }
  sqlOutput += `\n`;

  try {
    for (const table of tablesInOrder) {
      sqlOutput += `-- ---------------------------------------------------------------------\n`;
      sqlOutput += `-- Table: ${table}\n`;
      sqlOutput += `-- ---------------------------------------------------------------------\n`;

      const pk = primaryKeys[table];
      const res = await client.query(`SELECT * FROM "${table}" ORDER BY "${pk}" ASC;`);
      const rows = res.rows;

      if (rows.length === 0) {
        sqlOutput += `-- (No records found in local table "${table}")\n\n`;
        continue;
      }

      for (const row of rows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const values = Object.values(row).map(val => formatValue(val)).join(', ');
        sqlOutput += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
      }

      // Add sequence resets
      sqlOutput += `SELECT setval(pg_get_serial_sequence('${table}', '${pk}'), COALESCE((SELECT MAX("${pk}") FROM "${table}"), 1));\n\n`;
    }

    sqlOutput += `COMMIT;\n`;
    
    const outputPath = path.resolve(__dirname, '../seed_data_dump.sql');
    fs.writeFileSync(outputPath, sqlOutput);
    console.log(`\n🎉 Success! SQL dump file written to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error generating SQL dump:", err.message);
  } finally {
    await client.end();
  }
};

run();
