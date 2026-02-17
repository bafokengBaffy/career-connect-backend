// @ts-nocheck
const { body, query, param, validationResult } = require('express-validator');
const validator = require('validator');

// Custom validation rules
const customValidators = {
  isStrongPassword: (value) => {
    return validator.isStrongPassword(value, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  },
  
  isValidName: (value) => {
    return value && value.length >= 2 && value.length <= 100 && 
           /^[a-zA-Z\s'-]+$/.test(value);
  },
  
  isValidUserType: (value) => {
    return ['student', 'employer', 'admin'].includes(value);
  },
  
  isValidPhone: (value) => {
    return !value || validator.isMobilePhone(value, 'any');
  },
  
  isValidURL: (value) => {
    return !value || validator.isURL(value);
  }
};

// Validate request middleware
const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  };
};

// ============================================
// AUTH VALIDATIONS
// ============================================
const authValidations = {
  register: [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom(value => !value.includes('+')).withMessage('Email with plus addressing is not allowed'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .custom(customValidators.isStrongPassword).withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    
    body('fullName')
      .notEmpty().withMessage('Full name is required')
      .custom(customValidators.isValidName).withMessage('Full name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes')
      .trim()
      .escape(),
    
    body('userType')
      .notEmpty().withMessage('User type is required')
      .custom(customValidators.isValidUserType).withMessage('User type must be student or employer'),
    
    body('phone')
      .optional()
      .custom(customValidators.isValidPhone).withMessage('Please provide a valid phone number'),
  ],
  
  login: [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  
  updateProfile: [
    body('fullName')
      .optional()
      .custom(customValidators.isValidName).withMessage('Full name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes')
      .trim()
      .escape(),
    
    body('phone')
      .optional()
      .custom(customValidators.isValidPhone).withMessage('Please provide a valid phone number'),
    
    body('profile.bio')
      .optional()
      .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters')
      .trim()
      .escape(),
    
    body('profile.website')
      .optional()
      .custom(customValidators.isValidURL).withMessage('Please provide a valid URL'),
  ]
};

// ============================================
// USER VALIDATIONS
// ============================================
const userValidations = {
  userId: [
    param('userId')
      .notEmpty().withMessage('User ID is required')
      .isAlphanumeric().withMessage('Invalid user ID format'),
  ],
  
  updateUser: [
    body('status')
      .optional()
      .isIn(['active', 'suspended']).withMessage('Status must be active or suspended'),
    
    body('role')
      .optional()
      .custom(customValidators.isValidUserType).withMessage('Invalid user role'),
  ]
};

// ============================================
// COMPANY VALIDATIONS
// ============================================
const companyValidations = {
  create: [
    body('name')
      .notEmpty().withMessage('Company name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters')
      .trim()
      .escape(),
    
    body('industry')
      .notEmpty().withMessage('Industry is required')
      .isLength({ min: 2, max: 50 }).withMessage('Industry must be 2-50 characters')
      .trim()
      .escape(),
    
    body('location')
      .notEmpty().withMessage('Location is required')
      .isLength({ min: 2, max: 100 }).withMessage('Location must be 2-100 characters'),
    
    body('description')
      .optional()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
      .trim()
      .escape(),
    
    body('contact.email')
      .optional()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('contact.phone')
      .optional()
      .custom(customValidators.isValidPhone).withMessage('Please provide a valid phone number'),
    
    body('contact.website')
      .optional()
      .custom(customValidators.isValidURL).withMessage('Please provide a valid URL'),
  ],
  
  update: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters')
      .trim()
      .escape(),
    
    body('industry')
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage('Industry must be 2-50 characters')
      .trim()
      .escape(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
      .trim()
      .escape(),
  ]
};

// ============================================
// COURSE VALIDATIONS
// ============================================
const courseValidations = {
  create: [
    body('name')
      .notEmpty().withMessage('Course name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Course name must be 2-100 characters')
      .trim()
      .escape(),
    
    body('institutionId')
      .notEmpty().withMessage('Institution ID is required')
      .isAlphanumeric().withMessage('Invalid institution ID format'),
    
    body('faculty')
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage('Faculty must be 2-50 characters')
      .trim()
      .escape(),
    
    body('duration')
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage('Duration must be 2-50 characters'),
    
    body('fees')
      .optional()
      .isNumeric().withMessage('Fees must be a number')
      .custom(value => value >= 0).withMessage('Fees cannot be negative'),
    
    body('seats')
      .optional()
      .isInt({ min: 0 }).withMessage('Seats must be a positive integer'),
    
    body('requirements')
      .optional()
      .isObject().withMessage('Requirements must be an object'),
  ],
  
  update: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Course name must be 2-100 characters')
      .trim()
      .escape(),
    
    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean'),
  ]
};

// ============================================
// PAGINATION VALIDATIONS
// ============================================
const paginationValidations = {
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    
    query('startAfter')
      .optional()
      .isAlphanumeric().withMessage('Invalid startAfter ID'),
  ]
};

// ============================================
// SEARCH VALIDATIONS
// ============================================
const searchValidations = {
  search: [
    query('q')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters')
      .trim()
      .escape(),
    
    query('filter')
      .optional()
      .isObject().withMessage('Filter must be an object'),
    
    query('sort')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Sort must be asc or desc'),
  ]
};

module.exports = {
  validateRequest,
  authValidations,
  userValidations,
  companyValidations,
  courseValidations,
  paginationValidations,
  searchValidations,
  customValidators
};