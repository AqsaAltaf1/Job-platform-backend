import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  const DATABASE_URL = 'postgresql://postgres:Aqsa12345@@db.mbijzngcaxtplpmgdcum.supabase.co:5432/postgres';
  
  const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log, // Enable logging to see the connection process
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  try {
    console.log('🔄 Testing Supabase connection...');
    console.log('📍 Host: db.mbijzngcaxtplpmgdcum.supabase.co');
    console.log('📍 Database: postgres');
    console.log('📍 User: postgres');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Supabase connection successful!');
    
    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('✅ Database version:', result[0][0].version);
    
    console.log('🎉 Your Supabase database is ready to use!');
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if your Supabase project is active (not paused)');
    console.log('2. Verify the password is correct: Aqsa12345@');
    console.log('3. Make sure your IP is not blocked');
    console.log('4. Check Supabase dashboard for any connection issues');
  } finally {
    await sequelize.close();
  }
}

testSupabaseConnection();
