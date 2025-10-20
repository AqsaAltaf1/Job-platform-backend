import { sequelize } from './models/index.js';

async function createReferenceTables() {
  try {
    console.log('🔧 Creating Reference tables...');
    
    // Sync all models to create tables
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Reference tables created/updated successfully!');
    
    // List all tables
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%reference%'
      ORDER BY table_name;
    `);
    
    console.log('📋 Reference-related tables:');
    results.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

createReferenceTables();


