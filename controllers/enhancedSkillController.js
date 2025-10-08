import { EnhancedSkill, SkillEvidence, PeerEndorsement, CandidateProfile, User } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

// Get all enhanced skills for a candidate
export const getCandidateSkills = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const skills = await EnhancedSkill.findAll({
      where: { 
        candidate_profile_id: candidateId,
        is_active: true 
      },
      include: [
        {
          model: SkillEvidence,
          as: 'evidence',
          where: { is_active: true },
          required: false,
        },
        {
          model: PeerEndorsement,
          as: 'endorsements',
          where: { is_active: true },
          required: false,
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(skills);
  } catch (error) {
    console.error('Error fetching candidate skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

// Get detailed information about a specific skill
export const getSkillDetails = async (req, res) => {
  try {
    const { skillId } = req.params;
    
    const skill = await EnhancedSkill.findOne({
      where: { 
        id: skillId,
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }]
        },
        {
          model: SkillEvidence,
          as: 'evidence',
          where: { is_active: true },
          required: false,
        },
        {
          model: PeerEndorsement,
          as: 'endorsements',
          where: { is_active: true },
          required: false,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json(skill);
  } catch (error) {
    console.error('Error fetching skill details:', error);
    res.status(500).json({ error: 'Failed to fetch skill details' });
  }
};

// Create a new enhanced skill
export const createEnhancedSkill = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const skillData = req.body;

    // Verify candidate profile exists
    const candidateProfile = await CandidateProfile.findByPk(candidateId);
    if (!candidateProfile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    const skill = await EnhancedSkill.create({
      id: uuidv4(),
      candidate_profile_id: candidateId,
      ...skillData
    });

    res.status(201).json(skill);
  } catch (error) {
    console.error('Error creating enhanced skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
};

// Update an enhanced skill
export const updateEnhancedSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const updateData = req.body;

    const skill = await EnhancedSkill.findByPk(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await skill.update(updateData);
    res.json(skill);
  } catch (error) {
    console.error('Error updating enhanced skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
};

// Delete an enhanced skill
export const deleteEnhancedSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await EnhancedSkill.findByPk(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await skill.update({ is_active: false });
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting enhanced skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
};

// Add evidence to a skill
export const addSkillEvidence = async (req, res) => {
  try {
    const { skillId } = req.params;
    const evidenceData = req.body;

    const skill = await EnhancedSkill.findByPk(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const evidence = await SkillEvidence.create({
      id: uuidv4(),
      enhanced_skill_id: skillId,
      ...evidenceData
    });

    res.status(201).json(evidence);
  } catch (error) {
    console.error('Error adding skill evidence:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
};

// Update skill evidence
export const updateSkillEvidence = async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const updateData = req.body;

    const evidence = await SkillEvidence.findByPk(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    await evidence.update(updateData);
    res.json(evidence);
  } catch (error) {
    console.error('Error updating skill evidence:', error);
    res.status(500).json({ error: 'Failed to update evidence' });
  }
};

// Delete skill evidence
export const deleteSkillEvidence = async (req, res) => {
  try {
    const { evidenceId } = req.params;

    const evidence = await SkillEvidence.findByPk(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    await evidence.update({ is_active: false });
    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
};

// Add peer endorsement
export const addPeerEndorsement = async (req, res) => {
  try {
    const { skillId } = req.params;
    const endorsementData = req.body;
    const userId = req.user.id; // From authentication middleware

    const skill = await EnhancedSkill.findByPk(skillId, {
      include: [{
        model: CandidateProfile,
        as: 'candidateProfile',
        include: [{
          model: User,
          as: 'user'
        }]
      }]
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Prevent self-endorsements
    if (skill.candidateProfile.user.id === userId) {
      return res.status(400).json({ 
        error: 'You cannot endorse your own skills. Please request endorsements from others.' 
      });
    }

    const endorsement = await PeerEndorsement.create({
      id: uuidv4(),
      enhanced_skill_id: skillId,
      ...endorsementData
    });

    // Calculate and update average rating for the skill
    await updateSkillAverageRating(skillId);

    res.status(201).json(endorsement);
  } catch (error) {
    console.error('Error adding peer endorsement:', error);
    res.status(500).json({ error: 'Failed to add endorsement' });
  }
};

// Update peer endorsement
export const updatePeerEndorsement = async (req, res) => {
  try {
    const { endorsementId } = req.params;
    const updateData = req.body;

    const endorsement = await PeerEndorsement.findByPk(endorsementId);
    if (!endorsement) {
      return res.status(404).json({ error: 'Endorsement not found' });
    }

    await endorsement.update(updateData);
    res.json(endorsement);
  } catch (error) {
    console.error('Error updating peer endorsement:', error);
    res.status(500).json({ error: 'Failed to update endorsement' });
  }
};

// Delete peer endorsement
export const deletePeerEndorsement = async (req, res) => {
  try {
    const { endorsementId } = req.params;

    const endorsement = await PeerEndorsement.findByPk(endorsementId);
    if (!endorsement) {
      return res.status(404).json({ error: 'Endorsement not found' });
    }

    await endorsement.update({ is_active: false });
    res.json({ message: 'Endorsement deleted successfully' });
  } catch (error) {
    console.error('Error deleting peer endorsement:', error);
    res.status(500).json({ error: 'Failed to delete endorsement' });
  }
};

// Helper function to calculate and update average rating for a skill
export const updateSkillAverageRating = async (skillId) => {
  try {
    // Get all active endorsements for this skill
    const endorsements = await PeerEndorsement.findAll({
      where: {
        enhanced_skill_id: skillId,
        is_active: true
      }
    });

    if (endorsements.length === 0) {
      // No endorsements, set skill_rating to null
      await EnhancedSkill.update(
        { skill_rating: null },
        { where: { id: skillId } }
      );
      return;
    }

    // Calculate average rating
    const totalRating = endorsements.reduce((sum, endorsement) => sum + endorsement.star_rating, 0);
    const averageRating = totalRating / endorsements.length;

    // Update the skill with the average rating
    await EnhancedSkill.update(
      { skill_rating: averageRating },
      { where: { id: skillId } }
    );

    console.log(`Updated skill ${skillId} with average rating: ${averageRating.toFixed(2)}`);
  } catch (error) {
    console.error('Error updating skill average rating:', error);
  }
};

// Get endorsements for a specific skill
export const getSkillEndorsements = async (req, res) => {
  try {
    const { skillId } = req.params;
    
    const endorsements = await PeerEndorsement.findAll({
      where: { 
        enhanced_skill_id: skillId 
      },
      order: [['created_at', 'DESC']]
    });

    res.json(endorsements);
  } catch (error) {
    console.error('Error fetching skill endorsements:', error);
    res.status(500).json({ error: 'Failed to fetch endorsements' });
  }
};
