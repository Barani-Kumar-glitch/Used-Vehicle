import bcrypt from 'bcrypt';
import { connectDB, sequelize } from './db.js';
// Import index to load all models & associations
import { AdminUser } from '../models/index.js';

const ADMIN_USERNAME = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'adminpassword';

const runMigration = async () => {
  console.log('Starting Database Migration/Sync...');

  // Establish connection
  await connectDB();

  try {
    // Sync models to PostgreSQL
    // 'alter: true' will modify columns/tables safely if they exist
    await sequelize.sync({ alter: true });
    console.log('Database schemas synced successfully.');

    // Seed initial admin user if none exists
    const adminCount = await AdminUser.count();
    if (adminCount === 0) {
      console.log('No AdminUser found. Seeding default admin user...');

      // Hash the password manually BEFORE passing to AdminUser.create
      // This prevents the beforeCreate hook from double-hashing it.
      // We use individualHooks: false with a raw insert approach.
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      // Use raw insert to bypass the beforeCreate hook (which would double-hash)
      await sequelize.query(
        `INSERT INTO admin_users (username, password_hash, role, created_at, updated_at)
         VALUES (:username, :password_hash, :role, NOW(), NOW())`,
        {
          replacements: {
            username: ADMIN_USERNAME,
            password_hash: passwordHash,
            role: 'superadmin',
          },
          type: 'INSERT',
        }
      );

      console.log(`✅ Default AdminUser created — username: '${ADMIN_USERNAME}', password: '${ADMIN_PASSWORD}'`);
      console.log('   ⚠️  Remember to change the admin password after first login in production!');
    } else {
      console.log(`AdminUser records already exist (${adminCount} found). Skipping seed.`);
    }

    console.log('Database setup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database sync/migration:', error);
    process.exit(1);
  }
};

runMigration();
