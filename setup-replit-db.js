import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupReplitDatabase() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!');
    
    // Sync all models (create tables)
    console.log('🔄 Creating database tables...');
    await sequelize.sync({ force: false }); // Use force: true to recreate all tables
    console.log('✅ Database tables created/verified successfully!');
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Make sure you have created a database in Replit (Tools > Database)');
    console.log('2. Set the following environment variables in Replit Secrets:');
    console.log('   - DB_NAME');
    console.log('   - DB_USER'); 
    console.log('   - DB_PASSWORD');
    console.log('   - DB_HOST');
    console.log('   - DB_PORT (usually 5432)');
    console.log('3. Restart your Replit project after setting environment variables');
  } finally {
    await sequelize.close();
  }
}

setupReplitDatabase();
