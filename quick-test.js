import { Sequelize } from 'sequelize';

// Direct Supabase connection using connection pooler (better for production)
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

async function quickTest() {
  try {
    console.log('🔄 Testing Supabase connection...');
    await sequelize.authenticate();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT NOW() as current_time');
    console.log('✅ Current time from Supabase:', results[0].current_time);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

quickTest();
