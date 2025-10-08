import { PortfolioItem, WorkSample, User } from '../models/index.js';

/**
 * Get all customization data (portfolio items and work samples) for a candidate
 */
export const getCustomizationData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get portfolio items
    const portfolioItems = await PortfolioItem.findAll({
      where: { user_id: userId },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']]
    });

    // Get work samples
    const workSamples = await WorkSample.findAll({
      where: { user_id: userId },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        portfolio: portfolioItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          url: item.url,
          file_url: item.file_url,
          thumbnail_url: item.thumbnail_url,
          technologies: item.technologies || [],
          isVisible: item.is_visible,
          order: item.order_index
        })),
        workSamples: workSamples.map(sample => ({
          id: sample.id,
          title: sample.title,
          description: sample.description,
          type: sample.type,
          url: sample.url,
          file_url: sample.file_url,
          skills_demonstrated: sample.skills_demonstrated || [],
          isVisible: sample.is_visible,
          order: sample.order_index
        }))
      }
    });
  } catch (error) {
    console.error('Get customization data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customization data'
    });
  }
};

/**
 * Create or update a portfolio item
 */
export const savePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      title,
      description,
      type,
      url,
      file_url,
      thumbnail_url,
      technologies,
      isVisible,
      order
    } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and type are required'
      });
    }

    // Validate type
    const validTypes = ['project', 'article', 'video', 'presentation', 'certificate'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type'
      });
    }

    let portfolioItem;
    if (id) {
      // Update existing portfolio item
      portfolioItem = await PortfolioItem.findOne({
        where: { id, user_id: userId }
      });

      if (!portfolioItem) {
        return res.status(404).json({
          success: false,
          error: 'Portfolio item not found'
        });
      }

      await portfolioItem.update({
        title,
        description,
        type,
        url: url || null,
        file_url: file_url || null,
        thumbnail_url: thumbnail_url || null,
        technologies: technologies || [],
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    } else {
      // Create new portfolio item
      portfolioItem = await PortfolioItem.create({
        user_id: userId,
        title,
        description,
        type,
        url: url || null,
        file_url: file_url || null,
        thumbnail_url: thumbnail_url || null,
        technologies: technologies || [],
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    }

    res.json({
      success: true,
      data: {
        id: portfolioItem.id,
        title: portfolioItem.title,
        description: portfolioItem.description,
        type: portfolioItem.type,
        url: portfolioItem.url,
        file_url: portfolioItem.file_url,
        thumbnail_url: portfolioItem.thumbnail_url,
        technologies: portfolioItem.technologies || [],
        isVisible: portfolioItem.is_visible,
        order: portfolioItem.order_index
      }
    });
  } catch (error) {
    console.error('Save portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save portfolio item'
    });
  }
};

/**
 * Delete a portfolio item
 */
export const deletePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const portfolioItem = await PortfolioItem.findOne({
      where: { id, user_id: userId }
    });

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found'
      });
    }

    await portfolioItem.destroy();

    res.json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    console.error('Delete portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio item'
    });
  }
};

/**
 * Create or update a work sample
 */
export const saveWorkSample = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      title,
      description,
      type,
      url,
      file_url,
      skills_demonstrated,
      isVisible,
      order
    } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and type are required'
      });
    }

    // Validate type
    const validTypes = ['writing', 'design', 'code', 'presentation', 'analysis', 'research'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type'
      });
    }

    let workSample;
    if (id) {
      // Update existing work sample
      workSample = await WorkSample.findOne({
        where: { id, user_id: userId }
      });

      if (!workSample) {
        return res.status(404).json({
          success: false,
          error: 'Work sample not found'
        });
      }

      await workSample.update({
        title,
        description,
        type,
        url: url || null,
        file_url: file_url || null,
        skills_demonstrated: skills_demonstrated || [],
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    } else {
      // Create new work sample
      workSample = await WorkSample.create({
        user_id: userId,
        title,
        description,
        type,
        url: url || null,
        file_url: file_url || null,
        skills_demonstrated: skills_demonstrated || [],
        is_visible: isVisible !== undefined ? isVisible : true,
        order_index: order || 1
      });
    }

    res.json({
      success: true,
      data: {
        id: workSample.id,
        title: workSample.title,
        description: workSample.description,
        type: workSample.type,
        url: workSample.url,
        file_url: workSample.file_url,
        skills_demonstrated: workSample.skills_demonstrated || [],
        isVisible: workSample.is_visible,
        order: workSample.order_index
      }
    });
  } catch (error) {
    console.error('Save work sample error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save work sample'
    });
  }
};

/**
 * Delete a work sample
 */
export const deleteWorkSample = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const workSample = await WorkSample.findOne({
      where: { id, user_id: userId }
    });

    if (!workSample) {
      return res.status(404).json({
        success: false,
        error: 'Work sample not found'
      });
    }

    await workSample.destroy();

    res.json({
      success: true,
      message: 'Work sample deleted successfully'
    });
  } catch (error) {
    console.error('Delete work sample error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete work sample'
    });
  }
};
