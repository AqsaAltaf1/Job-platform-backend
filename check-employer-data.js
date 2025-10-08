import { JobApplication, Job, User, CandidateProfile, EmployerProfile } from './models/index.js';
import sequelize from './config/database.js';

async function checkEmployerData() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Check all employer profiles
    const employers = await EmployerProfile.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'role']
      }]
    });
    
    console.log('All employer profiles:');
    employers.forEach((emp, index) => {
      console.log(`${index + 1}. Company: ${emp.company_name}`);
      console.log(`   User: ${emp.user?.first_name} ${emp.user?.last_name} (${emp.user?.email})`);
      console.log(`   User ID: ${emp.user_id}`);
      console.log(`   Profile ID: ${emp.id}`);
      console.log('');
    });
    
    // Check jobs for each employer
    for (const employer of employers) {
      const jobs = await Job.findAll({
        where: { employer_profile_id: employer.id },
        attributes: ['id', 'title', 'status']
      });
      
      console.log(`Jobs for ${employer.company_name}:`);
      jobs.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.title} (Status: ${job.status})`);
      });
      
      // Check applications for this employer's jobs
      const applications = await JobApplication.findAll({
        include: [{
          model: Job,
          as: 'job',
          where: { employer_profile_id: employer.id },
          attributes: ['id', 'title']
        }],
        include: [{
          model: User,
          as: 'candidate',
          attributes: ['first_name', 'last_name', 'email']
        }]
      });
      
      console.log(`Applications for ${employer.company_name}: ${applications.length}`);
      applications.forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.candidate?.first_name} ${app.candidate?.last_name} applied for ${app.job?.title} (Status: ${app.status})`);
      });
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEmployerData();
