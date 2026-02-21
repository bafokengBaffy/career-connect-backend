// @ts-nocheck
const Student = require('../models/Student');
const Company = require('../models/Company');
const StudentCompanyMatch = require('../models/StudentCompanyMatch');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const axios = require('axios');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class StudentCompanyMatchingService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    this.cacheTTL = 3600; // 1 hour
  }

  /**
   * Find matches for a student
   */
  async findMatchesForStudent(student, options = {}) {
    try {
      const {
        limit = 20,
        minScore = 0,
        type = 'all',
        excludeIds = []
      } = options;

      // Check cache first
      const cacheKey = `student_matches:${student._id}:${limit}:${minScore}:${type}`;
      const cached = await redis.get(cacheKey);
      if (cached && !options.refresh) {
        return JSON.parse(cached);
      }

      // Get potential companies
      let companies = await this.getPotentialCompanies(student, type);

      // Filter out excluded companies
      if (excludeIds.length > 0) {
        companies = companies.filter(c => !excludeIds.includes(c._id.toString()));
      }

      // Calculate matches using AI service
      const matches = await this.calculateMatches(student, companies, options);

      // Save matches to database
      const savedMatches = await this.saveMatches(matches, 'student', student._id);

      // Cache results
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(savedMatches));

      return savedMatches;
    } catch (error) {
      logger.error('Error finding matches for student:', error);
      throw error;
    }
  }

  /**
   * Find candidates for a company
   */
  async findCandidatesForCompany(company, options = {}) {
    try {
      const {
        limit = 20,
        minScore = 0,
        jobId,
        internshipId,
        excludeIds = []
      } = options;

      const cacheKey = `company_candidates:${company._id}:${limit}:${minScore}:${jobId || 'all'}`;
      const cached = await redis.get(cacheKey);
      if (cached && !options.refresh) {
        return JSON.parse(cached);
      }

      // Get job requirements if specified
      let jobRequirements = null;
      if (jobId) {
        const job = await Job.findById(jobId);
        jobRequirements = job;
      } else if (internshipId) {
        const internship = await Internship.findById(internshipId);
        jobRequirements = internship;
      }

      // Get potential students
      let students = await this.getPotentialStudents(company, jobRequirements);

      // Filter out excluded students
      if (excludeIds.length > 0) {
        students = students.filter(s => !excludeIds.includes(s._id.toString()));
      }

      // Calculate matches using AI service
      const matches = await this.calculateMatches(students, company, {
        ...options,
        jobRequirements
      });

      // Save matches to database
      const savedMatches = await this.saveMatches(matches, 'company', company._id);

      // Cache results
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(savedMatches));

      return savedMatches;
    } catch (error) {
      logger.error('Error finding candidates for company:', error);
      throw error;
    }
  }

  /**
   * Get potential companies for a student
   */
  async getPotentialCompanies(student, type) {
    let query = { isActive: true };

    // Filter by company preferences based on student profile
    if (student.preferences?.industries?.length > 0) {
      query.industry = { $in: student.preferences.industries };
    }

    if (student.preferences?.companySize) {
      query.size = student.preferences.companySize;
    }

    if (student.preferences?.location) {
      query['locations.city'] = student.preferences.location;
    }

    // Get companies that have active jobs/internships if needed
    if (type === 'jobs') {
      const companiesWithJobs = await Job.distinct('companyId', {
        status: 'active',
        deadline: { $gt: new Date() }
      });
      query._id = { $in: companiesWithJobs };
    } else if (type === 'internships') {
      const companiesWithInternships = await Internship.distinct('companyId', {
        status: 'active',
        deadline: { $gt: new Date() }
      });
      query._id = { $in: companiesWithInternships };
    }

    return Company.find(query).limit(100).lean();
  }

  /**
   * Get potential students for a company
   */
  async getPotentialStudents(company, jobRequirements) {
    let query = { isActive: true };

    if (jobRequirements) {
      // Match based on job requirements
      if (jobRequirements.skills?.length > 0) {
        query['skills.name'] = { $in: jobRequirements.skills };
      }

      if (jobRequirements.education?.field) {
        query['education.field'] = jobRequirements.education.field;
      }

      if (jobRequirements.experience?.years) {
        query['experience.years'] = { $gte: jobRequirements.experience.years };
      }

      if (jobRequirements.location) {
        query['location.city'] = jobRequirements.location;
      }
    } else {
      // General matching based on company industry
      if (company.industry) {
        query['preferences.industries'] = company.industry;
      }

      // Students who have shown interest in this company
      const interestedStudents = await StudentCompanyMatch.distinct('studentId', {
        companyId: company._id,
        'interactionHistory.action': 'view'
      });
      
      if (interestedStudents.length > 0) {
        query.$or = [
          { _id: { $in: interestedStudents } },
          query
        ];
      }
    }

    return Student.find(query).limit(100).lean();
  }

  /**
   * Calculate matches using AI service
   */
  async calculateMatches(source, targets, options = {}) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/api/matching/calculate`, {
        source,
        targets,
        options
      });

      return response.data.matches;
    } catch (error) {
      logger.error('AI matching service error:', error);
      
      // Fallback to basic matching algorithm
      return this.calculateBasicMatches(source, targets, options);
    }
  }

  /**
   * Basic matching algorithm (fallback)
   */
  calculateBasicMatches(source, targets, options) {
    const matches = [];

    for (const target of targets) {
      let score = 0;
      const components = {};

      if (source.skills && target.skills) {
        const sourceSkills = new Set(source.skills.map(s => s.name));
        const targetSkills = new Set(target.skills.map(s => s.name));
        const intersection = new Set([...sourceSkills].filter(x => targetSkills.has(x)));
        components.skills = {
          score: (intersection.size / Math.max(sourceSkills.size, 1)) * 100,
          matchedSkills: Array.from(intersection),
          missingSkills: Array.from([...targetSkills].filter(x => !sourceSkills.has(x)))
        };
        score += components.skills.score * 0.4;
      }

      if (options.minScore && score < options.minScore) {
        continue;
      }

      matches.push({
        studentId: source._id || source,
        companyId: target._id || target,
        matchScore: Math.round(score),
        matchComponents: components,
        matchType: 'basic',
        aiInsights: {
          matchSummary: `Basic match score: ${Math.round(score)}%`,
          strengths: components.skills?.matchedSkills || [],
          concerns: components.skills?.missingSkills || []
        }
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, options.limit || 20);
  }

  /**
   * Save matches to database
   */
  async saveMatches(matches, type, sourceId) {
    const savedMatches = [];

    for (const match of matches) {
      // Check if match already exists
      let existingMatch = await StudentCompanyMatch.findOne({
        studentId: match.studentId,
        companyId: match.companyId
      });

      if (existingMatch) {
        // Update existing match
        existingMatch.matchScore = match.matchScore;
        existingMatch.matchComponents = match.matchComponents;
        existingMatch.aiInsights = match.aiInsights;
        existingMatch.updatedAt = new Date();
        await existingMatch.save();
        savedMatches.push(existingMatch);
      } else {
        // Create new match
        const newMatch = new StudentCompanyMatch({
          ...match,
          interactionHistory: [{
            action: 'created',
            performedBy: 'system',
            metadata: { type, sourceId }
          }]
        });
        await newMatch.save();
        savedMatches.push(newMatch);
      }
    }

    return savedMatches;
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(student, criteria = {}) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/api/matching/recommendations`, {
        student,
        criteria
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      
      // Fallback to basic recommendations
      const matches = await this.findMatchesForStudent(student, {
        limit: criteria.limit || 10
      });
      
      return {
        recommendations: matches,
        type: 'basic',
        generatedAt: new Date()
      };
    }
  }

  /**
   * Get company recommendations
   */
  async getCompanyRecommendations(company, criteria = {}) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/api/matching/company-recommendations`, {
        company,
        criteria
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting company recommendations:', error);
      
      const candidates = await this.findCandidatesForCompany(company, {
        limit: criteria.limit || 10
      });
      
      return {
        recommendations: candidates,
        type: 'basic',
        generatedAt: new Date()
      };
    }
  }

  /**
   * Batch generate matches
   */
  async batchMatchGeneration({ companyIds, studentIds, type }) {
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    try {
      let companies = [];
      let students = [];

      if (companyIds && companyIds.length > 0) {
        companies = await Company.find({ _id: { $in: companyIds } }).lean();
      } else {
        companies = await Company.find({ isActive: true }).limit(50).lean();
      }

      if (studentIds && studentIds.length > 0) {
        students = await Student.find({ _id: { $in: studentIds } }).lean();
      } else {
        students = await Student.find({ isActive: true }).limit(100).lean();
      }

      for (const student of students) {
        for (const company of companies) {
          try {
            const match = await this.calculateMatches(student, [company], { type });
            if (match.length > 0) {
              const saved = await this.saveMatches(match, 'batch', null);
              if (saved.length > 0) {
                results.created++;
              }
            }
            results.total++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              studentId: student._id,
              companyId: company._id,
              error: error.message
            });
          }
        }
      }

      logger.info(`Batch match generation completed: ${results.created} created, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      logger.error('Batch match generation error:', error);
      throw error;
    }
  }

  /**
   * Assess match quality
   */
  async assessMatchQuality(match) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/api/matching/assess-quality`, {
        match
      });

      return response.data;
    } catch (error) {
      logger.error('Error assessing match quality:', error);
      
      // Return basic quality metrics
      return {
        matchId: match._id,
        qualityScore: match.matchScore,
        confidence: 0.7,
        factors: [
          { name: 'skills', score: match.matchComponents.skills?.score || 0 },
          { name: 'experience', score: match.matchComponents.experience?.score || 0 },
          { name: 'education', score: match.matchComponents.education?.score || 0 }
        ],
        recommendations: [
          'Consider scheduling an interview to assess fit',
          'Review the candidate\'s portfolio for more insights'
        ]
      };
    }
  }
}

module.exports = new StudentCompanyMatchingService();