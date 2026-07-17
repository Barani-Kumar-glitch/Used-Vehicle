import { Sequelize } from 'sequelize';
import { env } from './env.js';
import logger from './logger.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: true, // Neon requires SSL
    }
  } : {},
  // Route Sequelize SQL logs through Winston at debug level (dev only)
  logging: env.NODE_ENV === 'development'
    ? (msg) => logger.debug(`[Sequelize] ${msg}`)
    : false,
  define: {
    timestamps: true,
    underscored: true,      // Use snake_case for all DB fields
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully.');
  } catch (error) {
    logger.error(`Unable to connect to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};
