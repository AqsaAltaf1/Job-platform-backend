import { Reference, ReferenceInvitation, User } from './models/index.js';
import { sequelize } from './models/index.js';

async function testReferenceSystem() {
  try {
    console.log('🧪 Testing Reference System...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Test creating a reference invitation
    const testInvitation = await ReferenceInvitation.create({
      candidate_id: 1, // Assuming user ID 1 exists
      reviewer_email: 'test@example.com',
      reviewer_name: 'Test Reviewer',
      token: 'test-token-123',
      message: 'Test reference request',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    
    console.log('✅ Reference invitation created:', testInvitation.id);
    
    // Test creating a reference
    const testReference = await Reference.create({
      candidate_id: 1,
      invitation_id: testInvitation.id,
      reviewer_email: 'test@example.com',
      reviewer_name: 'Test Reviewer',
      relationship: 'former_manager',
      relationship_description: 'Worked together for 2 years',
      overall_rating: 5,
      work_quality_rating: 5,
      communication_rating: 4,
      reliability_rating: 5,
      teamwork_rating: 4,
      reference_text: 'Excellent employee with great skills',
      strengths: 'Hardworking and reliable',
      areas_for_improvement: 'Could improve communication',
      would_recommend: true,
      would_hire_again: true,
      years_worked_together: 2,
      last_worked_together: '2023-01-01',
      status: 'completed'
    });
    
    console.log('✅ Reference created:', testReference.id);
    
    // Clean up test data
    await testReference.destroy();
    await testInvitation.destroy();
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 Reference system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

testReferenceSystem();


