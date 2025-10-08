import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeRenderDatabase() {
  try {
    console.log('🔄 Initializing database tables on Render...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Supabase connection established successfully!');
    
    // Sync all models (create tables)
    console.log('🔄 Creating database tables...');
    await sequelize.sync({ force: false }); // Use force: true to recreate all tables
    console.log('✅ Database tables created/verified successfully!');
    
    console.log('🎉 Render + Supabase setup completed!');
    console.log('🚀 Your API is ready to use!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if DATABASE_URL is set correctly in Render environment variables');
    console.log('2. Verify your Supabase project is active (not paused)');
    console.log('3. Check Render deployment logs for connection errors');
  } finally {
    await sequelize.close();
  }
}

initializeRenderDatabase();
