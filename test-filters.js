import { EmployerProfile } from './models/index.js';
import { Op } from 'sequelize';

async function testFilters() {
  try {
    console.log('Testing filters queries...');
    
    // Test industries query
    try {
      const industries = await EmployerProfile.findAll({
        attributes: ['industry'],
        where: { 
          industry: { [Op.ne]: null },
          is_active: true 
        },
        group: ['industry'],
        raw: true
      });
      
      console.log('Industries query result:', industries);
      console.log('Industries mapped:', industries.map(i => i.industry).filter(Boolean));
    } catch (industryError) {
      console.error('Error with industries query:', industryError.message);
    }
    
    // Test company sizes query
    try {
      const companySizes = await EmployerProfile.findAll({
        attributes: ['company_size'],
        where: { 
          company_size: { [Op.ne]: null },
          is_active: true 
        },
        group: ['company_size'],
        raw: true
      });
      
      console.log('Company sizes query result:', companySizes);
      console.log('Company sizes mapped:', companySizes.map(c => c.company_size).filter(Boolean));
    } catch (sizeError) {
      console.error('Error with company sizes query:', sizeError.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFilters();
