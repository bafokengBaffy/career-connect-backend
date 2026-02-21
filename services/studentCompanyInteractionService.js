// @ts-nocheck
const StudentCompanyInteraction = require('../models/StudentCompanyInteraction');
const StudentCompany = require('../models/StudentCompany');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class StudentCompanyInteractionService {
  
  /**
   * Create a new interaction
   */
  async createInteraction(data) {
    try {
      const interaction = new StudentCompanyInteraction(data);
      await interaction.save();

      // Update relationship with interaction
      await StudentCompany.findByIdAndUpdate(
        data.relationshipId,
        {
          $push: {
            interactions: {
              type: data.type,
              date: new Date(),
              description: data.content?.text,
              initiatedBy: data.initiatedBy.type
            }
          }
        }
      );

      // Send notifications
      await this.sendInteractionNotifications(interaction);

      return interaction;
    } catch (error) {
      logger.error('Error creating interaction:', error);
      throw error;
    }
  }

  /**
   * Send notifications for new interaction
   */
  async sendInteractionNotifications(interaction) {
    try {
      const relationship = await StudentCompany.findById(interaction.relationshipId);
      
      const recipientId = interaction.initiatedBy.type === 'student' 
        ? relationship.companyId 
        : relationship.studentId;

      await notificationService.createNotification({
        userId: recipientId,
        type: 'new_interaction',
        title: `New ${interaction.type} from ${interaction.initiatedBy.name}`,
        message: interaction.content?.text?.substring(0, 100),
        data: {
          interactionId: interaction._id,
          relationshipId: interaction.relationshipId,
          type: interaction.type
        },
        priority: interaction.importance === 'high' ? 'high' : 'normal'
      });

      // Send email for important interactions
      if (interaction.importance === 'high' || interaction.type === 'offer') {
        await notificationService.sendEmail({
          to: recipientId,
          template: 'interaction_notification',
          data: {
            interaction,
            relationship
          }
        });
      }
    } catch (error) {
      logger.error('Error sending interaction notifications:', error);
    }
  }

  /**
   * Schedule an interaction (meeting, interview, etc.)
   */
  async scheduleInteraction(interactionId, scheduleData) {
    try {
      const interaction = await StudentCompanyInteraction.findById(interactionId);
      
      interaction.scheduledFor = scheduleData.dateTime;
      interaction.metadata = {
        ...interaction.metadata,
        location: scheduleData.location,
        meetingLink: scheduleData.meetingLink,
        duration: scheduleData.duration,
        agenda: scheduleData.agenda
      };
      interaction.status = 'scheduled';

      await interaction.save();

      // Create calendar events
      await this.createCalendarEvents(interaction, scheduleData);

      return interaction;
    } catch (error) {
      logger.error('Error scheduling interaction:', error);
      throw error;
    }
  }

  /**
   * Create calendar events for scheduled interaction
   */
  async createCalendarEvents(interaction, scheduleData) {
    try {
      // Integration with Google Calendar / Outlook Calendar
      // This is a placeholder for calendar integration
      logger.info(`Calendar events created for interaction: ${interaction._id}`);
    } catch (error) {
      logger.error('Error creating calendar events:', error);
    }
  }

  /**
   * Get interaction thread/conversation
   */
  async getInteractionThread(interactionId) {
    try {
      const interaction = await StudentCompanyInteraction.findById(interactionId);
      
      // Get all related interactions
      const thread = await StudentCompanyInteraction.find({
        $or: [
          { _id: interactionId },
          { 'relatedTo.interactionId': interactionId },
          { _id: interaction.relatedTo?.interactionId }
        ]
      }).sort('createdAt');

      return thread;
    } catch (error) {
      logger.error('Error getting interaction thread:', error);
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId, userType) {
    try {
      const query = {};
      
      if (userType === 'student') {
        query.studentId = userId;
      } else {
        query.companyId = userId;
      }

      query['participants'] = {
        $elemMatch: {
          type: userType,
          userId: userId,
          readAt: null
        }
      };

      const count = await StudentCompanyInteraction.countDocuments(query);

      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark all interactions as read for a relationship
   */
  async markAllAsRead(relationshipId, userId, userType) {
    try {
      await StudentCompanyInteraction.updateMany(
        {
          relationshipId,
          'participants': {
            $elemMatch: {
              type: userType,
              userId: userId,
              readAt: null
            }
          }
        },
        {
          $set: {
            'participants.$.readAt': new Date(),
            'participants.$.status': 'read'
          }
        }
      );

      return true;
    } catch (error) {
      logger.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Get interaction summary for a relationship
   */
  async getInteractionSummary(relationshipId) {
    try {
      const interactions = await StudentCompanyInteraction.find({ relationshipId });

      const summary = {
        total: interactions.length,
        byType: {},
        byMonth: {},
        responseTime: null,
        lastInteraction: null,
        mostActiveMonth: null,
        sentimentTrend: []
      };

      // Calculate statistics
      interactions.forEach(interaction => {
        // By type
        summary.byType[interaction.type] = (summary.byType[interaction.type] || 0) + 1;

        // By month
        const month = interaction.createdAt.toISOString().substring(0, 7);
        summary.byMonth[month] = (summary.byMonth[month] || 0) + 1;

        // Sentiment
        if (interaction.sentiment) {
          summary.sentimentTrend.push({
            date: interaction.createdAt,
            score: interaction.sentiment.score
          });
        }

        // Last interaction
        if (!summary.lastInteraction || 
            interaction.createdAt > summary.lastInteraction.createdAt) {
          summary.lastInteraction = {
            id: interaction._id,
            type: interaction.type,
            date: interaction.createdAt,
            initiatedBy: interaction.initiatedBy.type
          };
        }
      });

      // Find most active month
      if (Object.keys(summary.byMonth).length > 0) {
        summary.mostActiveMonth = Object.entries(summary.byMonth)
          .sort((a, b) => b[1] - a[1])[0][0];
      }

      return summary;
    } catch (error) {
      logger.error('Error getting interaction summary:', error);
      throw error;
    }
  }

  /**
   * Send reminder for upcoming interactions
   */
  async sendReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const upcoming = await StudentCompanyInteraction.find({
        scheduledFor: {
          $gte: tomorrow,
          $lt: dayAfter
        },
        status: 'scheduled'
      }).populate('studentId companyId');

      for (const interaction of upcoming) {
        await notificationService.createNotification({
          userId: interaction.studentId._id,
          type: 'interaction_reminder',
          title: 'Upcoming Interaction Reminder',
          message: `You have a ${interaction.type} scheduled for tomorrow`,
          data: {
            interactionId: interaction._id
          }
        });

        await notificationService.createNotification({
          userId: interaction.companyId._id,
          type: 'interaction_reminder',
          title: 'Upcoming Interaction Reminder',
          message: `You have a ${interaction.type} scheduled for tomorrow`,
          data: {
            interactionId: interaction._id
          }
        });
      }

      logger.info(`Sent reminders for ${upcoming.length} interactions`);
    } catch (error) {
      logger.error('Error sending reminders:', error);
    }
  }
}

module.exports = new StudentCompanyInteractionService();    