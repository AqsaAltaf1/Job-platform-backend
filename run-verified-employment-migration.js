import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { sequelize } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

async function run() {
  const sqlPath = path.join(__dirname, 'migrations', '040_create_verified_employment.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await sequelize.authenticate();
    await sequelize.query(sql);
    console.log('✅ verified_employments migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();


