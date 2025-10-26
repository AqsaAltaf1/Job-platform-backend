import { sequelize } from './models/index.js';
import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function checkUsersAndTestLogin() {
  try {
    console.log('🔍 Checking users and testing login...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Get all users
    console.log('1️⃣ All users in database:');
    const allUsers = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'password']
    });
    
    console.log(`   Total users: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`      Role: ${user.role}, Active: ${user.is_active}`);
      console.log(`      Password hash: ${user.password ? 'SET' : 'NOT SET'}`);
    });
    
    // Test login for employer
    console.log('\n2️⃣ Testing employer login:');
    const employer = await User.findOne({
      where: { 
        email: 'aqsaaltaf2000@gmail.com',
        role: 'employer'
      }
    });
    
    if (employer) {
      console.log(`   Found employer: ${employer.first_name} ${employer.last_name}`);
      console.log(`   Password hash exists: ${employer.password ? 'Yes' : 'No'}`);
      
      // Test password
      const testPasswords = ['password123', 'Test123!', 'aqsa123', '123456', 'password'];
      for (const testPassword of testPasswords) {
        if (employer.password) {
          const isValid = await bcrypt.compare(testPassword, employer.password);
          if (isValid) {
            console.log(`   ✅ Password found: "${testPassword}"`);
            break;
          }
        }
      }
    } else {
      console.log('   ❌ No employer found with email aqsaaltaf2000@gmail.com');
    }
    
    // Create a test employer if none exists
    console.log('\n3️⃣ Creating test employer if needed:');
    const existingEmployer = await User.findOne({
      where: { email: 'testemployer@example.com' }
    });
    
    if (!existingEmployer) {
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      const newEmployer = await User.create({
        email: 'testemployer@example.com',
        password: hashedPassword,
        first_name: 'Test',
        last_name: 'Employer',
        role: 'employer',
        is_active: true
      });
      console.log(`   ✅ Created test employer: ${newEmployer.email}`);
      console.log(`   Password: Test123!`);
    } else {
      console.log(`   ℹ️  Test employer already exists: ${existingEmployer.email}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsersAndTestLogin();
