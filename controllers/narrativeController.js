import { User, Achievement, NarrativeSection } from '../models/index.js';

/**
 * Get all narrative data for a candidate (achievements and sections)
 */
export const getNarrativeData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get achievements
    const achievements = await Achievement.findAll({
      where: { user_id: userId },
      order: [['priority', 'ASC'], ['created_at', 'DESC']]
    });

    // Get narrative sections
    const sections = await NarrativeSection.findAll({
      where: { user_id: userId },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        achievements: achievements.map(achievement => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
          impact: achievement.impact,
          metrics: achievement.metrics,
          date: achievement.date,
          isVisible: achievement.is_visible,
          priority: achievement.priority
        })),
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          isVisible: section.is_visible,
          order: section.order_index
        }))
      }
    });
  } catch (error) {
    console.error('Get narrative data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative data'
    });
  }
};

/**
 * Create or update an achievement
 */
export const saveAchievement = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      title,
      description,
      category,
      impact,
      metrics,
      date,
      isVisible,
      priority
    } = req.body;

    // Validate required fields
    if (!title || !description || !impact) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and impact are required'
      });
    }

    // Validate category
    const validCategories = ['professional', 'academic', 'personal', 'award', 'project'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    let achievement;

    if (id) {
      // Update existing achievement
      achievement = await Achievement.findOne({
        where: { id, user_id: userId }
      });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          error: 'Achievement not found'
        });
      }

      await achievement.update({
        title,
        description,
        category,
        impact,
        metrics: metrics || null,
        date: date || null,
        is_visible: isVisible !== undefined ? isVisible : true,
        priority: priority || 1
      });
    } else {
      // Create new achievement
      achievement = await Achievement.create({
        user_id: userId,
        title,
        description,
        category,
        impact,
        metrics: metrics || null,
        date: date || null,
        is_visible: isVisible !== undefined ? isVisible : true,
        priority: priority || 1
      });
    }

    res.json({
      success: true,
      data: {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        impact: achievement.impact,
        metrics: achievement.metrics,
        date: achievement.date,
        isVisible: achievement.is_visible,
        priority: achievement.priority
      }
    });
  } catch (error) {
    console.error('Save achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save achievement'
    });
  }
};

/**
 * Delete an achievement
 */
export const deleteAchievement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const achievement = await Achievement.findOne({
      where: { id, user_id: userId }
    });

    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    await achievement.destroy();

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete achievement'
    });
  }
};

/**
 * Create or update a narrative section
 */
export const saveNarrativeSection = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      title,
      content,
      isVisible,
      order
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    let section;

    if (id) {
      // Update existing section
      section = await NarrativeSection.findOne({
        where: { id, user_id: userId }
      });

      if (!section) {
        return res.status(404).json({
          success: false,
          error: 'Section not found'
        });
      }

      await section.update({
        title,
        content,
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    } else {
      // Create new section
      section = await NarrativeSection.create({
        user_id: userId,
        title,
        content,
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    }

    res.json({
      success: true,
      data: {
        id: section.id,
        title: section.title,
        content: section.content,
        isVisible: section.is_visible,
        order: section.order_index
      }
    });
  } catch (error) {
    console.error('Save narrative section error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save narrative section'
    });
  }
};

/**
 * Delete a narrative section
 */
export const deleteNarrativeSection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const section = await NarrativeSection.findOne({
      where: { id, user_id: userId }
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    await section.destroy();

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Delete narrative section error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete section'
    });
  }
};
