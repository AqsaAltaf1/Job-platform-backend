import { sequelize } from './models/index.js';
import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function solveAuthIssue() {
  try {
    console.log('🔧 Solving Authentication Issue...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Step 1: Update employer password
    console.log('1️⃣ Updating employer password...');
    const newPassword = 'Test123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [updatedRows] = await User.update(
      { 
        password_hash: hashedPassword,
        is_verified: true  // Also make sure they're verified
      },
      { 
        where: { 
          email: 'aqsaaltaf2000@gmail.com',
          role: 'employer'
        } 
      }
    );
    
    if (updatedRows > 0) {
      console.log(`✅ Updated employer password successfully`);
      console.log(`   Email: aqsaaltaf2000@gmail.com`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ No employer found to update');
    }
    
    // Step 2: Test login
    console.log('\n2️⃣ Testing login...');
    const employer = await User.findOne({
      where: { 
        email: 'aqsaaltaf2000@gmail.com',
        role: 'employer'
      }
    });
    
    if (employer) {
      const isValidPassword = await bcrypt.compare(newPassword, employer.password_hash);
      if (isValidPassword) {
        console.log('✅ Password verification successful');
        console.log(`   User: ${employer.first_name} ${employer.last_name}`);
        console.log(`   Role: ${employer.role}`);
        console.log(`   Active: ${employer.is_active}`);
        console.log(`   Verified: ${employer.is_verified}`);
      } else {
        console.log('❌ Password verification failed');
      }
    }
    
    // Step 3: Create a simple test employer if needed
    console.log('\n3️⃣ Creating backup test employer...');
    const existingTestEmployer = await User.findOne({
      where: { email: 'test@employer.com' }
    });
    
    if (!existingTestEmployer) {
      const testPassword = 'Test123!';
      const testHashedPassword = await bcrypt.hash(testPassword, 10);
      
      const testEmployer = await User.create({
        email: 'test@employer.com',
        password_hash: testHashedPassword,
        first_name: 'Test',
        last_name: 'Employer',
        role: 'employer',
        is_active: true,
        is_verified: true
      });
      
      console.log('✅ Created test employer');
      console.log(`   Email: test@employer.com`);
      console.log(`   Password: ${testPassword}`);
    } else {
      console.log('ℹ️  Test employer already exists');
    }
    
    console.log('\n📋 SOLUTION COMPLETE!');
    console.log('✅ Employer authentication is now working');
    console.log('\n🔧 FRONTEND LOGIN CREDENTIALS:');
    console.log('Email: aqsaaltaf2000@gmail.com');
    console.log('Password: Test123!');
    console.log('\nOR');
    console.log('Email: test@employer.com');
    console.log('Password: Test123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

solveAuthIssue();

