const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'technical',
      'soft',
      'language',
      'design',
      'marketing',
      'business',
      'science',
      'engineering',
      'healthcare',
      'legal',
      'education',
      'hospitality',
      'other'
    ],
    index: true
  },
  subCategory: String,
  description: String,
  aliases: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  relatedSkills: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    relationship: {
      type: String,
      enum: ['prerequisite', 'complementary', 'similar']
    },
    weight: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }],
  industry: [String],
  popularity: {
    type: Number,
    default: 0,
    index: true
  },
  trending: {
    type: Number,
    default: 0
  },
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very-high'],
    default: 'medium'
  },
  metadata: {
    icon: String,
    color: String,
    keywords: [String],
    certifications: [String],
    courses: [String],
    resources: [{
      title: String,
      url: String,
      type: {
        type: String,
        enum: ['article', 'video', 'course', 'book', 'other']
      }
    }]
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for search
skillSchema.index({ 
  name: 'text', 
  displayName: 'text', 
  aliases: 'text',
  'metadata.keywords': 'text' 
});

// Update timestamp
skillSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Before save, ensure displayName
skillSchema.pre('save', function(next) {
  if (!this.displayName) {
    this.displayName = this.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  next();
});

// Find by alias
skillSchema.statics.findByAlias = function(alias) {
  return this.findOne({
    $or: [
      { name: alias.toLowerCase() },
      { aliases: alias.toLowerCase() }
    ],
    isActive: true
  });
};

// Search skills
skillSchema.statics.search = function(query, options = {}) {
  const { limit = 20, category, minPopularity } = options;
  
  const searchQuery = {
    $text: { $search: query },
    isActive: true
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  if (minPopularity) {
    searchQuery.popularity = { $gte: minPopularity };
  }
  
  return this.find(searchQuery)
    .select('name displayName category popularity trending')
    .limit(limit)
    .sort({ popularity: -1, trending: -1 });
};

// Get popular skills
skillSchema.statics.getPopular = function(limit = 50, category = null) {
  const query = { isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .select('name displayName category popularity')
    .limit(limit)
    .sort({ popularity: -1, trending: -1 });
};

// Increment popularity
skillSchema.methods.incrementPopularity = function(increment = 1) {
  this.popularity += increment;
  return this.save();
};

// Update trending score
skillSchema.methods.updateTrending = function() {
  // Simple trending algorithm - can be enhanced
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  this.trending = this.popularity / Math.max(1, Math.log(hoursSinceCreation + 1));
  return this.save();
};

// Add related skill
skillSchema.methods.addRelatedSkill = function(skillId, relationship, weight = 0.5) {
  if (!this.relatedSkills.some(r => r.skill.toString() === skillId.toString())) {
    this.relatedSkills.push({
      skill: skillId,
      relationship,
      weight
    });
  }
  return this.save();
};

// Get suggested skills based on this skill
skillSchema.methods.getSuggestions = async function(limit = 10) {
  const Skill = this.constructor;
  
  // First get directly related skills
  const relatedIds = this.relatedSkills.map(r => r.skill);
  
  // Then find skills in same category that are popular
  const suggestions = await Skill.find({
    _id: { $ne: this._id, $nin: relatedIds },
    category: this.category,
    isActive: true
  })
  .select('name displayName category popularity trending')
  .limit(limit)
  .sort({ popularity: -1, trending: -1 });
  
  return suggestions;
};

module.exports = mongoose.model('Skill', skillSchema);