import { TeamMember } from './models/TeamMember.js';
import { EmployerProfile } from './models/EmployerProfile.js';
import User from './models/User.js';
import Job from './models/Job.js';

async function checkUserPermissions() {
  try {
    console.log('=== DEBUGGING USER PERMISSIONS ===\n');
    
    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'email', 'role', 'first_name', 'last_name']
    });
    
    console.log('=== ALL USERS ===');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Name: ${user.first_name} ${user.last_name}`);
    });
    
    // Get all employer profiles
    const employerProfiles = await EmployerProfile.findAll({
      attributes: ['id', 'user_id', 'company_name', 'is_primary_owner', 'account_role', 'permissions']
    });
    
    console.log('\n=== EMPLOYER PROFILES ===');
    employerProfiles.forEach(profile => {
      console.log(`ID: ${profile.id}, User ID: ${profile.user_id}, Company: ${profile.company_name}, Primary Owner: ${profile.is_primary_owner}, Role: ${profile.account_role}`);
      console.log(`  Permissions: ${JSON.stringify(profile.permissions)}`);
    });
    
    // Get all team members
    const teamMembers = await TeamMember.findAll({
      attributes: ['id', 'user_id', 'employer_profile_id', 'first_name', 'last_name', 'email', 'role', 'permissions', 'is_active']
    });
    
    console.log('\n=== TEAM MEMBERS ===');
    teamMembers.forEach(member => {
      console.log(`ID: ${member.id}, User ID: ${member.user_id}, Employer Profile ID: ${member.employer_profile_id}, Email: ${member.email}, Role: ${member.role}, Active: ${member.is_active}`);
      console.log(`  Permissions: ${JSON.stringify(member.permissions)}`);
    });
    
    // Get all jobs
    const jobs = await Job.findAll({
      attributes: ['id', 'title', 'employer_profile_id', 'posted_by', 'status']
    });
    
    console.log('\n=== ALL JOBS ===');
    jobs.forEach(job => {
      console.log(`ID: ${job.id}, Title: ${job.title}, Employer Profile ID: ${job.employer_profile_id}, Posted By: ${job.posted_by}, Status: ${job.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserPermissions();
