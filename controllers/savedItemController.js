const SavedItem = require('../models/SavedItem');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Company = require('../models/Company');

// @desc    Get user's saved items
// @route   GET /api/saved
// @access  Private
exports.getSavedItems = async (req, res) => {
  try {
    const { itemType, page = 1, limit = 10 } = req.query;
    
    let query = { user: req.user.id };
    if (itemType) query.itemType = itemType;
    
    const savedItems = await SavedItem.find(query)
      .populate({
        path: 'item',
        populate: {
          path: 'company',
          select: 'name logo'
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await SavedItem.countDocuments(query);
    
    res.json({
      success: true,
      data: savedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching saved items',
      error: error.message
    });
  }
};

// @desc    Save item
// @route   POST /api/saved
// @access  Private
exports.saveItem = async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    
    // Check if item exists
    let item;
    switch (itemType) {
      case 'Job':
        item = await Job.findById(itemId);
        break;
      case 'Internship':
        item = await Internship.findById(itemId);
        break;
      case 'Company':
        item = await Company.findById(itemId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid item type'
        });
    }
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Check if already saved
    const existing = await SavedItem.findOne({
      user: req.user.id,
      item: itemId,
      itemType
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Item already saved'
      });
    }
    
    const savedItem = await SavedItem.create({
      user: req.user.id,
      item: itemId,
      itemType
    });
    
    res.status(201).json({
      success: true,
      message: 'Item saved successfully',
      data: savedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving item',
      error: error.message
    });
  }
};

// @desc    Remove saved item
// @route   DELETE /api/saved/:id
// @access  Private
exports.removeSavedItem = async (req, res) => {
  try {
    const savedItem = await SavedItem.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!savedItem) {
      return res.status(404).json({
        success: false,
        message: 'Saved item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item removed from saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing saved item',
      error: error.message
    });
  }
};

// @desc    Check if item is saved
// @route   GET /api/saved/check/:itemId
// @access  Private
exports.checkSaved = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { itemType } = req.query;
    
    const saved = await SavedItem.findOne({
      user: req.user.id,
      item: itemId,
      itemType
    });
    
    res.json({
      success: true,
      data: {
        isSaved: !!saved,
        savedId: saved?._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking saved status',
      error: error.message
    });
  }
};

// @desc    Clear all saved items
// @route   DELETE /api/saved/clear-all
// @access  Private
exports.clearAllSaved = async (req, res) => {
  try {
    await SavedItem.deleteMany({ user: req.user.id });
    
    res.json({
      success: true,
      message: 'All saved items cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing saved items',
      error: error.message
    });
  }
};