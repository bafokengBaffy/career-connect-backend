const mongoose = require('mongoose');

const savedItemSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  itemType: {
    type: String,
    enum: ['job', 'internship', 'company'],
    required: true,
    index: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  internship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  folders: [{
    type: String,
    trim: true
  }],
  reminders: [{
    type: {
      type: String,
      enum: ['application-deadline', 'follow-up', 'interview-prep', 'other']
    },
    date: Date,
    note: String,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  metadata: {
    salary: mongoose.Schema.Types.Mixed,
    location: String,
    deadline: Date,
    companyName: String,
    position: String
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  applied: {
    type: Boolean,
    default: false
  },
  appliedAt: Date,
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  viewedCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique saves
savedItemSchema.index({ 
  student: 1, 
  itemType: 1, 
  job: 1, 
  internship: 1, 
  company: 1 
}, { 
  unique: true,
  partialFilterExpression: {
    $or: [
      { job: { $exists: true } },
      { internship: { $exists: true } },
      { company: { $exists: true } }
    ]
  }
});

// Indexes for querying
savedItemSchema.index({ student: 1, isArchived: 1, createdAt: -1 });
savedItemSchema.index({ 'reminders.date': 1, 'reminders.completed': 1 });

// Update timestamp
savedItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Before save, validate reference
savedItemSchema.pre('save', async function(next) {
  if (this.itemType === 'job' && !this.job) {
    next(new Error('Job reference required for job type'));
  } else if (this.itemType === 'internship' && !this.internship) {
    next(new Error('Internship reference required for internship type'));
  } else if (this.itemType === 'company' && !this.company) {
    next(new Error('Company reference required for company type'));
  } else {
    next();
  }
});

// After save, increment item's save count
savedItemSchema.post('save', async function() {
  try {
    let Model;
    let field = 'saves';
    
    if (this.itemType === 'job') {
      Model = mongoose.model('Job');
    } else if (this.itemType === 'internship') {
      Model = mongoose.model('Internship');
    } else if (this.itemType === 'company') {
      Model = mongoose.model('Company');
      field = 'followersCount';
    }
    
    if (Model && this[this.itemType]) {
      await Model.findByIdAndUpdate(this[this.itemType], {
        $inc: { [field]: 1 }
      });
    }
  } catch (error) {
    console.error('Error updating save count:', error);
  }
});

// Before remove, decrement item's save count
savedItemSchema.pre('remove', async function() {
  try {
    let Model;
    let field = 'saves';
    
    if (this.itemType === 'job') {
      Model = mongoose.model('Job');
    } else if (this.itemType === 'internship') {
      Model = mongoose.model('Internship');
    } else if (this.itemType === 'company') {
      Model = mongoose.model('Company');
      field = 'followersCount';
    }
    
    if (Model && this[this.itemType]) {
      await Model.findByIdAndUpdate(this[this.itemType], {
        $inc: { [field]: -1 }
      });
    }
  } catch (error) {
    console.error('Error updating save count:', error);
  }
});

// Add reminder
savedItemSchema.methods.addReminder = function(type, date, note) {
  this.reminders.push({
    type,
    date,
    note
  });
  return this.save();
};

// Mark as applied
savedItemSchema.methods.markAsApplied = function(applicationId) {
  this.applied = true;
  this.appliedAt = new Date();
  this.applicationId = applicationId;
  return this.save();
};

// Get upcoming reminders
savedItemSchema.statics.getUpcomingReminders = function(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  
  return this.find({
    'reminders.date': { $lte: cutoff, $gte: new Date() },
    'reminders.completed': false,
    isArchived: false
  }).populate('student');
};

module.exports = mongoose.model('SavedItem', savedItemSchema);