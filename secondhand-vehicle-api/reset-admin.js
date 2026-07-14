// Quick script to reset admin password and verify bcrypt works
import bcrypt from 'bcrypt';
import { connectDB } from './src/config/db.js';
import { AdminUser } from './src/models/index.js';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'adminpassword';

const resetAdmin = async () => {
  await connectDB();

  // Hash password manually
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  console.log('Generated hash:', hash);

  // Verify it works
  const ok = await bcrypt.compare(ADMIN_PASSWORD, hash);
  console.log('bcrypt.compare test:', ok ? '✅ PASS' : '❌ FAIL');

  // Find existing admin
  let admin = await AdminUser.findOne({ where: { username: ADMIN_USERNAME } });

  if (admin) {
    // Update password_hash directly (bypass beforeUpdate hook by using raw update)
    await AdminUser.update(
      { password_hash: hash },
      { where: { username: ADMIN_USERNAME }, individualHooks: false }
    );
    console.log(`Admin '${ADMIN_USERNAME}' password reset to '${ADMIN_PASSWORD}' successfully.`);
  } else {
    // Create fresh with raw hash (bypass beforeCreate double-hashing)
    await AdminUser.create({
      username: ADMIN_USERNAME,
      password_hash: ADMIN_PASSWORD, // hook will hash it
      role: 'superadmin',
    });
    console.log(`Admin '${ADMIN_USERNAME}' created successfully.`);
  }

  // Final verify from DB
  admin = await AdminUser.findOne({ where: { username: ADMIN_USERNAME } });
  const finalCheck = await bcrypt.compare(ADMIN_PASSWORD, admin.password_hash);
  console.log('Final DB verify:', finalCheck ? '✅ Login will WORK' : '❌ Login will FAIL - hash mismatch');

  process.exit(0);
};

resetAdmin().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
