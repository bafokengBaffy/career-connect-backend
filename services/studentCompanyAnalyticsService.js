// @ts-nocheck
const StudentCompany = require('../models/StudentCompany');
const StudentCompanyInteraction = require('../models/StudentCompanyInteraction');
const StudentCompanyCollaboration = require('../models/StudentCompanyCollaboration');
const StudentCompanyFeedback = require('../models/StudentCompanyFeedback');
const StudentCompanyMatch = require('../models/StudentCompanyMatch');
const logger = require('../utils/logger');

class StudentCompanyAnalyticsService {
  
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(filters = {}) {
    try {
      const { companyId, studentId, startDate, endDate } = filters;

      const match = {};
      if (companyId) match.companyId = companyId;
      if (studentId) match.studentId = studentId;

      const dateMatch = {};
      if (startDate || endDate) {
        dateMatch.createdAt = {};
        if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
        if (endDate) dateMatch.createdAt.$lte = new Date(endDate);
      }

      const [
        relationshipStats,
        interactionStats,
        collaborationStats,
        feedbackStats,
        matchStats,
        trends
      ] = await Promise.all([
        this.getRelationshipStats({ ...match, ...dateMatch }),
        this.getInteractionStats({ ...match, ...dateMatch }),
        this.getCollaborationStats({ ...match, ...dateMatch }),
        this.getFeedbackStats({ ...match, ...dateMatch }),
        this.getMatchStats({ ...match, ...dateMatch }),
        this.getTrends({ ...match, ...dateMatch })
      ]);

      return {
        overview: {
          relationships: relationshipStats,
          interactions: interactionStats,
          collaborations: collaborationStats,
          feedback: feedbackStats,
          matches: matchStats
        },
        trends,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get relationship statistics
   */
  async getRelationshipStats(match) {
    const stats = await StudentCompany.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgMatchScore: { $avg: '$matchScore' },
          byType: {
            $push: '$relationshipType'
          }
        }
      }
    ]);

    const byType = {};
    if (stats[0]?.byType) {
      stats[0].byType.forEach(type => {
        byType[type] = (byType[type] || 0) + 1;
      });
    }

    return {
      ...stats[0],
      byType,
      conversionRate: stats[0] ? (stats[0].completed / stats[0].total) * 100 : 0
    };
  }

  /**
   * Get interaction statistics
   */
  async getInteractionStats(match) {
    const stats = await StudentCompanyInteraction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          messages: {
            $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] }
          },
          meetings: {
            $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, 1, 0] }
          },
          calls: {
            $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] }
          },
          avgSentiment: { $avg: '$sentiment.score' },
          positiveSentiment: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          },
          negativeSentiment: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      messages: 0,
      meetings: 0,
      calls: 0,
      avgSentiment: 0,
      positiveSentiment: 0,
      negativeSentiment: 0
    };
  }

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(match) {
    const stats = await StudentCompanyCollaboration.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$progress.status', 'active'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$progress.status', 'completed'] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress.percentageComplete' },
          byType: {
            $push: '$type'
          }
        }
      }
    ]);

    const byType = {};
    if (stats[0]?.byType) {
      stats[0].byType.forEach(type => {
        byType[type] = (byType[type] || 0) + 1;
      });
    }

    return {
      ...stats[0],
      byType,
      completionRate: stats[0] ? (stats[0].completed / stats[0].total) * 100 : 0
    };
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(match) {
    const stats = await StudentCompanyFeedback.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgOverallRating: { $avg: '$ratings.overall' },
          avgCommunication: { $avg: '$ratings.communication' },
          avgQuality: { $avg: '$ratings.qualityOfWork' },
          recommendationRate: {
            $avg: { $cond: ['$outcomes.wouldRecommend', 1, 0] }
          },
          studentFeedback: {
            $sum: { $cond: [{ $eq: ['$feedbackType', 'student_to_company'] }, 1, 0] }
          },
          companyFeedback: {
            $sum: { $cond: [{ $eq: ['$feedbackType', 'company_to_student'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      avgOverallRating: 0,
      avgCommunication: 0,
      avgQuality: 0,
      recommendationRate: 0,
      studentFeedback: 0,
      companyFeedback: 0
    };
  }

  /**
   * Get match statistics
   */
  async getMatchStats(match) {
    const stats = await StudentCompanyMatch.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: '$matchScore' },
          viewed: {
            $sum: { $cond: [{ $eq: ['$status', 'viewed'] }, 1, 0] }
          },
          shortlisted: {
            $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] }
          },
          contacted: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
          },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      avgScore: 0,
      viewed: 0,
      shortlisted: 0,
      contacted: 0,
      accepted: 0
    };
  }

  /**
   * Get trends over time
   */
  async getTrends(match) {
    const monthly = await StudentCompany.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          avgMatchScore: { $avg: '$matchScore' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    return monthly.map(item => ({
      period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      count: item.count,
      avgMatchScore: item.avgMatchScore
    }));
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(companyId, period = 'month') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const match = {
        companyId,
        createdAt: { $gte: startDate, $lte: endDate }
      };

      const [
        relationships,
        interactions,
        collaborations,
        feedback,
        topStudents
      ] = await Promise.all([
        StudentCompany.find(match).populate('studentId', 'name email'),
        StudentCompanyInteraction.find(match).sort('-createdAt').limit(100),
        StudentCompanyCollaboration.find(match).populate('studentId', 'name'),
        StudentCompanyFeedback.find(match).populate('studentId', 'name'),
        StudentCompanyMatch.find({ companyId, status: 'accepted' })
          .sort('-matchScore')
          .limit(10)
          .populate('studentId', 'name email skills')
      ]);

      const report = {
        period: { start: startDate, end: endDate },
        summary: {
          totalRelationships: relationships.length,
          activeRelationships: relationships.filter(r => r.status === 'active').length,
          totalInteractions: interactions.length,
          totalCollaborations: collaborations.length,
          avgFeedbackScore: feedback.reduce((acc, f) => acc + f.ratings.overall, 0) / feedback.length || 0
        },
        topPerformingStudents: topStudents,
        interactionBreakdown: await this.getInteractionStats(match),
        feedbackSummary: await this.getFeedbackStats(match),
        recommendations: await this.generateRecommendations(companyId, relationships, feedback)
      };

      return report;
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on analytics
   */
  async generateRecommendations(companyId, relationships, feedback) {
    const recommendations = [];

    // Analyze engagement
    const lowEngagement = relationships.filter(r => 
      r.metrics?.engagementScore < 50 && r.status === 'active'
    );
    
    if (lowEngagement.length > 0) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        message: `${lowEngagement.length} active relationships have low engagement. Consider scheduling check-ins.`,
        action: 'review_engagement'
      });
    }

    // Analyze feedback
    const lowRatings = feedback.filter(f => f.ratings.overall < 3);
    if (lowRatings.length > 0) {
      recommendations.push({
        type: 'feedback',
        priority: 'high',
        message: `${lowRatings.length} feedback submissions with low ratings. Review and address concerns.`,
        action: 'review_feedback'
      });
    }

    // Analyze collaboration completion
    const delayedCollaborations = relationships.filter(r => 
      r.collaborationDetails?.endDate && 
      new Date(r.collaborationDetails.endDate) < new Date() &&
      r.status !== 'completed'
    );

    if (delayedCollaborations.length > 0) {
      recommendations.push({
        type: 'collaboration',
        priority: 'medium',
        message: `${delayedCollaborations.length} collaborations past due date. Follow up for completion.`,
        action: 'review_delayed'
      });
    }

    return recommendations;
  }
}

module.exports = new StudentCompanyAnalyticsService();