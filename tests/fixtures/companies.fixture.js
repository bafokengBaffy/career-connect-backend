// @ts-nocheck
/**
 * Company Fixtures
 * Predefined test company data
 */

const mongoose = require('mongoose');
const { regularUsers } = require('./users.fixture');

const generateObjectId = () => new mongoose.Types.ObjectId();

// Verified companies
const verifiedCompanies = [
  {
    _id: generateObjectId(),
    name: 'Tech Solutions Lesotho',
    email: 'info@techsolutions.co.ls',
    phone: '+266 2231 5678',
    website: 'https://techsolutions.co.ls',
    description: 'Leading technology solutions provider in Lesotho',
    shortDescription: 'Tech solutions for businesses',
    industry: 'Technology',
    companySize: '51-200',
    foundedYear: 2015,
    address: {
      street: 'Kingsway Road',
      city: 'Maseru',
      country: 'Lesotho',
      postalCode: '100',
    },
    location: {
      city: 'Maseru',
      country: 'Lesotho',
      coordinates: {
        lat: -29.3167,
        lng: 27.4833,
      },
    },
    logo: {
      url: 'https://example.com/logo.png',
      publicId: 'companies/logo123',
    },
    socialMedia: {
      linkedin: 'https://linkedin.com/company/techsolutions',
      twitter: 'https://twitter.com/techsolutions',
    },
    verificationStatus: 'verified',
    verifiedAt: new Date('2024-01-01'),
    averageRating: 4.5,
    totalReviews: 25,
    isFeatured: true,
    featuredUntil: new Date('2024-12-31'),
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      autoRenew: true,
    },
    statistics: {
      totalHires: 45,
      activeJobs: 8,
      viewCount: 12500,
      applicationRate: 78,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: generateObjectId(),
    name: 'Lesotho Bank',
    email: 'careers@lesothobank.co.ls',
    phone: '+266 2231 1234',
    website: 'https://lesothobank.co.ls',
    description: 'Leading financial institution in Lesotho',
    shortDescription: 'Banking and financial services',
    industry: 'Finance',
    companySize: '501-1000',
    foundedYear: 1972,
    address: {
      street: 'Bank Building, Kingsway',
      city: 'Maseru',
      country: 'Lesotho',
      postalCode: '100',
    },
    location: {
      city: 'Maseru',
      country: 'Lesotho',
    },
    verificationStatus: 'verified',
    verifiedAt: new Date('2024-01-15'),
    averageRating: 4.2,
    totalReviews: 42,
    isFeatured: true,
    featuredUntil: new Date('2024-06-30'),
    subscription: {
      plan: 'enterprise',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      autoRenew: true,
    },
    statistics: {
      totalHires: 89,
      activeJobs: 12,
      viewCount: 28700,
      applicationRate: 82,
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// Pending companies
const pendingCompanies = [
  {
    _id: generateObjectId(),
    name: 'New Startup',
    email: 'info@newstartup.co.ls',
    phone: '+266 2231 9999',
    description: 'New startup waiting for verification',
    industry: 'Technology',
    companySize: '1-10',
    foundedYear: 2024,
    location: {
      city: 'Maseru',
      country: 'Lesotho',
    },
    verificationStatus: 'pending',
    verificationDocuments: [
      {
        name: 'registration.pdf',
        url: 'https://example.com/docs/reg.pdf',
        uploadedAt: new Date('2024-02-01'),
      },
    ],
    subscription: {
      plan: 'free',
      status: 'active',
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Rejected companies
const rejectedCompanies = [
  {
    _id: generateObjectId(),
    name: 'Invalid Business',
    email: 'invalid@example.com',
    phone: '+266 2231 8888',
    description: 'This company was rejected',
    industry: 'Other',
    location: {
      city: 'Maseru',
      country: 'Lesotho',
    },
    verificationStatus: 'rejected',
    rejectionReason: 'Incomplete documentation',
    verificationDocuments: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25'),
  },
];

// Companies with jobs
const companiesWithJobs = [
  {
    _id: generateObjectId(),
    name: 'Hiring Company',
    email: 'hiring@example.com',
    description: 'Company with active job postings',
    industry: 'Technology',
    location: {
      city: 'Maseru',
      country: 'Lesotho',
    },
    verificationStatus: 'verified',
    jobs: [
      generateObjectId(),
      generateObjectId(),
      generateObjectId(),
    ],
    internships: [
      generateObjectId(),
    ],
    followers: [
      regularUsers[0]._id,
      regularUsers[1]._id,
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

module.exports = {
  verifiedCompanies,
  pendingCompanies,
  rejectedCompanies,
  companiesWithJobs,
  generateObjectId,
};