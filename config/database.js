import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'job',
  username: process.env.DB_USER || 'job',
  password: process.env.DB_PASSWORD || 'job123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
});

export default sequelize;
