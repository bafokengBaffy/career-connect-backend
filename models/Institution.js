const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Institution name is required'],
    trim: true,
    unique: true,
    index: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Institution email is required'],
    lowercase: true,
    trim: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, 'Please provide a valid URL']
  },
  
  // Institution Details
  type: {
    type: String,
    required: [true, 'Institution type is required'],
    enum: [
      'University', 'College', 'Technical School', 'Vocational School',
      'High School', 'Training Center', 'Online School', 'Other'
    ]
  },
  accreditation: {
    status: {
      type: String,
      enum: ['accredited', 'pending', 'not-accredited'],
      default: 'pending'
    },
    body: String,
    certificate: String,
    expiryDate: Date
  },
  established: {
    type: Number,
    min: [1800, 'Year must be after 1800'],
    max: [new Date().getFullYear(), 'Year cannot be in the future']
  },
  
  // Description
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [3000, 'Description cannot exceed 3000 characters']
  },
  mission: String,
  vision: String,
  values: [String],
  
  // Location
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: String,
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'Lesotho'
    },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  campuses: [{
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    phone: String,
    email: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  
  // Media
  logo: {
    url: String,
    publicId: String,
    alt: String
  },
  coverImage: {
    url: String,
    publicId: String,
    alt: String
  },
  gallery: [{
    url: String,
    publicId: String,
    alt: String,
    caption: String
  }],
  virtualTour: String,
  
  // Social Media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String,
    youtube: String
  },
  
  // Academic Information
  programs: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['Certificate', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Short Course']
    },
    duration: String,
    description: String,
    requirements: [String],
    tuition: {
      amount: Number,
      currency: {
        type: String,
        default: 'LSL'
      },
      perYear: Boolean
    },
    department: String,
    faculty: String
  }],
  
  departments: [{
    name: String,
    head: String,
    description: String,
    email: String,
    phone: String
  }],
  
  faculty: [{
    name: String,
    title: String,
    department: String,
    qualifications: [String],
    expertise: [String],
    email: String,
    profile: String,
    image: String
  }],
  
  // Admission
  admissionInfo: {
    requirements: [String],
    process: String,
    deadlines: {
      early: Date,
      regular: Date,
      late: Date
    },
    contact: {
      email: String,
      phone: String,
      person: String
    }
  },
  
  tuitionFees: {
    currency: {
      type: String,
      default: 'LSL'
    },
    undergraduate: {
      local: Number,
      international: Number,
      perYear: Boolean
    },
    postgraduate: {
      local: Number,
      international: Number,
      perYear: Boolean
    },
    additionalFees: [{
      name: String,
      amount: Number,
      description: String
    }]
  },
  
  scholarships: [{
    name: String,
    description: String,
    amount: Number,
    eligibility: [String],
    deadline: Date,
    applicationUrl: String
  }],
  
  // Facilities
  facilities: [{
    name: String,
    description: String,
    image: String,
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  
  // Student Life
  studentLife: {
    housing: {
      available: Boolean,
      description: String,
      cost: Number
    },
    clubs: [String],
    sports: [String],
    events: [String],
    services: [String]
  },
  
  // Statistics
  statistics: {
    totalStudents: {
      type: Number,
      default: 0
    },
    internationalStudents: Number,
    studentFacultyRatio: Number,
    graduationRate: Number,
    employmentRate: Number,
    averageClassSize: Number
  },
  
  // Rankings
  rankings: [{
    name: String,
    rank: Number,
    year: Number,
    source: String
  }],
  
  // Accreditations and Affiliations
  accreditations: [{
    body: String,
    certificate: String,
    validFrom: Date,
    validUntil: Date
  }],
  
  affiliations: [{
    name: String,
    type: String,
    since: Number
  }],
  
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationDocuments: [{
    name: String,
    url: String,
    publicId: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Contact Person
  contactPerson: {
    name: String,
    position: String,
    email: String,
    phone: String,
    department: String
  },
  
  // Reviews and Ratings
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Featured Status
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // Courses offered
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Events
  upcomingEvents: [{
    title: String,
    description: String,
    date: Date,
    time: String,
    location: String,
    type: {
      type: String,
      enum: ['open-day', 'workshop', 'seminar', 'webinar', 'other']
    },
    registrationUrl: String
  }],
  
  // News and Announcements
  news: [{
    title: String,
    content: String,
    date: {
      type: Date,
      default: Date.now
    },
    image: String,
    link: String
  }],
  
  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Settings
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    applicationAlerts: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Africa/Maseru'
    }
  },
  
  // Timestamps
  lastActive: {
    type: Date,
    default: Date.now
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
institutionSchema.index({ name: 'text', description: 'text' });
institutionSchema.index({ type: 1, accreditation: 1 });
institutionSchema.index({ 'address.city': 1, 'address.country': 1 });
institutionSchema.index({ averageRating: -1, isFeatured: -1 });

// Virtual for programs count
institutionSchema.virtual('programsCount').get(function() {
  return this.programs ? this.programs.length : 0;
});

// Virtual for faculty count
institutionSchema.virtual('facultyCount').get(function() {
  return this.faculty ? this.faculty.length : 0;
});

// Pre-save middleware
institutionSchema.pre('save', function(next) {
  // Generate slug
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

// Method to check if institution is verified
institutionSchema.methods.isVerified = function() {
  return this.verificationStatus === 'verified';
};

// Method to add review
institutionSchema.methods.addReview = async function(userId, rating, comment) {
  this.reviews.push({ user: userId, rating, comment });
  this.totalReviews = this.reviews.length;
  
  const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
  this.averageRating = sum / this.totalReviews;
  
  return this.save();
};

// Static method to find top institutions
institutionSchema.statics.findTop = function(limit = 10) {
  return this.find({ verificationStatus: 'verified' })
    .sort('-averageRating -statistics.graduationRate')
    .limit(limit);
};

// Static method to find institutions by type
institutionSchema.statics.findByType = function(type, limit = 20) {
  return this.find({ type, verificationStatus: 'verified' })
    .sort('-averageRating')
    .limit(limit);
};

module.exports = mongoose.model('Institution', institutionSchema);