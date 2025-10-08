import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Define tables in order of deletion (child tables first, parent tables last)
    const tablesToDelete = [
      // Child tables first
      'job_applications',
      'saved_jobs', 
      'interviews',
      'candidate_ratings',
      'peer_endorsements',
      'skill_evidences',
      'enhanced_skills',
      'projects',
      'experiences',
      'educations',
      'team_members',
      'reviewer_invitations',
      'subscription_history',
      'subscriptions',
      'jobs',
      'candidate_profiles',
      'employer_profiles',
      'bias_reduction_logs',
      'bias_reduction_metrics',
      'reviewer_consistency_analytics',
      'otps',
      'admins',
      'users'
    ];
    
    console.log(`Clearing ${tablesToDelete.length} tables in order...`);
    
    // Clear tables in order
    for (const tableName of tablesToDelete) {
      try {
        console.log(`Clearing table: ${tableName}`);
        await sequelize.query(`DELETE FROM "${tableName}";`, { type: QueryTypes.RAW });
        console.log(`✅ Cleared ${tableName}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Table ${tableName} does not exist, skipping...`);
        } else {
          console.log(`⚠️  Error clearing ${tableName}: ${error.message}`);
        }
      }
    }
    
    // Reset sequences for tables with auto-increment IDs
    const sequenceTables = [
      'users', 'candidate_profiles', 'employer_profiles', 'jobs', 
      'job_applications', 'subscriptions', 'subscription_plans'
    ];
    
    for (const tableName of sequenceTables) {
      try {
        await sequelize.query(`ALTER SEQUENCE IF EXISTS "${tableName}_id_seq" RESTART WITH 1;`, { type: QueryTypes.RAW });
        console.log(`✅ Reset sequence for ${tableName}`);
      } catch (error) {
        // Ignore errors for tables that don't have sequences
      }
    }
    
    console.log('✅ Database cleared successfully!');
    console.log('All data has been removed while preserving table structure.');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup
clearDatabase()
  .then(() => {
    console.log('Database cleanup completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  });
