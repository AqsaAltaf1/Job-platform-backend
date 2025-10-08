import { sequelize } from './models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupRenderDatabase() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!');
    
    // Sync all models (create tables)
    console.log('🔄 Creating database tables...');
    await sequelize.sync({ force: false }); // Use force: true to recreate all tables
    console.log('✅ Database tables created/verified successfully!');
    
    console.log('🎉 Database setup completed!');
    console.log('🚀 Your application is ready to use!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Troubleshooting steps for Render:');
    console.log('1. Make sure you have created a PostgreSQL database in Render');
    console.log('2. Set the DATABASE_URL environment variable in Render dashboard:');
    console.log('   - Go to your web service → Environment tab');
    console.log('   - Add DATABASE_URL with your database connection string');
    console.log('   - Format: postgresql://username:password@host:port/database');
    console.log('3. Or set individual database variables:');
    console.log('   - DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT');
    console.log('4. Redeploy your service after setting environment variables');
    console.log('5. Check Render logs for any connection errors');
  } finally {
    await sequelize.close();
  }
}

setupRenderDatabase();
