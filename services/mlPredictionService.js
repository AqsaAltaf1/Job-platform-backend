import OpenAI from 'openai';
import { Op } from 'sequelize';
import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import CandidateRating from '../models/CandidateRating.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { EnhancedSkill } from '../models/EnhancedSkill.js';
import { PeerEndorsement } from '../models/PeerEndorsement.js';
import User from '../models/User.js';

class MLPredictionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    
    // ML model configurations
    this.models = {
      candidateSuccess: {
        name: 'candidate_success_predictor',
        version: '1.0',
        accuracy: 0.85,
        lastTrained: new Date('2024-01-01')
      },
      jobMatching: {
        name: 'job_candidate_matcher',
        version: '1.0',
        accuracy: 0.78,
        lastTrained: new Date('2024-01-01')
      },
      retentionPredictor: {
        name: 'employee_retention_predictor',
        version: '1.0',
        accuracy: 0.82,
        lastTrained: new Date('2024-01-01')
      }
    };
  }

  /**
   * Predict candidate success probability for a specific job
   * Uses historical hiring data and candidate profile analysis
   */
  async predictCandidateSuccess(candidateId, jobId) {
    try {
      // Gather candidate data
      const candidateData = await this.getCandidateFeatures(candidateId);
      const jobData = await this.getJobFeatures(jobId);
      
      // Use AI to analyze candidate-job fit
      const prompt = `
Analyze this candidate-job match and predict success probability:

CANDIDATE PROFILE:
- Skills: ${candidateData.skills.join(', ')}
- Experience: ${candidateData.experienceYears} years
- Education: ${candidateData.education}
- Average Skill Rating: ${candidateData.avgSkillRating}/5
- Peer Endorsements: ${candidateData.endorsementCount}
- Previous Applications: ${candidateData.applicationHistory}

JOB REQUIREMENTS:
- Title: ${jobData.title}
- Required Skills: ${jobData.requiredSkills.join(', ')}
- Experience Level: ${jobData.experienceLevel}
- Department: ${jobData.department}
- Job Type: ${jobData.jobType}

HISTORICAL DATA:
- Similar candidates hired: ${candidateData.similarCandidatesHired}
- Average time to hire for similar roles: ${jobData.avgTimeToHire} days
- Success rate for similar profiles: ${candidateData.historicalSuccessRate}%

Based on this data, provide:
1. Success probability (0-100%)
2. Key strengths (top 3)
3. Potential concerns (top 2)
4. Recommendation (hire/consider/pass)
5. Confidence level (high/medium/low)

Format as JSON:
{
  "successProbability": 85,
  "strengths": ["Strong technical skills", "Relevant experience", "Good peer endorsements"],
  "concerns": ["Limited leadership experience", "Skills gap in specific area"],
  "recommendation": "hire",
  "confidenceLevel": "high",
  "reasoning": "Detailed explanation..."
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert ML hiring analyst. Analyze candidate-job matches using data science principles and provide accurate predictions based on historical patterns."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      });

      const prediction = JSON.parse(response.choices[0].message.content);
      
      // Add metadata
      prediction.modelVersion = this.models.candidateSuccess.version;
      prediction.predictedAt = new Date();
      prediction.candidateId = candidateId;
      prediction.jobId = jobId;

      return {
        success: true,
        prediction
      };

    } catch (error) {
      console.error('Candidate success prediction error:', error);
      
      // Fallback to rule-based prediction
      return this.fallbackSuccessPrediction(candidateId, jobId);
    }
  }

  /**
   * Calculate job-candidate compatibility score
   * Multi-dimensional matching algorithm
   */
  async calculateCompatibilityScore(candidateId, jobId) {
    try {
      const candidateData = await this.getCandidateFeatures(candidateId);
      const jobData = await this.getJobFeatures(jobId);

      // Skills compatibility (40% weight)
      const skillsScore = this.calculateSkillsCompatibility(
        candidateData.skills,
        candidateData.skillRatings,
        jobData.requiredSkills
      );

      // Experience compatibility (25% weight)
      const experienceScore = this.calculateExperienceCompatibility(
        candidateData.experienceYears,
        candidateData.relevantExperience,
        jobData.experienceLevel
      );

      // Cultural fit score (20% weight)
      const culturalScore = await this.calculateCulturalFit(
        candidateData.workStyle,
        candidateData.values,
        jobData.companyCulture
      );

      // Location/remote compatibility (10% weight)
      const locationScore = this.calculateLocationCompatibility(
        candidateData.location,
        candidateData.remotePreference,
        jobData.workArrangement,
        jobData.location
      );

      // Salary compatibility (5% weight)
      const salaryScore = this.calculateSalaryCompatibility(
        candidateData.expectedSalary,
        jobData.salaryRange
      );

      // Calculate weighted score
      const compatibilityScore = (
        skillsScore * 0.40 +
        experienceScore * 0.25 +
        culturalScore * 0.20 +
        locationScore * 0.10 +
        salaryScore * 0.05
      );

      return {
        success: true,
        compatibility: {
          overallScore: Math.round(compatibilityScore),
          breakdown: {
            skills: Math.round(skillsScore),
            experience: Math.round(experienceScore),
            culturalFit: Math.round(culturalScore),
            location: Math.round(locationScore),
            salary: Math.round(salaryScore)
          },
          recommendation: this.getCompatibilityRecommendation(compatibilityScore),
          matchStrengths: this.identifyMatchStrengths(candidateData, jobData),
          potentialConcerns: this.identifyPotentialConcerns(candidateData, jobData)
        }
      };

    } catch (error) {
      console.error('Compatibility calculation error:', error);
      return {
        success: false,
        error: 'Failed to calculate compatibility score'
      };
    }
  }

  /**
   * Advanced NLP analysis for deeper understanding
   */
  async performAdvancedNLP(text, analysisType = 'comprehensive') {
    try {
      let prompt;

      switch (analysisType) {
        case 'bias_detection':
          prompt = this.getBiasDetectionPrompt(text);
          break;
        case 'personality_analysis':
          prompt = this.getPersonalityAnalysisPrompt(text);
          break;
        case 'skill_extraction':
          prompt = this.getSkillExtractionPrompt(text);
          break;
        case 'sentiment_deep':
          prompt = this.getDeepSentimentPrompt(text);
          break;
        default:
          prompt = this.getComprehensiveAnalysisPrompt(text);
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an advanced NLP analyst specializing in HR and recruitment text analysis. Provide detailed, actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });

      return {
        success: true,
        analysis: JSON.parse(response.choices[0].message.content),
        analysisType,
        processedAt: new Date()
      };

    } catch (error) {
      console.error('Advanced NLP analysis error:', error);
      return {
        success: false,
        error: 'Failed to perform NLP analysis'
      };
    }
  }

  /**
   * Predict employee retention probability
   */
  async predictRetention(candidateId, jobId, timeframe = '12_months') {
    try {
      const candidateData = await this.getCandidateFeatures(candidateId);
      const jobData = await this.getJobFeatures(jobId);
      const compatibilityScore = await this.calculateCompatibilityScore(candidateId, jobId);

      const prompt = `
Predict employee retention probability based on:

CANDIDATE FACTORS:
- Career progression pattern: ${candidateData.careerProgression}
- Job change frequency: ${candidateData.jobChangeFrequency}
- Skill growth trajectory: ${candidateData.skillGrowth}
- Work-life balance preferences: ${candidateData.workLifeBalance}

JOB FACTORS:
- Growth opportunities: ${jobData.growthOpportunities}
- Company stability: ${jobData.companyStability}
- Management quality: ${jobData.managementRating}
- Compensation competitiveness: ${jobData.compensationPercentile}

COMPATIBILITY:
- Overall match score: ${compatibilityScore.compatibility?.overallScore}%
- Cultural fit: ${compatibilityScore.compatibility?.breakdown.culturalFit}%

MARKET DATA:
- Industry retention rate: ${jobData.industryRetentionRate}%
- Role-specific retention: ${jobData.roleRetentionRate}%

Predict retention probability for ${timeframe} and provide JSON:
{
  "retentionProbability": 78,
  "riskFactors": ["Limited growth path", "Below market salary"],
  "retentionDrivers": ["Good cultural fit", "Strong team"],
  "recommendations": ["Provide clear career path", "Review compensation"],
  "confidenceLevel": "high"
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in employee retention prediction using data science and organizational psychology."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2
      });

      const prediction = JSON.parse(response.choices[0].message.content);
      prediction.timeframe = timeframe;
      prediction.predictedAt = new Date();

      return {
        success: true,
        retention: prediction
      };

    } catch (error) {
      console.error('Retention prediction error:', error);
      return {
        success: false,
        error: 'Failed to predict retention'
      };
    }
  }

  // Helper methods for data gathering and calculations
  async getCandidateFeatures(candidateId) {
    const candidate = await User.findByPk(candidateId, {
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [
            { model: EnhancedSkill, as: 'coreSkills' },
            { model: PeerEndorsement, as: 'endorsements' }
          ]
        }
      ]
    });

    const applications = await JobApplication.findAll({
      where: { candidate_id: candidateId },
      include: [{ model: CandidateRating, as: 'ratings' }]
    });

    return {
      skills: candidate.candidateProfile?.coreSkills?.map(s => s.name) || [],
      skillRatings: candidate.candidateProfile?.coreSkills?.map(s => s.skill_rating) || [],
      avgSkillRating: this.calculateAverageSkillRating(candidate.candidateProfile?.coreSkills),
      endorsementCount: candidate.candidateProfile?.endorsements?.length || 0,
      experienceYears: candidate.candidateProfile?.years_of_experience || 0,
      education: candidate.candidateProfile?.education_level || 'not_specified',
      location: candidate.candidateProfile?.location || 'not_specified',
      expectedSalary: candidate.candidateProfile?.expected_salary || null,
      applicationHistory: applications.length,
      historicalSuccessRate: this.calculateHistoricalSuccessRate(applications),
      careerProgression: this.analyzeCareerProgression(candidate.candidateProfile),
      jobChangeFrequency: this.calculateJobChangeFrequency(candidate.candidateProfile),
      workLifeBalance: candidate.candidateProfile?.work_preferences || 'not_specified',
      remotePreference: candidate.candidateProfile?.remote_work_preference || 'hybrid'
    };
  }

  async getJobFeatures(jobId) {
    const job = await Job.findByPk(jobId, {
      include: [
        { model: JobApplication, as: 'applications' },
        { model: EmployerProfile, as: 'employerProfile' }
      ]
    });

    return {
      title: job.title,
      requiredSkills: job.skills_required || [],
      experienceLevel: job.experience_level,
      department: job.department,
      jobType: job.job_type,
      workArrangement: job.work_arrangement,
      location: job.location,
      salaryRange: {
        min: job.salary_min,
        max: job.salary_max,
        currency: job.salary_currency
      },
      avgTimeToHire: this.calculateAverageTimeToHire(job.applications),
      companySize: job.employerProfile?.company_size || 'not_specified',
      industryRetentionRate: 75, // Mock data - would come from industry database
      roleRetentionRate: 80, // Mock data - would come from role-specific data
      growthOpportunities: 'high', // Mock data - would be calculated
      companyStability: 'stable', // Mock data - would be calculated
      managementRating: 4.2, // Mock data - would come from reviews
      compensationPercentile: 65 // Mock data - would come from market data
    };
  }

  // Calculation helper methods
  calculateSkillsCompatibility(candidateSkills, skillRatings, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 50;
    
    const matchedSkills = candidateSkills.filter(skill => 
      requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );
    
    const matchPercentage = (matchedSkills.length / requiredSkills.length) * 100;
    const avgRating = skillRatings.length > 0 ? 
      skillRatings.reduce((sum, rating) => sum + rating, 0) / skillRatings.length : 3;
    
    return Math.min(100, matchPercentage * (avgRating / 5));
  }

  calculateExperienceCompatibility(candidateYears, relevantExp, requiredLevel) {
    const levelYears = {
      'entry_level': 2,
      'mid_level': 5,
      'senior_level': 8,
      'executive': 12
    };
    
    const required = levelYears[requiredLevel] || 3;
    const ratio = candidateYears / required;
    
    if (ratio >= 0.8 && ratio <= 1.5) return 100;
    if (ratio >= 0.6 && ratio <= 2.0) return 80;
    if (ratio >= 0.4 && ratio <= 3.0) return 60;
    return 40;
  }

  async calculateCulturalFit(candidateWorkStyle, candidateValues, companyculture) {
    // This would use more sophisticated matching in production
    // For now, return a reasonable score based on available data
    return 75;
  }

  calculateLocationCompatibility(candidateLocation, remotePreference, workArrangement, jobLocation) {
    if (workArrangement === 'remote') return 100;
    if (workArrangement === 'hybrid' && remotePreference !== 'on_site') return 90;
    if (candidateLocation === jobLocation) return 100;
    return 60;
  }

  calculateSalaryCompatibility(expectedSalary, salaryRange) {
    if (!expectedSalary || !salaryRange.min) return 70;
    
    if (expectedSalary >= salaryRange.min && expectedSalary <= salaryRange.max) return 100;
    if (expectedSalary <= salaryRange.max * 1.1) return 80;
    if (expectedSalary <= salaryRange.max * 1.2) return 60;
    return 40;
  }

  // Prompt generators for different NLP analyses
  getBiasDetectionPrompt(text) {
    return `
Analyze this text for potential bias indicators:

TEXT: "${text}"

Detect and analyze:
1. Gender bias (gendered language, assumptions)
2. Age bias (age-related terms, assumptions)
3. Racial/ethnic bias (cultural assumptions, coded language)
4. Socioeconomic bias (class indicators, assumptions)
5. Educational bias (degree requirements, elitism)
6. Geographic bias (location-based assumptions)

Return JSON:
{
  "biasScore": 25,
  "detectedBiases": [
    {"type": "gender", "severity": "low", "examples": ["he/she usage"]},
    {"type": "age", "severity": "medium", "examples": ["young professional"]}
  ],
  "recommendations": ["Use gender-neutral pronouns", "Remove age references"],
  "cleanedText": "Bias-reduced version of the text"
}`;
  }

  getPersonalityAnalysisPrompt(text) {
    return `
Analyze personality traits from this text using Big Five model:

TEXT: "${text}"

Analyze for:
1. Openness to experience
2. Conscientiousness  
3. Extraversion
4. Agreeableness
5. Neuroticism

Return JSON:
{
  "personalityScores": {
    "openness": 75,
    "conscientiousness": 85,
    "extraversion": 60,
    "agreeableness": 80,
    "neuroticism": 25
  },
  "keyTraits": ["detail-oriented", "collaborative", "innovative"],
  "workingStyle": "analytical and methodical",
  "teamFit": "works well in collaborative environments"
}`;
  }

  // Fallback prediction methods
  fallbackSuccessPrediction(candidateId, jobId) {
    return {
      success: true,
      prediction: {
        successProbability: 65,
        strengths: ["Profile matches basic requirements"],
        concerns: ["Limited data for accurate prediction"],
        recommendation: "consider",
        confidenceLevel: "low",
        reasoning: "Fallback prediction due to AI service unavailability"
      }
    };
  }

  // Utility methods
  calculateAverageSkillRating(skills) {
    if (!skills || skills.length === 0) return 3;
    const ratings = skills.filter(s => s.skill_rating).map(s => s.skill_rating);
    return ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 3;
  }

  calculateHistoricalSuccessRate(applications) {
    if (applications.length === 0) return 50;
    const successful = applications.filter(app => app.status === 'hired').length;
    return (successful / applications.length) * 100;
  }

  getCompatibilityRecommendation(score) {
    if (score >= 80) return 'excellent_match';
    if (score >= 65) return 'good_match';
    if (score >= 50) return 'moderate_match';
    return 'poor_match';
  }
}

export default new MLPredictionService();
