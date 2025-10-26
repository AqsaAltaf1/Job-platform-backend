import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🗄️  Setting up database tables...');

async function setupDatabase() {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Sync all models (create tables)
    console.log('📋 Creating database tables...');
    await sequelize.sync({ force: false }); // Set to true to drop and recreate tables
    console.log('✅ Database tables created successfully');
    
    // Test a simple query
    const result = await sequelize.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';');
    console.log('📊 Created tables:', result[0].map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Database setup failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.original?.code);
    console.error('Error detail:', error.original?.detail);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();
