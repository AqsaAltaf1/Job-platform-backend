import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupSupabaseDatabase() {
  try {
    console.log('🔄 Connecting to Supabase database...');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Supabase database connection established successfully!');
    
    // Sync all models (create tables)
    console.log('🔄 Creating database tables in Supabase...');
    await sequelize.sync({ force: false }); // Use force: true to recreate all tables
    console.log('✅ Database tables created/verified successfully!');
    
    console.log('🎉 Supabase database setup completed!');
    console.log('🚀 Your application is ready to use with Supabase!');
    
    // Show some useful information
    console.log('\n📊 Next steps:');
    console.log('1. Your database tables are now created in Supabase');
    console.log('2. You can view your data in the Supabase dashboard');
    console.log('3. Your API is ready to handle requests');
    console.log('4. Consider setting up Row Level Security (RLS) in Supabase for additional security');
    
  } catch (error) {
    console.error('❌ Supabase database setup failed:', error.message);
    console.log('\n📋 Troubleshooting steps for Supabase:');
    console.log('1. Make sure you have created a Supabase project');
    console.log('2. Get your database connection string from Supabase dashboard:');
    console.log('   - Go to Settings → Database');
    console.log('   - Copy the connection string');
    console.log('3. Set the DATABASE_URL environment variable in Render:');
    console.log('   - Format: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres');
    console.log('4. Make sure your Supabase project is not paused (free tier pauses after inactivity)');
    console.log('5. Check if your IP is whitelisted (if using IP restrictions)');
    console.log('6. Redeploy your service after setting environment variables');
  } finally {
    await sequelize.close();
  }
}

setupSupabaseDatabase();
