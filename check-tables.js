import { Sequelize } from 'sequelize';

// Direct connection to Supabase
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: false
});

async function checkTables() {
  try {
    console.log('🔄 Checking tables in Supabase...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase!');
    
    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 Found ${tables.length} tables in your Supabase database:`);
    console.log('=' .repeat(50));
    
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    console.log('=' .repeat(50));
    console.log('🎉 Your database is ready for your job portal application!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();
