// @ts-nocheck
// frontend/src/services/companyExtendedServices.js
import { auth, db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

const COMPANY_FOLLOWERS_COLLECTION = 'company_followers';
const COMPANY_CHAT_COLLECTION = 'company_chat_messages';
const COMPANY_VIDEO_INTERVIEWS = 'company_video_interviews';
const COMPANY_AI_MATCHES = 'company_ai_matches';
const COMPANY_BRANDING_ASSETS = 'company_branding_assets';

// Followers Service
export const followersService = {
  async getCompanyFollowers(companyId) {
    try {
      const followersRef = collection(db, COMPANY_FOLLOWERS_COLLECTION);
      const q = query(
        followersRef,
        where('companyId', '==', companyId),
        orderBy('followedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const followers = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        followers.push({
          id: doc.id,
          ...data,
          followedAt: data.followedAt?.toDate() || new Date()
        });
      });
      
      return {
        success: true,
        data: followers,
        count: followers.length
      };
    } catch (error) {
      console.error('Error getting company followers:', error);
      return { success: false, error: error.message };
    }
  },
  
  async addFollower(companyId, studentId) {
    try {
      const followersRef = collection(db, COMPANY_FOLLOWERS_COLLECTION);
      
      const followerData = {
        companyId,
        studentId,
        followedAt: serverTimestamp(),
        status: 'active',
        notifications: true,
        lastEngaged: serverTimestamp()
      };
      
      const docRef = await addDoc(followersRef, followerData);
      
      return {
        success: true,
        data: { id: docRef.id, ...followerData }
      };
    } catch (error) {
      console.error('Error adding follower:', error);
      return { success: false, error: error.message };
    }
  },
  
  async removeFollower(followerId) {
    try {
      const followerRef = doc(db, COMPANY_FOLLOWERS_COLLECTION, followerId);
      await updateDoc(followerRef, {
        status: 'inactive',
        unfollowedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing follower:', error);
      return { success: false, error: error.message };
    }
  },
  
  subscribeToFollowers(companyId, callback) {
    const followersRef = collection(db, COMPANY_FOLLOWERS_COLLECTION);
    const q = query(
      followersRef,
      where('companyId', '==', companyId),
      where('status', '==', 'active'),
      orderBy('followedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const followers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        followers.push({
          id: doc.id,
          ...data,
          followedAt: data.followedAt?.toDate() || new Date()
        });
      });
      callback(followers);
    });
  }
};

