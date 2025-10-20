import { sequelize } from './models/index.js';
import fs from 'fs';
import path from 'path';

async function runReferenceMigrations() {
  try {
    console.log('🔧 Running Reference table migrations...');
    
    // Read and execute migration files
    const migrationFiles = [
      '038_create_reference_invitations_table.sql',
      '039_create_references_table.sql'
    ];
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join('./migrations', migrationFile);
      console.log(`📄 Running migration: ${migrationFile}`);
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await sequelize.query(statement);
        }
      }
      
      console.log(`✅ Migration ${migrationFile} completed`);
    }
    
    console.log('🎉 All reference migrations completed successfully!');
    
    // Verify tables were created
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%reference%'
      ORDER BY table_name;
    `);
    
    console.log('📋 Reference tables created:');
    results.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

runReferenceMigrations();


