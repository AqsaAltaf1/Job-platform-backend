import { sequelize } from './models/index.js';

async function createEssentialTables() {
  try {
    console.log('🔄 Creating essential database tables...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to database!');
    
    // Sync all models to create tables
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ All tables created/updated successfully!');
    
    // List all tables
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    results.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

createEssentialTables();