// Chat Service
export const chatService = {
  async getChatHistory(companyId, studentId = null) {
    try {
      const chatsRef = collection(db, COMPANY_CHAT_COLLECTION);
      let q;
      
      if (studentId) {
        q = query(
          chatsRef,
          where('companyId', '==', companyId),
          where('studentId', '==', studentId),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      } else {
        q = query(
          chatsRef,
          where('companyId', '==', companyId),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      }
      
      const snapshot = await getDocs(q);
      const chats = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      return {
        success: true,
        data: chats.reverse() // Reverse to show oldest first
      };
    } catch (error) {
      console.error('Error getting chat history:', error);
      return { success: false, error: error.message };
    }
  },
  
  async sendMessage(companyId, studentId, message, sender = 'company') {
    try {
      const chatsRef = collection(db, COMPANY_CHAT_COLLECTION);
      
      const messageData = {
        companyId,
        studentId,
        message,
        sender,
        timestamp: serverTimestamp(),
        read: false,
        type: 'text'
      };
      
      const docRef = await addDoc(chatsRef, messageData);
      
      return {
        success: true,
        data: { id: docRef.id, ...messageData }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },
  
  async markAsRead(messageId) {
    try {
      const messageRef = doc(db, COMPANY_CHAT_COLLECTION, messageId);
      await updateDoc(messageRef, {
        read: true,
        readAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { success: false, error: error.message };
    }
  },
  
  subscribeToChats(companyId, studentId, callback) {
    const chatsRef = collection(db, COMPANY_CHAT_COLLECTION);
    const q = query(
      chatsRef,
      where('companyId', '==', companyId),
      where('studentId', '==', studentId),
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      callback(messages);
    });
  }
};

// Video Interviews Service
export const videoInterviewService = {
  async getInterviews(companyId) {
    try {
      const interviewsRef = collection(db, COMPANY_VIDEO_INTERVIEWS);
      const q = query(
        interviewsRef,
        where('companyId', '==', companyId),
        orderBy('scheduledTime', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const interviews = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        interviews.push({
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null
        });
      });
      
      return {
        success: true,
        data: interviews
      };
    } catch (error) {
      console.error('Error getting video interviews:', error);
      return { success: false, error: error.message };
    }
  },
  
  async scheduleInterview(interviewData) {
    try {
      const interviewsRef = collection(db, COMPANY_VIDEO_INTERVIEWS);
      
      const data = {
        ...interviewData,
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(interviewsRef, data);
      
      return {
        success: true,
        data: { id: docRef.id, ...data }
      };
    } catch (error) {
      console.error('Error scheduling interview:', error);
      return { success: false, error: error.message };
    }
  },
  
  async updateInterview(interviewId, updates) {
    try {
      const interviewRef = doc(db, COMPANY_VIDEO_INTERVIEWS, interviewId);
      
      await updateDoc(interviewRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating interview:', error);
      return { success: false, error: error.message };
    }
  },
  
  async cancelInterview(interviewId, reason) {
    try {
      const interviewRef = doc(db, COMPANY_VIDEO_INTERVIEWS, interviewId);
      
      await updateDoc(interviewRef, {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error cancelling interview:', error);
      return { success: false, error: error.message };
    }
  },
  
  subscribeToInterviews(companyId, callback) {
    const interviewsRef = collection(db, COMPANY_VIDEO_INTERVIEWS);
    const q = query(
      interviewsRef,
      where('companyId', '==', companyId),
      orderBy('scheduledTime', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const interviews = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        interviews.push({
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null
        });
      });
      callback(interviews);
    });
  }
};

// AI Matching Service
export const aiMatchingService = {
  async getMatches(companyId, jobId = null) {
    try {
      const matchesRef = collection(db, COMPANY_AI_MATCHES);
      let q;
      
      if (jobId) {
        q = query(
          matchesRef,
          where('companyId', '==', companyId),
          where('jobId', '==', jobId),
          orderBy('matchScore', 'desc'),
          limit(20)
        );
      } else {
        q = query(
          matchesRef,
          where('companyId', '==', companyId),
          orderBy('matchScore', 'desc'),
          limit(20)
        );
      }
      
      const snapshot = await getDocs(q);
      const matches = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        matches.push({
          id: doc.id,
          ...data,
          generatedAt: data.generatedAt?.toDate() || null
        });
      });
      
      return {
        success: true,
        data: matches
      };
    } catch (error) {
      console.error('Error getting AI matches:', error);
      return { success: false, error: error.message };
    }
  },
  
  async generateMatches(companyId, jobId) {
    try {
      // In a real implementation, this would call an AI service
      // For now, return mock data
      const mockMatches = [
        {
          candidateId: 'candidate_1',
          candidateName: 'John Doe',
          matchScore: 92,
          skillsMatch: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
          cultureFit: 88,
          predictedSuccess: 85,
          educationMatch: 90,
          experienceMatch: 87
        },
        {
          candidateId: 'candidate_2',
          candidateName: 'Sarah Smith',
          matchScore: 87,
          skillsMatch: ['Python', 'Django', 'PostgreSQL', 'AWS'],
          cultureFit: 82,
          predictedSuccess: 79,
          educationMatch: 85,
          experienceMatch: 89
        },
        {
          candidateId: 'candidate_3',
          candidateName: 'Michael Brown',
          matchScore: 83,
          skillsMatch: ['Java', 'Spring Boot', 'MySQL', 'Docker'],
          cultureFit: 85,
          predictedSuccess: 81,
          educationMatch: 88,
          experienceMatch: 80
        }
      ];
      
      // Save matches to database
      const matchesRef = collection(db, COMPANY_AI_MATCHES);
      
      for (const match of mockMatches) {
        const matchData = {
          companyId,
          jobId,
          ...match,
          status: 'pending',
          generatedAt: serverTimestamp(),
          reviewed: false
        };
        
        await addDoc(matchesRef, matchData);
      }
      
      return {
        success: true,
        data: mockMatches,
        message: 'AI matches generated successfully'
      };
    } catch (error) {
      console.error('Error generating AI matches:', error);
      return { success: false, error: error.message };
    }
  },
  
  async updateMatchStatus(matchId, status, notes = '') {
    try {
      const matchRef = doc(db, COMPANY_AI_MATCHES, matchId);
      
      await updateDoc(matchRef, {
        status,
        notes,
        reviewed: true,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating match status:', error);
      return { success: false, error: error.message };
    }
  }
};

// Branding Service
export const brandingService = {
  async updateCompanyBranding(companyId, brandingData) {
    try {
      const companyRef = doc(db, 'companies', companyId);
      
      await updateDoc(companyRef, {
        ...brandingData,
        updatedAt: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(companyRef);
      
      return {
        success: true,
        data: updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating company branding:', error);
      return { success: false, error: error.message };
    }
  },
  
  async uploadBrandingAsset(companyId, assetData) {
    try {
      const assetsRef = collection(db, COMPANY_BRANDING_ASSETS);
      
      const asset = {
        companyId,
        ...assetData,
        uploadedAt: serverTimestamp(),
        status: 'active'
      };
      
      const docRef = await addDoc(assetsRef, asset);
      
      return {
        success: true,
        data: { id: docRef.id, ...asset }
      };
    } catch (error) {
      console.error('Error uploading branding asset:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getBrandingAssets(companyId) {
    try {
      const assetsRef = collection(db, COMPANY_BRANDING_ASSETS);
      const q = query(
        assetsRef,
        where('companyId', '==', companyId),
        where('status', '==', 'active'),
        orderBy('uploadedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const assets = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        assets.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate() || new Date()
        });
      });
      
      return {
        success: true,
        data: assets
      };
    } catch (error) {
      console.error('Error getting branding assets:', error);
      return { success: false, error: error.message };
    }
  }
};

// Analytics Service
export const analyticsService = {
  async getCompanyAnalytics(companyId, period = 'month') {
    try {
      // Get company data
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        return { success: false, error: 'Company not found' };
      }
      
      // Get applications
      const applicationsRef = collection(db, 'applications');
      const applicationsQuery = query(
        applicationsRef,
        where('companyId', '==', companyId)
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      const applications = [];
      applicationsSnapshot.forEach(doc => {
        applications.push(doc.data());
      });
      
      // Get jobs
      const jobsRef = collection(db, 'jobs');
      const jobsQuery = query(
        jobsRef,
        where('companyId', '==', companyId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      
      const jobs = [];
      jobsSnapshot.forEach(doc => {
        jobs.push(doc.data());
      });
      
      // Get followers
      const followersRef = collection(db, COMPANY_FOLLOWERS_COLLECTION);
      const followersQuery = query(
        followersRef,
        where('companyId', '==', companyId),
        where('status', '==', 'active')
      );
      const followersSnapshot = await getDocs(followersQuery);
      
      // Calculate analytics
      const totalApplications = applications.length;
      const hiredCount = applications.filter(app => app.status === 'hired').length;
      const interviewCount = applications.filter(app => app.status === 'interview').length;
      const newCount = applications.filter(app => app.status === 'applied' || app.status === 'pending').length;
      
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(job => job.status === 'active').length;
      const totalFollowers = followersSnapshot.size;
      
      // Generate time series data
      const timeSeries = this.generateTimeSeriesData(period);
      
      // Get top skills from candidates
      const topSkills = this.extractTopSkills(applications);
      
      // Construct analytics response
      const analytics = {
        overview: {
          totalApplications,
          totalJobs,
          activeJobs,
          totalFollowers,
          hireRate: totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 100) : 0,
          interviewRate: totalApplications > 0 ? Math.round((interviewCount / totalApplications) * 100) : 0,
          avgTimeToHire: 14, // This would be calculated from actual data
          avgResponseTime: 2.3
        },
        pipeline: {
          new: newCount,
          interview: interviewCount,
          hired: hiredCount,
          rejected: applications.filter(app => app.status === 'rejected').length,
          withdrawn: applications.filter(app => app.status === 'withdrawn').length
        },
        timeSeries,
        topSkills,
        jobPerformance: jobs.map(job => ({
          id: job.id,
          title: job.title,
          applications: job.applicantsCount || 0,
          views: job.views || 0,
          conversionRate: job.applicantsCount > 0 ? Math.round((hiredCount / job.applicantsCount) * 100) : 0
        })),
        diversityMetrics: {
          gender: { male: 60, female: 40, other: 0 },
          ageGroups: { '18-24': 30, '25-34': 50, '35+': 20 },
          education: { highSchool: 20, diploma: 30, bachelor: 40, masters: 10 }
        }
      };
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('Error getting company analytics:', error);
      return { success: false, error: error.message };
    }
  },
  
  generateTimeSeriesData(period) {
    const now = new Date();
    const data = [];
    
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          applications: Math.floor(Math.random() * 20) + 5,
          interviews: Math.floor(Math.random() * 10) + 2,
          hires: Math.floor(Math.random() * 5) + 1
        });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          applications: Math.floor(Math.random() * 15) + 3,
          interviews: Math.floor(Math.random() * 8) + 1,
          hires: Math.floor(Math.random() * 3)
        });
      }
    } else { // year
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        data.push({
          date: date.toISOString().substring(0, 7),
          applications: Math.floor(Math.random() * 100) + 30,
          interviews: Math.floor(Math.random() * 50) + 15,
          hires: Math.floor(Math.random() * 20) + 5
        });
      }
    }
    
    return data;
  },
  
  extractTopSkills(applications) {
    const skillCounts = {};
    
    applications.forEach(app => {
      if (app.candidate?.skills) {
        app.candidate.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });
    
    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
  }
};

export default {
  followersService,
  chatService,
  videoInterviewService,
  aiMatchingService,
  brandingService,
  analyticsService
};