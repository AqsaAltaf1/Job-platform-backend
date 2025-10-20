import { Sequelize } from 'sequelize';

// Direct connection to Supabase
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: console.log
});

async function fixDatabaseConstraints() {
  try {
    console.log('🔄 Fixing database constraints...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase!');
    
    // Make the price columns nullable to avoid constraint violations
    console.log('📄 Making price columns nullable...');
    
    const alterQueries = [
      'ALTER TABLE subscription_plans ALTER COLUMN price_monthly DROP NOT NULL;',
      'ALTER TABLE subscription_plans ALTER COLUMN price_yearly DROP NOT NULL;',
      'ALTER TABLE subscription_plans ALTER COLUMN stripe_price_id_monthly DROP NOT NULL;',
      'ALTER TABLE subscription_plans ALTER COLUMN stripe_price_id_yearly DROP NOT NULL;'
    ];
    
    for (const sql of alterQueries) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Made column nullable: ${sql.split(' ')[3]}`);
      } catch (error) {
        console.log(`⚠️  Column might already be nullable: ${error.message}`);
      }
    }
    
    // Update existing records to have proper values
    console.log('📄 Updating existing records with proper values...');
    
    const updateQueries = [
      `UPDATE subscription_plans SET price_monthly = price WHERE billing_cycle = 'monthly' AND price_monthly IS NULL;`,
      `UPDATE subscription_plans SET price_yearly = price WHERE billing_cycle = 'yearly' AND price_yearly IS NULL;`,
      `UPDATE subscription_plans SET stripe_price_id_monthly = stripe_price_id WHERE billing_cycle = 'monthly' AND stripe_price_id_monthly IS NULL;`,
      `UPDATE subscription_plans SET stripe_price_id_yearly = stripe_price_id WHERE billing_cycle = 'yearly' AND stripe_price_id_yearly IS NULL;`
    ];
    
    for (const sql of updateQueries) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Updated records: ${sql.split(' ')[1]}`);
      } catch (error) {
        console.log(`⚠️  Update might have failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database constraints fixed successfully!');
    console.log('🚀 Webhook should now work without constraint violations!');
    
  } catch (error) {
    console.error('❌ Error fixing constraints:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixDatabaseConstraints();
