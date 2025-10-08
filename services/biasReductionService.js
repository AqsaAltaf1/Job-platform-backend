import OpenAI from 'openai';

class BiasReductionService {
  constructor() {
    // Initialize OpenAI with free tier
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
      // Free tier configuration
      maxRetries: 3,
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Step 1: NLP-powered anonymization
   * Strip names, gendered words, or biased terms from free-text feedback
   */
  async anonymizeText(text) {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      const prompt = `
You are a bias reduction AI assistant. Your task is to anonymize the following text by:

1. Remove or replace personal names with generic terms (e.g., "John" → "the candidate", "Sarah" → "the individual")
2. Remove gendered pronouns and replace with neutral ones (e.g., "he/she" → "they", "his/her" → "their")
3. Remove racial, ethnic, or cultural identifiers
4. Remove age-related terms (e.g., "young", "experienced", "senior")
5. Remove location-based bias (e.g., specific cities, countries unless relevant to work)
6. Keep the core meaning and technical content intact
7. Maintain professional tone

Original text: "${text}"

Return only the anonymized version without any explanations or additional text.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using free tier model
        messages: [
          {
            role: "system",
            content: "You are a professional bias reduction assistant. Always return clean, anonymized text that maintains the original meaning while removing personal identifiers and biased language."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent results
      });

      const anonymizedText = response.choices[0].message.content.trim();
      
      // Log the anonymization for audit purposes
      console.log('Text anonymization:', {
        original: text.substring(0, 100) + '...',
        anonymized: anonymizedText.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      return anonymizedText;

    } catch (error) {
      console.error('Error in text anonymization:', error);
      
      // Fallback: Basic regex-based anonymization if OpenAI fails
      return this.fallbackAnonymization(text);
    }
  }

  /**
   * Fallback anonymization using regex patterns
   * Used when OpenAI API is unavailable
   */
  fallbackAnonymization(text) {
    if (!text) return text;

    let anonymized = text;

    // Remove common names (basic pattern)
    anonymized = anonymized.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'the candidate');
    
    // Replace gendered pronouns
    anonymized = anonymized.replace(/\b(he|him|his)\b/gi, 'they');
    anonymized = anonymized.replace(/\b(she|her|hers)\b/gi, 'they');
    
    // Remove age-related terms
    const ageTerms = ['young', 'old', 'senior', 'junior', 'experienced', 'newbie', 'veteran'];
    ageTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      anonymized = anonymized.replace(regex, '');
    });

    // Remove location bias (keep only if work-related)
    anonymized = anonymized.replace(/\b(from|in|at) [A-Z][a-z]+(?:, [A-Z][a-z]+)?\b/g, '');

    return anonymized.trim();
  }

  /**
   * Step 2: Reviewer consistency checks
   * Detect if one reviewer always scores extreme (too high/low)
   */
  async checkReviewerConsistency(reviewerEmail, endorsements) {
    try {
      const reviewerEndorsements = endorsements.filter(e => e.endorser_email === reviewerEmail);
      
      if (reviewerEndorsements.length < 3) {
        return {
          isConsistent: true,
          message: 'Insufficient data for consistency check',
          score: null
        };
      }

      const ratings = reviewerEndorsements.map(e => e.star_rating);
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - averageRating, 2), 0) / ratings.length;
      const standardDeviation = Math.sqrt(variance);

      // Check for extreme patterns
      const isAlwaysHigh = ratings.every(rating => rating >= 4);
      const isAlwaysLow = ratings.every(rating => rating <= 2);
      const isExtremeVariance = standardDeviation > 1.5; // High variance indicates inconsistency

      let consistencyScore = 100;
      let issues = [];

      if (isAlwaysHigh) {
        consistencyScore -= 30;
        issues.push('Always gives high ratings (4-5 stars)');
      }
      
      if (isAlwaysLow) {
        consistencyScore -= 30;
        issues.push('Always gives low ratings (1-2 stars)');
      }
      
      if (isExtremeVariance) {
        consistencyScore -= 20;
        issues.push('High variance in ratings (inconsistent scoring)');
      }

      // Check for suspicious patterns
      const recentRatings = ratings.slice(-5); // Last 5 ratings
      if (recentRatings.length >= 3) {
        const recentAvg = recentRatings.reduce((sum, r) => sum + r, 0) / recentRatings.length;
        if (Math.abs(recentAvg - averageRating) > 1.5) {
          consistencyScore -= 15;
          issues.push('Recent ratings significantly different from historical average');
        }
      }

      return {
        isConsistent: consistencyScore >= 70,
        consistencyScore: Math.max(0, consistencyScore),
        averageRating: parseFloat(averageRating.toFixed(2)),
        standardDeviation: parseFloat(standardDeviation.toFixed(2)),
        totalReviews: reviewerEndorsements.length,
        issues: issues,
        message: issues.length > 0 ? `Consistency issues: ${issues.join(', ')}` : 'Reviewer shows consistent rating patterns'
      };

    } catch (error) {
      console.error('Error in reviewer consistency check:', error);
      return {
        isConsistent: true,
        message: 'Error in consistency check',
        score: null
      };
    }
  }

  /**
   * Step 2: Sentiment normalization
   * Balance tone and sentiment in endorsement text
   */
  async normalizeSentiment(text) {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      const prompt = `
You are a professional tone normalization assistant. Your task is to:

1. Maintain the core meaning and content
2. Ensure professional, objective tone
3. Remove overly emotional language (too positive or negative)
4. Standardize language to be constructive and balanced
5. Keep technical details and specific examples
6. Make the tone consistent with professional feedback standards

Original text: "${text}"

Return only the normalized version without explanations.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional communication assistant. Always return balanced, constructive, and professional text that maintains objectivity while preserving the original meaning."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.2,
      });

      const normalizedText = response.choices[0].message.content.trim();
      
      console.log('Sentiment normalization:', {
        original: text.substring(0, 100) + '...',
        normalized: normalizedText.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      return normalizedText;

    } catch (error) {
      console.error('Error in sentiment normalization:', error);
      // Return original text if normalization fails
      return text;
    }
  }

  /**
   * Comprehensive bias reduction pipeline
   * Applies all bias reduction techniques to endorsement data
   */
  async processEndorsement(endorsementData) {
    try {
      const processedData = { ...endorsementData };

      // Step 1: Anonymize endorsement text
      if (processedData.endorsement_text) {
        processedData.endorsement_text = await this.anonymizeText(processedData.endorsement_text);
      }

      // Step 2: Normalize sentiment
      if (processedData.endorsement_text) {
        processedData.endorsement_text = await this.normalizeSentiment(processedData.endorsement_text);
      }

      // Add bias reduction metadata
      processedData.bias_reduction_applied = true;
      processedData.bias_reduction_timestamp = new Date().toISOString();

      return processedData;

    } catch (error) {
      console.error('Error in bias reduction pipeline:', error);
      return endorsementData; // Return original data if processing fails
    }
  }

  /**
   * Batch process multiple endorsements
   */
  async processEndorsements(endorsements) {
    const processedEndorsements = [];
    
    for (const endorsement of endorsements) {
      try {
        const processed = await this.processEndorsement(endorsement);
        processedEndorsements.push(processed);
        
        // Add small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error processing endorsement:', error);
        processedEndorsements.push(endorsement); // Keep original if processing fails
      }
    }

    return processedEndorsements;
  }
}

export default new BiasReductionService();
