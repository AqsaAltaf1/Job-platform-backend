import { Sequelize } from 'sequelize';

// Your Supabase connection string
const SUPABASE_URL = 'postgresql://postgres.zxciizmevixhopgtmjpb:Aqsa12345%40@aws-1-us-west-1.pooler.supabase.com:5432/postgres';

const sequelize = new Sequelize(SUPABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  }
});

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking Supabase database status...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check what tables exist
    console.log('📋 Checking existing tables...');
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Current tables in Supabase:');
    if (tables[0].length === 0) {
      console.log('❌ NO TABLES FOUND! Database is empty.');
    } else {
      tables[0].forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check if users table exists specifically
    const usersExists = tables[0].some(row => row.table_name === 'users');
    console.log(`\n👤 Users table exists: ${usersExists ? '✅ YES' : '❌ NO'}`);
    
    if (!usersExists) {
      console.log('\n🚨 CRITICAL ISSUE: Users table is missing!');
      console.log('This explains why Google login is failing.');
      console.log('\n🔧 Need to recreate the database schema...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabaseStatus();
