import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { initCronJobs } from './jobs/cronJobs.js';

const startServer = async () => {
  // 1. Connect to PostgreSQL
  await connectDB();
  
  // 2. Start node-cron jobs
  initCronJobs();
  
  // 3. Start server
  app.listen(env.PORT, () => {
    console.log(`==================================================`);
    console.log(`Secondhand Vehicle Service API running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`==================================================`);
  });
};

startServer().catch((error) => {
  console.error('Fatal server start error:', error);
  process.exit(1);
});
