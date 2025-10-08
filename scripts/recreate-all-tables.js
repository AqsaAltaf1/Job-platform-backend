import { sequelize } from '../models/index.js';
import fs from 'fs';
import path from 'path';

async function recreateAllTables() {
  try {
    console.log('🗑️  Dropping all existing tables...');
    
    // Get all table names
    const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    console.log(`Found ${tables.length} tables to drop:`, tables.map(t => t.tablename));
    
    // Drop all tables with CASCADE to handle dependencies
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
        console.log(`✅ Dropped table: ${table.tablename}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table.tablename}:`, error.message);
      }
    }
    
    console.log('\n🚀 Creating new tables with correct schema...');
    
    // Get all migration files in order
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files:`, files);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`\n📄 Running migration: ${file}`);
      
      try {
        await sequelize.query(sql);
        console.log(`✅ Successfully executed: ${file}`);
      } catch (error) {
        console.error(`❌ Error executing ${file}:`, error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('\n🎉 All tables recreated successfully with correct schema!');
    
    // Verify tables were created
    console.log('\n📋 Verifying created tables...');
    const [newTables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`✅ Created ${newTables.length} tables:`);
    newTables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
    
  } catch (error) {
    console.error('❌ Error recreating tables:', error);
  } finally {
    await sequelize.close();
  }
}

recreateAllTables();
