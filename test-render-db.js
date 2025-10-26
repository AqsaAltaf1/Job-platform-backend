import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Render Database Connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL is not set!');
  console.log('Please add DATABASE_URL to your Render environment variables.');
  process.exit(1);
}

async function testRenderConnection() {
  let sequelize;
  
  try {
    console.log('📡 Connecting to database...');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      retry: {
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/
        ],
        max: 3
      }
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('📊 Database version:', result[0][0].version);
    
    // Check if tables exist
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Existing tables:', tables[0].map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.original?.code);
    console.error('Error detail:', error.original?.detail);
    
    if (error.message.includes('Tenant or user not found')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check if DATABASE_URL is correctly formatted');
      console.log('2. Verify database credentials are correct');
      console.log('3. Ensure database exists and user has access');
      console.log('4. Check if database server is running');
      console.log('5. Make sure the database URL is accessible from Render');
    }
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

testRenderConnection();
