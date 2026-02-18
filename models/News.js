const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  summary: {
    type: String,
    required: [true, 'News summary is required'],
    maxlength: [500, 'Summary cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'News content is required'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Company News',
      'Industry Updates',
      'Product Launch',
      'Events',
      'Announcements',
      'Press Release',
      'Blog Post',
      'Case Study',
      'Whitepaper',
      'Research',
      'Community',
      'Other'
    ]
  },
  tags: [{
    type: String,
    trim: true
  }],
  coverImage: {
    url: String,
    publicId: String,
    alt: String,
    caption: String
  },
  images: [{
    url: String,
    publicId: String,
    alt: String,
    caption: String
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > Date.now();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: {
      type: Number,
      default: 0
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  commentCount: {
    type: Number,
    default: 0
  },
  relatedNews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  }],
  relatedCompanies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  metadata: {
    source: String,
    sourceUrl: String,
    language: {
      type: String,
      default: 'en'
    },
    readingTime: Number,
    wordCount: Number
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    canonicalUrl: String,
    ogImage: String,
    twitterCard: String
  },
  analytics: {
    uniqueViews: Number,
    averageReadTime: Number,
    bounceRate: Number,
    socialShares: {
      facebook: Number,
      twitter: Number,
      linkedin: Number,
      whatsapp: Number
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
newsSchema.index({ title: 'text', summary: 'text', content: 'text' });
newsSchema.index({ slug: 1 }, { unique: true });
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1, tags: 1 });
newsSchema.index({ featured: -1, pinned: -1 });
newsSchema.index({ author: 1, createdAt: -1 });
newsSchema.index({ 'seo.metaKeywords': 1 });
newsSchema.index({ scheduledFor: 1 }, { sparse: true });

// Pre-save middleware
newsSchema.pre('save', function(next) {
  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
  
  // Calculate reading time
  if (this.content) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.metadata.wordCount = wordCount;
    this.metadata.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Handle publishing status
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  next();
});

// Pre-update middleware
newsSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.status === 'published' && !update.publishedAt) {
    update.publishedAt = Date.now();
  }
  next();
});

// Virtual for excerpt
newsSchema.virtual('excerpt').get(function() {
  return this.summary || this.content.substring(0, 200) + '...';
});

// Virtual for isNew (within 7 days)
newsSchema.virtual('isNew').get(function() {
  if (!this.publishedAt) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.publishedAt >= sevenDaysAgo;
});

// Virtual for url
newsSchema.virtual('url').get(function() {
  return `/news/${this.slug}`;
});

// Methods
newsSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

newsSchema.methods.incrementLikes = async function() {
  this.likes += 1;
  return this.save();
};

newsSchema.methods.incrementShares = async function(platform) {
  this.shares += 1;
  if (platform && this.analytics.socialShares) {
    this.analytics.socialShares[platform] = (this.analytics.socialShares[platform] || 0) + 1;
  }
  return this.save();
};

newsSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: Date.now()
  });
  this.commentCount = this.comments.length;
  return this.save();
};

newsSchema.methods.removeComment = async function(commentId) {
  this.comments = this.comments.filter(
    comment => comment._id.toString() !== commentId.toString()
  );
  this.commentCount = this.comments.length;
  return this.save();
};

newsSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishedAt = Date.now();
  return this.save();
};

newsSchema.methods.archive = async function() {
  this.status = 'archived';
  return this.save();
};

// Statics
newsSchema.statics.getPublishedNews = function() {
  return this.find({ status: 'published' }).sort({ publishedAt: -1 });
};

newsSchema.statics.getFeaturedNews = function(limit = 5) {
  return this.find({ featured: true, status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

newsSchema.statics.getNewsByCategory = function(category, limit = 10) {
  return this.find({ category, status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

newsSchema.statics.searchNews = function(query, filters = {}, pagination = {}) {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;
  
  return this.find(
    { $text: { $search: query }, status: 'published', ...filters },
    { score: { $meta: 'textScore' } }
  )
    .skip(skip)
    .limit(limit)
    .sort({ score: { $meta: 'textScore' } });
};

newsSchema.statics.getRelatedNews = async function(newsId, limit = 5) {
  const news = await this.findById(newsId);
  if (!news) return [];
  
  return this.find({
    _id: { $ne: newsId },
    status: 'published',
    $or: [
      { category: news.category },
      { tags: { $in: news.tags } }
    ]
  })
    .limit(limit)
    .sort({ publishedAt: -1 });
};

newsSchema.statics.getNewsAnalytics = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        publishedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalNews: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalShares: { $sum: '$shares' },
        totalComments: { $sum: '$commentCount' },
        avgViewsPerNews: { $avg: '$views' },
        avgLikesPerNews: { $avg: '$likes' },
        byCategory: {
          $push: {
            category: '$category',
            views: '$views'
          }
        }
      }
    }
  ]);
};

// Schedule job to publish scheduled news
newsSchema.statics.publishScheduledNews = async function() {
  const now = new Date();
  return this.updateMany(
    {
      status: 'scheduled',
      scheduledFor: { $lte: now }
    },
    {
      status: 'published',
      publishedAt: now
    }
  );
};

module.exports = mongoose.model('News', newsSchema);