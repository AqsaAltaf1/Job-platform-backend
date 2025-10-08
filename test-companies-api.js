import { EmployerProfile, User, Job } from './models/index.js';

async function testCompaniesAPI() {
  try {
    console.log('Testing companies API query...');
    
    // Test simple query first
    const simpleQuery = await EmployerProfile.findAll({
      where: { is_active: true },
      attributes: ['id', 'company_name', 'is_active', 'created_at'],
      limit: 5
    });
    
    console.log('Simple query result:', simpleQuery.length, 'companies');
    simpleQuery.forEach(company => {
      console.log('-', company.company_name, '(active:', company.is_active, ')');
    });
    
    // Test with User include
    const withUserQuery = await EmployerProfile.findAll({
      where: { is_active: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'created_at']
        }
      ],
      limit: 5
    });
    
    console.log('With User include result:', withUserQuery.length, 'companies');
    
    // Test with Job include
    try {
      const withJobQuery = await EmployerProfile.findAll({
        where: { is_active: true },
        include: [
          {
            model: Job,
            as: 'jobs',
            where: { status: 'active' },
            required: false,
            attributes: ['id', 'title', 'created_at']
          }
        ],
        limit: 5,
        distinct: true
      });
      
      console.log('With Job include result:', withJobQuery.length, 'companies');
    } catch (jobError) {
      console.error('Error with Job include:', jobError.message);
    }
    
    // Test the full query from the controller
    try {
      const fullQuery = await EmployerProfile.findAndCountAll({
        where: { is_active: true },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'created_at']
          },
          {
            model: Job,
            as: 'jobs',
            where: { status: 'active' },
            required: false,
            attributes: ['id', 'title', 'created_at']
          }
        ],
        limit: 12,
        offset: 0,
        order: [['created_at', 'DESC']],
        distinct: true
      });
      
      console.log('Full query result:', fullQuery.count, 'total,', fullQuery.rows.length, 'returned');
    } catch (fullError) {
      console.error('Error with full query:', fullError.message);
      console.error('Stack:', fullError.stack);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCompaniesAPI();
