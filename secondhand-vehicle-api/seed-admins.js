// Seeder script to add admin2 and admin3 users
import { connectDB } from './src/config/db.js';
import { AdminUser } from './src/models/index.js';
import bcrypt from 'bcrypt';

const admins = [
  { username: 'admin2', password_hash: 'password2', role: 'superadmin' },
  { username: 'admin3', password_hash: 'password3', role: 'superadmin' },
];

const seedAdmins = async () => {
  await connectDB();
  for (const admin of admins) {
    // Manually hash the password
    const hashedPassword = await bcrypt.hash(admin.password_hash, 10);
    const existing = await AdminUser.findOne({ where: { username: admin.username } });
    
    if (existing) {
      // Update existing admin user (bypass model hooks to avoid double-hashing)
      await AdminUser.update(
        { password_hash: hashedPassword },
        { where: { username: admin.username }, hooks: false }
      );
      console.log(`Updated admin '${admin.username}'`);
    } else {
      // Create new admin user (bypass model hooks to avoid double-hashing)
      await AdminUser.create({
        username: admin.username,
        password_hash: hashedPassword,
        role: admin.role,
      }, { hooks: false });
      console.log(`Created admin '${admin.username}'`);
    }
  }
  process.exit(0);
};

seedAdmins().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

