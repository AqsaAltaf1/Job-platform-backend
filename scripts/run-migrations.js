import { sequelize } from '../models/index.js';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...');
    
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
    
    console.log('\n🎉 All migrations completed!');
    
  } catch (error) {
    console.error('❌ Error running migrations:', error);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
