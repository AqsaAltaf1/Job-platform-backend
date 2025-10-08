import { TeamMember } from './models/TeamMember.js';
import { EmployerProfile } from './models/EmployerProfile.js';
import User from './models/User.js';

// Helper function to check if user has permission to manage jobs
const hasJobManagementPermission = async (user, jobEmployerProfileId, requiredPermission = 'can_post_jobs') => {
  console.log(`\n=== TESTING PERMISSION FOR USER: ${user.email} ===`);
  console.log(`User Role: ${user.role}`);
  console.log(`Job Employer Profile ID: ${jobEmployerProfileId}`);
  console.log(`Required Permission: ${requiredPermission}`);
  
  if (user.role === 'employer') {
    console.log('Checking employer permissions...');
    // Primary owners have full access to their company's jobs
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        user_id: user.id,
        id: jobEmployerProfileId 
      }
    });
    console.log(`Employer Profile Found: ${!!employerProfile}`);
    if (employerProfile) {
      console.log(`Employer Profile ID: ${employerProfile.id}`);
    }
    return !!employerProfile;
  } else if (user.role === 'team_member') {
    console.log('Checking team member permissions...');
    const teamMember = await TeamMember.findOne({
      where: { 
        user_id: user.id,
        employer_profile_id: jobEmployerProfileId
      }
    });
    
    console.log(`Team Member Found: ${!!teamMember}`);
    if (teamMember) {
      console.log(`Team Member ID: ${teamMember.id}`);
      console.log(`Team Member Role: ${teamMember.role}`);
      console.log(`Team Member Permissions: ${JSON.stringify(teamMember.permissions)}`);
      console.log(`Is Primary Owner: ${teamMember.role === 'primary_owner'}`);
      console.log(`Has Required Permission: ${teamMember.permissions && teamMember.permissions[requiredPermission]}`);
    }
    
    if (!teamMember) return false;
    
    // Check if user is primary owner of the team or has specific permission
    const hasPermission = (teamMember.role === 'primary_owner') || 
           (teamMember.permissions && teamMember.permissions[requiredPermission]);
    console.log(`Final Permission Result: ${hasPermission}`);
    return hasPermission;
  }
  
  console.log('User role not recognized, denying permission');
  return false;
};

async function testPermissions() {
  try {
    // Get the employer user
    const employerUser = await User.findOne({
      where: { email: 'devtest19977@gmail.com' }
    });
    
    // Get the team member user
    const teamMemberUser = await User.findOne({
      where: { email: 'aqsa.altaf@bitandbytes.net' }
    });
    
    const jobEmployerProfileId = '673d7c7f-05cd-4634-9d14-3b91574299fd';
    
    if (employerUser) {
      console.log('=== TESTING EMPLOYER USER ===');
      const employerPermission = await hasJobManagementPermission(employerUser, jobEmployerProfileId);
      console.log(`Employer Permission Result: ${employerPermission}`);
    }
    
    if (teamMemberUser) {
      console.log('\n=== TESTING TEAM MEMBER USER ===');
      const teamMemberPermission = await hasJobManagementPermission(teamMemberUser, jobEmployerProfileId);
      console.log(`Team Member Permission Result: ${teamMemberPermission}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPermissions();

