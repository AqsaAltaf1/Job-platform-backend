import { Sequelize } from 'sequelize';

// Test different connection string formats
const connectionStrings = [
  // Format 1: Session Pooler (recommended)
  'postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345%40@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  
  // Format 2: Direct connection
  'postgresql://postgres:Aqsa12345%40@db.zxciizmevixhopgtmjpb.supabase.co:5432/postgres',
  
  // Format 3: With SSL
  'postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345%40@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
  
  // Format 4: Direct with SSL
  'postgresql://postgres:Aqsa12345%40@db.zxciizmevixhopgtmjpb.supabase.co:5432/postgres?sslmode=require'
];

async function testConnectionString(connectionString, name) {
  console.log(`\n🔍 Testing ${name}:`);
  console.log(`URL: ${connectionString.replace(/:[^:@]+@/, ':***@')}`); // Hide password
  
  let sequelize;
  try {
    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: { rejectUnauthorized: false }
      },
      pool: {
        max: 1,
        min: 0,
        acquire: 10000,
        idle: 1000
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('📊 Database version:', result[0][0].version.substring(0, 50) + '...');
    
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    if (error.original) {
      console.log('   Original error:', error.original.message);
    }
    return false;
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

async function testAllConnections() {
  console.log('🧪 Testing different connection string formats...\n');
  
  let successCount = 0;
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnectionString(connectionStrings[i], `Format ${i + 1}`);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Results: ${successCount}/${connectionStrings.length} connections successful`);
  
  if (successCount === 0) {
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if your Supabase project is paused');
    console.log('2. Verify the password is correct');
    console.log('3. Check if the project ID is correct');
    console.log('4. Try resetting the database password in Supabase');
    console.log('5. Make sure you\'re using the Session Pooler, not Direct connection');
  } else {
    console.log('\n✅ At least one connection works! Use the successful format in Render.');
  }
}

testAllConnections();
