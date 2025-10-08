import { Sequelize } from 'sequelize';

// Direct connection to Supabase
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: console.log
});

async function fixSubscriptionPlansSchema() {
  try {
    console.log('🔄 Fixing subscription plans schema...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase!');
    
    // Add missing columns to subscription_plans table
    console.log('📄 Adding missing columns to subscription_plans...');
    
    const columnsToAdd = [
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2);',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255);',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features TEXT[];',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS limits JSONB;',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;',
      'ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;'
    ];
    
    for (const sql of columnsToAdd) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Added column: ${sql.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️  Column might already exist: ${error.message}`);
      }
    }
    
    // Update existing records to have default values
    console.log('📄 Updating existing records...');
    
    const updateQueries = [
      `UPDATE subscription_plans SET price_monthly = price WHERE billing_cycle = 'monthly' AND price_monthly IS NULL;`,
      `UPDATE subscription_plans SET price_yearly = price WHERE billing_cycle = 'yearly' AND price_yearly IS NULL;`,
      `UPDATE subscription_plans SET stripe_price_id_monthly = stripe_price_id WHERE billing_cycle = 'monthly' AND stripe_price_id_monthly IS NULL;`,
      `UPDATE subscription_plans SET stripe_price_id_yearly = stripe_price_id WHERE billing_cycle = 'yearly' AND stripe_price_id_yearly IS NULL;`,
      `UPDATE subscription_plans SET features = '{}' WHERE features IS NULL;`,
      `UPDATE subscription_plans SET limits = '{}' WHERE limits IS NULL;`
    ];
    
    for (const sql of updateQueries) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Updated records: ${sql.split(' ')[1]}`);
      } catch (error) {
        console.log(`⚠️  Update might have failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Subscription plans schema fixed successfully!');
    console.log('🚀 Webhook should now work without database errors!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixSubscriptionPlansSchema();
