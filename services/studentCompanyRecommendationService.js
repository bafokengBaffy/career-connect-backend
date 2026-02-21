const StudentCompanyMatch = require('../models/StudentCompanyMatch');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class StudentCompanyRecommendationService {
  
  /**
   * Get job recommendations for student
   */
  async getJobRecommendationsForStudent(studentId, limit = 10) {
    try {
      const cacheKey = `job_recommendations:${studentId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Find jobs matching student profile
      const jobs = await Job.find({
        status: 'active',
        deadline: { $gt: new Date() },
        $or: [
          { 'requirements.skills': { $in: student.skills.map(s => s.name) } },
          { 'requirements.education.field': { $in: student.education.map(e => e.field) } },
          { industry: { $in: student.preferences?.industries || [] } }
        ]
      })
        .populate('companyId', 'name logo industry')
        .sort('-createdAt')
        .limit(50);

      // Score and rank jobs
      const scoredJobs = await this.scoreJobsForStudent(jobs, student);
      const recommendations = scoredJobs.slice(0, limit);

      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return recommendations;
    } catch (error) {
      logger.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  /**
   * Get internship recommendations for student
   */
  async getInternshipRecommendationsForStudent(studentId, limit = 10) {
    try {
      const cacheKey = `internship_recommendations:${studentId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const internships = await Internship.find({
        status: 'active',
        deadline: { $gt: new Date() },
        $or: [
          { 'requirements.skills': { $in: student.skills.map(s => s.name) } },
          { 'requirements.education.level': { $in: student.education.map(e => e.level) } },
          { industry: { $in: student.preferences?.industries || [] } }
        ]
      })
        .populate('companyId', 'name logo industry')
        .sort('-createdAt')
        .limit(50);

      const scoredInternships = await this.scoreInternshipsForStudent(internships, student);
      const recommendations = scoredInternships.slice(0, limit);

      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return recommendations;
    } catch (error) {
      logger.error('Error getting internship recommendations:', error);
      throw error;
    }
  }

  /**
   * Get student recommendations for job
   */
  async getStudentRecommendationsForJob(jobId, limit = 10) {
    try {
      const cacheKey = `student_recommendations:job:${jobId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const job = await Job.findById(jobId).populate('companyId');
      if (!job) {
        throw new Error('Job not found');
      }

      // Find students matching job requirements
      const students = await Student.find({
        isActive: true,
        $or: [
          { 'skills.name': { $in: job.requirements.skills || [] } },
          { 'education.field': { $in: [job.requirements.education?.field] } },
          { 'preferences.industries': job.industry }
        ]
      }).limit(100);

      const scoredStudents = await this.scoreStudentsForJob(students, job);
      const recommendations = scoredStudents.slice(0, limit);

      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return recommendations;
    } catch (error) {
      logger.error('Error getting student recommendations for job:', error);
      throw error;
    }
  }

  /**
   * Score jobs for a student
   */
  async scoreJobsForStudent(jobs, student) {
    const scored = [];

    for (const job of jobs) {
      let score = 0;
      const factors = [];

      // Skills match
      if (job.requirements.skills && student.skills) {
        const studentSkills = new Set(student.skills.map(s => s.name));
        const jobSkills = new Set(job.requirements.skills);
        const matchCount = [...jobSkills].filter(skill => studentSkills.has(skill)).length;
        const skillScore = (matchCount / jobSkills.size) * 100;
        score += skillScore * 0.4;
        factors.push({ name: 'skills', weight: 0.4, score: skillScore });
      }

      // Education match
      if (job.requirements.education && student.education) {
        const educationMatch = student.education.some(e => 
          e.field === job.requirements.education.field &&
          e.level === job.requirements.education.level
        );
        const eduScore = educationMatch ? 100 : 50;
        score += eduScore * 0.2;
        factors.push({ name: 'education', weight: 0.2, score: eduScore });
      }

      // Experience match
      if (job.requirements.experience) {
        const totalExperience = student.experience?.reduce((sum, exp) => 
          sum + (exp.endDate ? 
            (new Date(exp.endDate) - new Date(exp.startDate)) / (1000 * 60 * 60 * 24 * 365) : 0
          ), 0) || 0;
        
        const expScore = totalExperience >= job.requirements.experience.years ? 100 : 
                        (totalExperience / job.requirements.experience.years) * 100;
        score += Math.min(expScore, 100) * 0.2;
        factors.push({ name: 'experience', weight: 0.2, score: Math.min(expScore, 100) });
      }

      // Location match
      if (job.location && student.location) {
        const locationMatch = job.location.city === student.location.city;
        const locationScore = locationMatch ? 100 : 50;
        score += locationScore * 0.1;
        factors.push({ name: 'location', weight: 0.1, score: locationScore });
      }

      // Industry preference
      if (job.industry && student.preferences?.industries) {
        const industryMatch = student.preferences.industries.includes(job.industry);
        const industryScore = industryMatch ? 100 : 50;
        score += industryScore * 0.1;
        factors.push({ name: 'industry', weight: 0.1, score: industryScore });
      }

      scored.push({
        job,
        score: Math.round(score),
        factors,
        matchLevel: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Score internships for a student
   */
  async scoreInternshipsForStudent(internships, student) {
    const scored = [];

    for (const internship of internships) {
      let score = 0;
      const factors = [];

      // Similar scoring logic as jobs but with internship-specific factors
      // ... (implement similar to scoreJobsForStudent)

      scored.push({
        internship,
        score: Math.round(score),
        factors,
        matchLevel: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Score students for a job
   */
  async scoreStudentsForJob(students, job) {
    const scored = [];

    for (const student of students) {
      let score = 0;
      const factors = [];

      // Skills match
      if (job.requirements.skills && student.skills) {
        const jobSkills = new Set(job.requirements.skills);
        const studentSkills = new Set(student.skills.map(s => s.name));
        const matchCount = [...jobSkills].filter(skill => studentSkills.has(skill)).length;
        const skillScore = (matchCount / jobSkills.size) * 100;
        score += skillScore * 0.4;
        factors.push({ name: 'skills', weight: 0.4, score: skillScore });
      }

      // Education match
      if (job.requirements.education && student.education) {
        const educationMatch = student.education.some(e => 
          e.field === job.requirements.education.field
        );
        const eduScore = educationMatch ? 100 : 50;
        score += eduScore * 0.2;
        factors.push({ name: 'education', weight: 0.2, score: eduScore });
      }

      // Experience match
      const relevantExperience = student.experience?.filter(exp => 
        exp.industry === job.industry || exp.skills?.some(s => job.requirements.skills?.includes(s))
      ).length || 0;
      
      const expScore = relevantExperience > 0 ? 100 : 50;
      score += expScore * 0.2;
      factors.push({ name: 'experience', weight: 0.2, score: expScore });

      // Previous interactions with company
      const previousMatches = await StudentCompanyMatch.countDocuments({
        studentId: student._id,
        companyId: job.companyId._id
      });
      
      const interactionScore = previousMatches > 0 ? 100 : 50;
      score += interactionScore * 0.1;
      factors.push({ name: 'previous_interactions', weight: 0.1, score: interactionScore });

      // Availability
      const availabilityScore = student.availability?.immediate ? 100 : 75;
      score += availabilityScore * 0.1;
      factors.push({ name: 'availability', weight: 0.1, score: availabilityScore });

      scored.push({
        student,
        score: Math.round(score),
        factors,
        matchLevel: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Get personalized recommendations based on user behavior
   */
  async getPersonalizedRecommendations(userId, userType, limit = 10) {
    try {
      if (userType === 'student') {
        // Get student's interaction history
        const interactions = await StudentCompanyInteraction.find({ studentId: userId })
          .sort('-createdAt')
          .limit(50);

        // Extract interests from interactions
        const industries = interactions
          .map(i => i.companyId)
          .filter((v, i, a) => a.indexOf(v) === i);

        // Get similar companies
        const companies = await Company.find({
          _id: { $in: industries },
          isActive: true
        });

        // Find similar companies
        const similarCompanies = await Company.find({
          industry: { $in: companies.map(c => c.industry) },
          _id: { $nin: industries },
          isActive: true
        }).limit(limit);

        return {
          type: 'companies',
          recommendations: similarCompanies,
          basedOn: 'interaction_history'
        };
      } else {
        // Similar logic for company
        const interactions = await StudentCompanyInteraction.find({ companyId: userId })
          .sort('-createdAt')
          .limit(50);

        const studentIds = interactions
          .map(i => i.studentId)
          .filter((v, i, a) => a.indexOf(v) === i);

        const students = await Student.find({
          _id: { $in: studentIds },
          isActive: true
        });

        // Find similar students
        const skills = [...new Set(students.flatMap(s => s.skills.map(sk => sk.name)))];
        
        const similarStudents = await Student.find({
          'skills.name': { $in: skills },
          _id: { $nin: studentIds },
          isActive: true
        }).limit(limit);

        return {
          type: 'students',
          recommendations: similarStudents,
          basedOn: 'interaction_history'
        };
      }
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }
}

module.exports = new StudentCompanyRecommendationService();