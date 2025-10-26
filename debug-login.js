import { sequelize } from './models/index.js';
import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function debugLoginIssue() {
  try {
    console.log('🔍 Debugging Login Issue...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Step 1: Check employer details
    console.log('1️⃣ Checking employer details...');
    const employer = await User.findOne({
      where: { 
        email: 'aqsaaltaf2000@gmail.com',
        role: 'employer'
      }
    });
    
    if (employer) {
      console.log(`✅ Employer found: ${employer.first_name} ${employer.last_name}`);
      console.log(`   Email: ${employer.email}`);
      console.log(`   Role: ${employer.role}`);
      console.log(`   Active: ${employer.is_active}`);
      console.log(`   Verified: ${employer.is_verified}`);
      console.log(`   Password hash exists: ${employer.password_hash ? 'Yes' : 'No'}`);
      
      // Test password manually
      const testPassword = 'Test123!';
      console.log(`\n2️⃣ Testing password: ${testPassword}`);
      
      const isValid = await bcrypt.compare(testPassword, employer.password_hash);
      console.log(`   Manual bcrypt test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      // Test using the checkPassword method
      const isValidMethod = await employer.checkPassword(testPassword);
      console.log(`   checkPassword method: ${isValidMethod ? '✅ Valid' : '❌ Invalid'}`);
      
      // Test different passwords
      console.log('\n3️⃣ Testing different passwords...');
      const passwords = ['Test123!', 'test123!', 'Test123', 'test123', 'Password123!'];
      
      for (const pwd of passwords) {
        const isValidPwd = await bcrypt.compare(pwd, employer.password_hash);
        console.log(`   "${pwd}": ${isValidPwd ? '✅ Valid' : '❌ Invalid'}`);
      }
      
    } else {
      console.log('❌ No employer found');
    }
    
    // Step 2: Check all users
    console.log('\n4️⃣ All users in database:');
    const allUsers = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_verified']
    });
    
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`      Role: ${user.role}, Active: ${user.is_active}, Verified: ${user.is_verified}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

debugLoginIssue();
