import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import User from '../models/User.js';
import { Op, Sequelize } from 'sequelize';

// Get comprehensive analytics for employer
export const getEmployerAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId }
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get job IDs for this employer
    const jobIds = await Job.findAll({
      where: { employer_profile_id: employerProfileId },
      attributes: ['id']
    }).then(jobs => jobs.map(job => job.id));

    // Overview metrics
    const totalApplications = await JobApplication.count({
      where: { 
        job_id: { [Op.in]: jobIds },
        created_at: { [Op.gte]: dateFrom }
      }
    });

    const totalHired = await JobApplication.count({
      where: { 
        job_id: { [Op.in]: jobIds },
        status: 'hired',
        created_at: { [Op.gte]: dateFrom }
      }
    });

    const totalJobs = await Job.count({
      where: { 
        employer_profile_id: employerProfileId,
        created_at: { [Op.gte]: dateFrom }
      }
    });

    const activeJobs = await Job.count({
      where: { 
        employer_profile_id: employerProfileId,
        status: 'active'
      }
    });

    const totalJobViews = await Job.sum('views_count', {
      where: { employer_profile_id: employerProfileId }
    }) || 0;

    // Calculate average time to hire
    const hiredApplications = await JobApplication.findAll({
      where: { 
        job_id: { [Op.in]: jobIds },
        status: 'hired',
        created_at: { [Op.gte]: dateFrom }
      },
      attributes: ['created_at', 'updated_at']
    });

    const averageTimeToHire = hiredApplications.length > 0 
      ? Math.round(hiredApplications.reduce((acc, app) => {
          const days = Math.floor((new Date(app.updated_at) - new Date(app.created_at)) / (1000 * 60 * 60 * 24));
          return acc + days;
        }, 0) / hiredApplications.length)
      : 0;

    const conversionRate = totalApplications > 0 
      ? Math.round((totalHired / totalApplications) * 100 * 100) / 100
      : 0;

    // Application trends (daily data for the period)
    const applicationTrends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const applications = await JobApplication.count({
        where: { 
          job_id: { [Op.in]: jobIds },
          created_at: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      const hired = await JobApplication.count({
        where: { 
          job_id: { [Op.in]: jobIds },
          status: 'hired',
          updated_at: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      const rejected = await JobApplication.count({
        where: { 
          job_id: { [Op.in]: jobIds },
          status: 'rejected',
          updated_at: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      applicationTrends.push({
        date: dateStr,
        applications,
        hired,
        rejected
      });
    }

    // Job performance
    const jobPerformance = await Job.findAll({
      where: { 
        employer_profile_id: employerProfileId,
        created_at: { [Op.gte]: dateFrom }
      },
      attributes: [
        'id', 'title', 'views_count', 'applications_count',
        [Sequelize.fn('COUNT', Sequelize.col('applications.id')), 'actualApplications']
      ],
      include: [{
        model: JobApplication,
        as: 'applications',
        attributes: [],
        required: false
      }],
      group: ['Job.id'],
      order: [['applications_count', 'DESC']],
      limit: 10
    });

    const formattedJobPerformance = jobPerformance.map(job => ({
      jobTitle: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
      applications: parseInt(job.dataValues.actualApplications) || 0,
      views: job.views_count || 0,
      conversionRate: job.views_count > 0 
        ? Math.round((parseInt(job.dataValues.actualApplications) / job.views_count) * 100 * 100) / 100
        : 0,
      avgTimeToHire: averageTimeToHire // Simplified for now
    }));

    // Status distribution
    const statusCounts = await JobApplication.findAll({
      where: { 
        job_id: { [Op.in]: jobIds },
        created_at: { [Op.gte]: dateFrom }
      },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    const statusDistribution = statusCounts.map(item => ({
      status: item.status,
      count: parseInt(item.dataValues.count),
      percentage: totalApplications > 0 
        ? Math.round((parseInt(item.dataValues.count) / totalApplications) * 100 * 100) / 100
        : 0
    }));

    // Hiring funnel
    const hiringFunnel = [
      { stage: 'Applications Received', count: totalApplications, percentage: 100 },
      { 
        stage: 'Under Review', 
        count: await JobApplication.count({
          where: { job_id: { [Op.in]: jobIds }, status: 'reviewing' }
        }),
        percentage: 0
      },
      { 
        stage: 'Shortlisted', 
        count: await JobApplication.count({
          where: { job_id: { [Op.in]: jobIds }, status: 'shortlisted' }
        }),
        percentage: 0
      },
      { 
        stage: 'Interview Stage', 
        count: await JobApplication.count({
          where: { job_id: { [Op.in]: jobIds }, status: 'interview' }
        }),
        percentage: 0
      },
      { stage: 'Hired', count: totalHired, percentage: 0 }
    ];

    // Calculate percentages for funnel
    hiringFunnel.forEach(stage => {
      stage.percentage = totalApplications > 0 
        ? Math.round((stage.count / totalApplications) * 100 * 100) / 100
        : 0;
    });

    // Mock data for sources (can be enhanced with real tracking)
    const sourceAnalytics = [
      { source: 'Direct Applications', applications: Math.floor(totalApplications * 0.4), hired: Math.floor(totalHired * 0.3), conversionRate: 12.5 },
      { source: 'Job Boards', applications: Math.floor(totalApplications * 0.3), hired: Math.floor(totalHired * 0.4), conversionRate: 18.2 },
      { source: 'Social Media', applications: Math.floor(totalApplications * 0.2), hired: Math.floor(totalHired * 0.2), conversionRate: 15.8 },
      { source: 'Referrals', applications: Math.floor(totalApplications * 0.1), hired: Math.floor(totalHired * 0.1), conversionRate: 25.0 }
    ];

    // Department stats
    const departmentStats = await Job.findAll({
      where: { employer_profile_id: employerProfileId },
      attributes: [
        'department',
        [Sequelize.fn('COUNT', Sequelize.col('Job.id')), 'openPositions'],
        [Sequelize.fn('SUM', Sequelize.col('applications_count')), 'applications']
      ],
      group: ['department'],
      having: Sequelize.where(Sequelize.col('department'), '!=', null)
    });

    const formattedDepartmentStats = await Promise.all(
      departmentStats.map(async (dept) => {
        const deptJobs = await Job.findAll({
          where: { 
            employer_profile_id: employerProfileId,
            department: dept.department
          },
          attributes: ['id']
        });
        
        const deptJobIds = deptJobs.map(job => job.id);
        const hired = await JobApplication.count({
          where: { 
            job_id: { [Op.in]: deptJobIds },
            status: 'hired'
          }
        });

        return {
          department: dept.department || 'Unspecified',
          openPositions: parseInt(dept.dataValues.openPositions),
          applications: parseInt(dept.dataValues.applications) || 0,
          hired
        };
      })
    );

    // Salary analytics (mock data for now)
    const salaryAnalytics = [
      { range: '$40k - $60k', applications: Math.floor(totalApplications * 0.3), avgTimeToHire: averageTimeToHire + 2 },
      { range: '$60k - $80k', applications: Math.floor(totalApplications * 0.4), avgTimeToHire: averageTimeToHire },
      { range: '$80k - $100k', applications: Math.floor(totalApplications * 0.2), avgTimeToHire: averageTimeToHire - 1 },
      { range: '$100k+', applications: Math.floor(totalApplications * 0.1), avgTimeToHire: averageTimeToHire - 3 }
    ];

    const analytics = {
      overview: {
        totalApplications,
        totalHired,
        averageTimeToHire,
        conversionRate,
        totalJobViews,
        totalJobs,
        activeJobs,
        costPerHire: 2500 // Mock data
      },
      applicationTrends,
      jobPerformance: formattedJobPerformance,
      sourceAnalytics,
      statusDistribution,
      hiringFunnel,
      departmentStats: formattedDepartmentStats,
      salaryAnalytics
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching employer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};
