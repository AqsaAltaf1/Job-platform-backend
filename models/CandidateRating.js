import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CandidateRating = sequelize.define('CandidateRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  application_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'job_applications',
      key: 'id'
    }
  },
  rater_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  interview_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'interviews',
      key: 'id'
    }
  },
  // Technical Skills (1-10)
  technical_skills: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  technical_skills_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Communication Skills (1-10)
  communication_skills: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  communication_skills_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Problem Solving (1-10)
  problem_solving: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  problem_solving_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Cultural Fit (1-10)
  cultural_fit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  cultural_fit_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Experience & Qualifications (1-10)
  experience_qualifications: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  experience_qualifications_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Leadership Potential (1-10)
  leadership_potential: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  leadership_potential_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Overall Rating (calculated average)
  overall_rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  // Overall Comments
  overall_comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Recommendation
  recommendation: {
    type: DataTypes.ENUM('strongly_recommend', 'recommend', 'neutral', 'do_not_recommend'),
    allowNull: true
  },
  // Rating Type
  rating_type: {
    type: DataTypes.ENUM('resume_review', 'phone_screen', 'technical_interview', 'behavioral_interview', 'final_interview'),
    allowNull: false,
    defaultValue: 'resume_review'
  },
  // Custom Criteria (JSON for flexible additional criteria)
  custom_criteria: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  // Status
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved'),
    allowNull: false,
    defaultValue: 'draft'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'candidate_ratings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['application_id']
    },
    {
      fields: ['rater_id']
    },
    {
      fields: ['interview_id']
    },
    {
      fields: ['rating_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeSave: async (rating) => {
      // Calculate overall rating as average of all criteria
      const criteria = [
        rating.technical_skills,
        rating.communication_skills,
        rating.problem_solving,
        rating.cultural_fit,
        rating.experience_qualifications,
        rating.leadership_potential
      ].filter(score => score !== null && score !== undefined);
      
      if (criteria.length > 0) {
        const sum = criteria.reduce((acc, score) => acc + score, 0);
        rating.overall_rating = (sum / criteria.length).toFixed(2);
      }
    }
  }
});

export default CandidateRating;
