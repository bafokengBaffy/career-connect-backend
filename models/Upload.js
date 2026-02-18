const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  // Basic Information
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: 0
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  extension: {
    type: String,
    required: [true, 'File extension is required']
  },
  
  // File Paths
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  publicId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Storage Information
  storageType: {
    type: String,
    required: [true, 'Storage type is required'],
    enum: ['local', 'cloudinary', 's3', 'firebase', 'azure'],
    default: 'local'
  },
  storageProvider: String,
  bucketName: String,
  region: String,
  
  // File Category
  category: {
    type: String,
    required: [true, 'File category is required'],
    enum: [
      'profile_image', 'company_logo', 'cover_image', 'document', 'resume',
      'certificate', 'portfolio', 'project_file', 'course_material',
      'video', 'audio', 'image', 'archive', 'verification_document'
    ]
  },
  subCategory: String,
  
  // File Metadata
  metadata: {
    width: Number,
    height: Number,
    duration: Number, // For videos/audio
    pages: Number, // For PDFs
    resolution: String,
    compression: String,
    bitrate: Number,
    codec: String,
    colorSpace: String
  },
  
  // Uploader Information
  uploadedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user ID is required'],
      index: true
    },
    userType: {
      type: String,
      enum: ['student', 'company', 'admin', 'institution'],
      required: true
    },
    ipAddress: String,
    userAgent: String
  },
  
  // Ownership/Target
  targetType: {
    type: String,
    enum: [
      'user', 'company', 'institution', 'course', 'job', 'internship',
      'project', 'application', 'message', 'news', 'review'
    ],
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Permissions
  permissions: {
    read: [String], // User IDs or roles
    write: [String],
    delete: [String],
    download: [String]
  },
  
  // Security
  encryption: {
    isEncrypted: {
      type: Boolean,
      default: false
    },
    algorithm: String,
    keyId: String
  },
  checksum: {
    type: String, // For file integrity
    algorithm: {
      type: String,
      enum: ['md5', 'sha1', 'sha256'],
      default: 'sha256'
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed', 'deleted'],
    default: 'completed'
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  processingErrors: [String],
  
  // Access Statistics
  accessCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessed: Date,
  
  // Expiration
  expiresAt: Date,
  isExpired: {
    type: Boolean,
    default: false
  },
  
  // Tags and Labels
  tags: [String],
  labels: [{
    name: String,
    value: String,
    confidence: Number
  }],
  
  // AI/ML Generated Metadata
  aiMetadata: {
    objects: [String],
    faces: Number,
    text: String,
    sentiment: String,
    categories: [String],
    unsafeContent: Boolean,
    moderationLabels: [String]
  },
  
  // Versioning
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    filename: String,
    url: String,
    publicId: String,
    uploadedAt: Date,
    changes: String
  }],
  
  // Related Files
  relatedFiles: [{
    relation: String,
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upload'
    }
  }],
  
  // Deletion Information
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
uploadSchema.index({ uploadedBy: 1, createdAt: -1 });
uploadSchema.index({ category: 1, status: 1 });
uploadSchema.index({ targetType: 1, targetId: 1 });
uploadSchema.index({ mimeType: 1, fileSize: 1 });
uploadSchema.index({ tags: 1 });

// Virtual for file type group
uploadSchema.virtual('fileType').get(function() {
  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType.startsWith('application/pdf')) return 'pdf';
  if (this.mimeType.startsWith('application/msword') || 
      this.mimeType.startsWith('application/vnd.openxmlformats')) return 'document';
  if (this.mimeType.startsWith('text/')) return 'text';
  return 'other';
});

// Virtual for formatted size
uploadSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save middleware
uploadSchema.pre('save', function(next) {
  // Generate checksum if not provided
  if (!this.checksum) {
    // This would normally use crypto to generate hash
    this.checksum = require('crypto')
      .createHash('sha256')
      .update(this.filename + Date.now())
      .digest('hex');
  }
  
  // Check if file is expired
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.isExpired = true;
  }
  
  next();
});

// Method to increment access count
uploadSchema.methods.incrementAccess = async function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Method to increment download count
uploadSchema.methods.incrementDownload = async function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Method to check access permission
uploadSchema.methods.canAccess = function(userId, userRole) {
  if (this.isPublic) return true;
  if (this.uploadedBy.userId.toString() === userId.toString()) return true;
  if (userRole === 'admin') return true;
  
  // Check specific permissions
  return this.permissions.read.includes(userId.toString()) ||
         this.permissions.read.includes(userRole);
};

// Method to create new version
uploadSchema.methods.createVersion = async function(newFileData, changes) {
  // Save current version to history
  this.previousVersions.push({
    version: this.version,
    filename: this.filename,
    url: this.url,
    publicId: this.publicId,
    uploadedAt: this.createdAt,
    changes
  });
  
  // Update with new version
  this.version += 1;
  this.filename = newFileData.filename;
  this.originalName = newFileData.originalName;
  this.fileSize = newFileData.fileSize;
  this.path = newFileData.path;
  this.url = newFileData.url;
  this.publicId = newFileData.publicId;
  
  return this.save();
};

// Static method to find user's uploads
uploadSchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({ 'uploadedBy.userId': userId })
    .sort('-createdAt')
    .limit(limit);
};

// Static method to find by target
uploadSchema.statics.findByTarget = function(targetType, targetId) {
  return this.find({ targetType, targetId }).sort('-createdAt');
};

// Static method to get storage usage
uploadSchema.statics.getStorageUsage = async function(userId) {
  const result = await this.aggregate([
    { $match: { 'uploadedBy.userId': mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        files: { $push: { filename: '$filename', size: '$fileSize' } }
      }
    }
  ]);
  
  return result;
};

// Static method to cleanup expired files
uploadSchema.statics.cleanupExpired = async function() {
  const expired = await this.find({
    expiresAt: { $lt: new Date() },
    isExpired: false
  });
  
  for (const file of expired) {
    file.isExpired = true;
    file.status = 'deleted';
    await file.save();
    
    // Here you would also delete from storage provider
  }
  
  return expired.length;
};

module.exports = mongoose.model('Upload', uploadSchema);