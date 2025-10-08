import { TeamMember } from './models/TeamMember.js';
import { EmployerProfile } from './models/EmployerProfile.js';
import User from './models/User.js';

// Updated permission function (same as in controller)
const hasJobManagementPermission = async (user, jobEmployerProfileId, requiredPermission = 'can_post_jobs') => {
  console.log(`\n=== TESTING NEW PERMISSION LOGIC ===`);
  console.log(`User: ${user.email} (${user.role})`);
  console.log(`Job Employer Profile ID: ${jobEmployerProfileId}`);
  console.log(`Required Permission: ${requiredPermission}`);
  
  if (user.role === 'employer') {
    console.log('✅ Checking EMPLOYER permissions...');
    // Employers (company owners) have full access to ALL jobs in their company
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        user_id: user.id
      }
    });
    
    console.log(`Employer Profile Found: ${!!employerProfile}`);
    if (employerProfile) {
      console.log(`Employer's Company ID: ${employerProfile.id}`);
      console.log(`Job's Company ID: ${jobEmployerProfileId}`);
      console.log(`Company Match: ${employerProfile.id === jobEmployerProfileId}`);
    }
    
    if (!employerProfile) return false;
    
    // Check if this job belongs to the employer's company
    const hasPermission = employerProfile.id === jobEmployerProfileId;
    console.log(`Final EMPLOYER Permission: ${hasPermission}`);
    return hasPermission;
    
  } else if (user.role === 'team_member') {
    console.log('✅ Checking TEAM MEMBER permissions...');
    // Team members need specific permissions for the job's company
    const teamMember = await TeamMember.findOne({
      where: { 
        user_id: user.id,
        employer_profile_id: jobEmployerProfileId,
        is_active: true
      }
    });
    
    console.log(`Team Member Found: ${!!teamMember}`);
    if (teamMember) {
      console.log(`Team Member Role: ${teamMember.role}`);
      console.log(`Team Member Active: ${teamMember.is_active}`);
      console.log(`Team Member Permissions: ${JSON.stringify(teamMember.permissions)}`);
      console.log(`Is Primary Owner: ${teamMember.role === 'primary_owner'}`);
      console.log(`Has Required Permission: ${teamMember.permissions && teamMember.permissions[requiredPermission]}`);
    }
    
    if (!teamMember) return false;
    
    // Check if user is primary owner of the team or has specific permission
    const hasPermission = (teamMember.role === 'primary_owner') || 
           (teamMember.permissions && teamMember.permissions[requiredPermission]);
    console.log(`Final TEAM MEMBER Permission: ${hasPermission}`);
    return hasPermission;
  }
  
  console.log('❌ User role not recognized');
  return false;
};

async function testNewPermissions() {
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
      console.log('\n🏢 TESTING EMPLOYER (Company Owner):');
      const employerPermission = await hasJobManagementPermission(employerUser, jobEmployerProfileId);
      console.log(`\n🎯 EMPLOYER FINAL RESULT: ${employerPermission ? '✅ CAN EDIT' : '❌ CANNOT EDIT'}`);
    }
    
    if (teamMemberUser) {
      console.log('\n👥 TESTING TEAM MEMBER:');
      const teamMemberPermission = await hasJobManagementPermission(teamMemberUser, jobEmployerProfileId);
      console.log(`\n🎯 TEAM MEMBER FINAL RESULT: ${teamMemberPermission ? '✅ CAN EDIT' : '❌ CANNOT EDIT'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNewPermissions();

