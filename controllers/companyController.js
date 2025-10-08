import { EmployerProfile, User, Job } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all companies with their basic information
 */
export const getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, industry, location, company_size } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = {
      is_active: true
    };

    // Search filter
    if (search) {
      whereConditions[Op.or] = [
        { company_name: { [Op.iLike]: `%${search}%` } },
        { company_description: { [Op.iLike]: `%${search}%` } },
        { company_industry: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Industry filter
    if (industry) {
      whereConditions.company_industry = industry;
    }

    // Location filter
    if (location) {
      whereConditions[Op.or] = [
        ...(whereConditions[Op.or] || []),
        { company_location: { [Op.iLike]: `%${location}%` } },
        { headquarters_location: { [Op.iLike]: `%${location}%` } }
      ];
    }

    // Company size filter
    if (company_size) {
      whereConditions.company_size = company_size;
    }

    const companies = await EmployerProfile.findAndCountAll({
      where: whereConditions,
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // Get unique industries for filters
    const industries = await EmployerProfile.findAll({
      attributes: ['company_industry'],
      where: { 
        company_industry: { [Op.ne]: null },
        is_active: true 
      },
      group: ['company_industry'],
      raw: true
    });

    // Get unique company sizes for filters
    const companySizes = await EmployerProfile.findAll({
      attributes: ['company_size'],
      where: { 
        company_size: { [Op.ne]: null },
        is_active: true 
      },
      group: ['company_size'],
      raw: true
    });

    res.json({
      success: true,
      companies: companies.rows.map(company => ({
        ...company.toJSON(),
        active_jobs_count: company.jobs?.length || 0,
        location: company.company_location || company.headquarters_location || 'Location not specified',
        description: company.company_description,
        industry: company.company_industry,
        website: company.company_website
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(companies.count / limit),
        total_companies: companies.count,
        per_page: parseInt(limit)
      },
      filters: {
        industries: industries.map(i => i.company_industry).filter(Boolean),
        company_sizes: companySizes.map(c => c.company_size).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies'
    });
  }
};

/**
 * Get a single company by ID with detailed information
 */
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await EmployerProfile.findOne({
      where: { 
        id: id,
        is_active: true 
      },
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
          attributes: [
            'id', 'title', 'description', 'location', 'job_type', 
            'experience_level', 'salary_min', 'salary_max', 'salary_currency',
            'skills_required', 'application_deadline', 'created_at'
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Get company statistics
    const totalJobs = await Job.count({
      where: { 
        employer_profile_id: company.id,
        status: 'active' 
      }
    });

    const recentJobs = await Job.count({
      where: { 
        employer_profile_id: company.id,
        status: 'active',
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    res.json({
      success: true,
      company: {
        ...company.toJSON(),
        active_jobs_count: company.jobs?.length || 0,
        total_jobs_count: totalJobs,
        recent_jobs_count: recentJobs,
        location: `${company.city || ''}${company.city && company.state ? ', ' : ''}${company.state || ''}${(company.city || company.state) && company.country ? ', ' : ''}${company.country || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location not specified',
        jobs: company.jobs || []
      }
    });

  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company details'
    });
  }
};

/**
 * Get company statistics
 */
export const getCompanyStats = async (req, res) => {
  try {
    const totalCompanies = await EmployerProfile.count({
      where: { is_active: true }
    });

    const companiesWithJobs = await EmployerProfile.count({
      where: { is_active: true },
      include: [{
        model: Job,
        as: 'jobs',
        where: { status: 'active' },
        required: true
      }]
    });

    const topIndustries = await EmployerProfile.findAll({
      attributes: [
        'industry',
        [EmployerProfile.sequelize.fn('COUNT', EmployerProfile.sequelize.col('industry')), 'count']
      ],
      where: { 
        industry: { [Op.ne]: null },
        is_active: true 
      },
      group: ['industry'],
      order: [[EmployerProfile.sequelize.fn('COUNT', EmployerProfile.sequelize.col('industry')), 'DESC']],
      limit: 10,
      raw: true
    });

    res.json({
      success: true,
      stats: {
        total_companies: totalCompanies,
        companies_with_jobs: companiesWithJobs,
        top_industries: topIndustries
      }
    });

  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company statistics'
    });
  }
};
