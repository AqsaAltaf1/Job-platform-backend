import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupReplitSupabase() {
  try {
    console.log('🔄 Setting up Supabase database in Replit...');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found in environment variables');
      console.log('📋 Please set DATABASE_URL in Replit Secrets tab:');
      console.log('   postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');
      return;
    }
    
    console.log('✅ DATABASE_URL found');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Supabase connection established successfully!');
    
    // Sync all models (create tables)
    console.log('🔄 Creating database tables...');
    await sequelize.sync({ force: false }); // Use force: true to recreate all tables
    console.log('✅ Database tables created/verified successfully!');
    
    console.log('🎉 Replit + Supabase setup completed!');
    console.log('🚀 Your application is ready to use!');
    
    // Show some useful information
    console.log('\n📊 Database Info:');
    console.log('- Connected to Supabase PostgreSQL');
    console.log('- All tables are ready');
    console.log('- You can now use your API endpoints');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Make sure DATABASE_URL is set in Replit Secrets');
    console.log('2. Check if your Supabase project is active (not paused)');
    console.log('3. Verify the connection string format');
    console.log('4. Restart your Replit project after setting secrets');
  } finally {
    await sequelize.close();
  }
}

setupReplitSupabase();
