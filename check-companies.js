import { EmployerProfile, User } from './models/index.js';

async function checkCompanies() {
  try {
    console.log('Checking employer profiles...');
    
    // Check total count
    const totalCount = await EmployerProfile.count();
    console.log('Total employer profiles:', totalCount);
    
    // Check active count
    const activeCount = await EmployerProfile.count({
      where: { is_active: true }
    });
    console.log('Active employer profiles:', activeCount);
    
    // Get all profiles with basic info
    const profiles = await EmployerProfile.findAll({
      attributes: ['id', 'company_name', 'is_active', 'created_at'],
      limit: 10
    });
    
    console.log('Sample profiles:');
    profiles.forEach(profile => {
      console.log({
        id: profile.id,
        company_name: profile.company_name,
        is_active: profile.is_active,
        created_at: profile.created_at
      });
    });
    
    // If no profiles exist, create some test data
    if (totalCount === 0) {
      console.log('No employer profiles found. Creating test data...');
      
      // First, check if we have any users
      const users = await User.findAll({
        where: { role: 'employer' },
        limit: 3
      });
      
      if (users.length === 0) {
        console.log('No employer users found. Please create some employer users first.');
        return;
      }
      
      // Create test employer profiles
      const testProfiles = [
        {
          user_id: users[0].id,
          email: users[0].email,
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'TechCorp Solutions',
          description: 'Leading technology company specializing in innovative solutions.',
          industry: 'Technology',
          company_size: '50-200',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          website: 'https://techcorp.com',
          is_active: true
        },
        {
          user_id: users[1]?.id || users[0].id,
          email: users[1]?.email || users[0].email,
          first_name: 'Jane',
          last_name: 'Smith',
          company_name: 'InnovateLab',
          description: 'Creative agency focused on digital innovation and design.',
          industry: 'Design',
          company_size: '10-50',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          website: 'https://innovatelab.com',
          is_active: true
        }
      ];
      
      for (const profileData of testProfiles) {
        try {
          const profile = await EmployerProfile.create(profileData);
          console.log('Created profile:', profile.company_name);
        } catch (error) {
          console.error('Error creating profile:', error.message);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCompanies();
