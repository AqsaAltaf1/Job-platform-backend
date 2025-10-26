import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Database Connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');

async function testConnection() {
  let sequelize;
  
  try {
    if (process.env.DATABASE_URL) {
      console.log('📡 Using DATABASE_URL for connection...');
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: console.log,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      });
    } else {
      console.log('📡 Using individual database variables...');
      sequelize = new Sequelize({
        database: process.env.DB_NAME || 'job',
        username: process.env.DB_USER || 'job',
        password: process.env.DB_PASSWORD || 'job123',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: console.log,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      });
    }

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('📊 Database version:', result[0][0].version);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.original?.code);
    console.error('Error detail:', error.original?.detail);
    
    if (error.message.includes('Tenant or user not found')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check if DATABASE_URL is correctly formatted');
      console.log('2. Verify database credentials');
      console.log('3. Ensure database exists and user has access');
      console.log('4. Check if database server is running');
    }
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

testConnection();
