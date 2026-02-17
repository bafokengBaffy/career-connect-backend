// backend/controllers/companyExtendedController.js
const admin = require('firebase-admin');
const db = admin.firestore();

const COMPANY_COLLECTION = 'companies';
const COMPANY_FOLLOWERS_COLLECTION = 'company_followers';
const COMPANY_CHAT_COLLECTION = 'company_chat_messages';
const COMPANY_VIDEO_INTERVIEWS = 'company_video_interviews';
const COMPANY_AI_MATCHES = 'company_ai_matches';

exports.getCompanyFollowers = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const followersRef = db.collection(COMPANY_FOLLOWERS_COLLECTION);
    const snapshot = await followersRef
      .where('companyId', '==', companyId)
      .get();
    
    const followers = [];
    snapshot.forEach(doc => {
      followers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      data: followers,
      count: followers.length
    });
  } catch (error) {
    console.error('Error getting company followers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCompanyChats = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const chatsRef = db.collection(COMPANY_CHAT_COLLECTION);
    const snapshot = await chatsRef
      .where('companyId', '==', companyId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const chats = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      chats.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date()
      });
    });
    
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Error getting company chats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const { companyId, studentId, message, sender } = req.body;
    
    const chatRef = db.collection(COMPANY_CHAT_COLLECTION).doc();
    
    const chatData = {
      id: chatRef.id,
      companyId,
      studentId,
      message,
      sender,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      type: 'text'
    };
    
    await chatRef.set(chatData);
    
    res.json({
      success: true,
      data: chatData
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVideoInterviews = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const interviewsRef = db.collection(COMPANY_VIDEO_INTERVIEWS);
    const snapshot = await interviewsRef
      .where('companyId', '==', companyId)
      .orderBy('scheduledTime', 'desc')
      .get();
    
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
    
    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Error getting video interviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.scheduleVideoInterview = async (req, res) => {
  try {
    const interviewData = req.body;
    
    const interviewRef = db.collection(COMPANY_VIDEO_INTERVIEWS).doc();
    
    const data = {
      id: interviewRef.id,
      ...interviewData,
      status: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await interviewRef.set(data);
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error scheduling video interview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAIMatches = async (req, res) => {
  try {
    const { companyId, jobId } = req.params;
    
    const matchesRef = db.collection(COMPANY_AI_MATCHES);
    let query = matchesRef.where('companyId', '==', companyId);
    
    if (jobId) {
      query = query.where('jobId', '==', jobId);
    }
    
    const snapshot = await query
      .orderBy('matchScore', 'desc')
      .limit(20)
      .get();
    
    const matches = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        ...data,
        generatedAt: data.generatedAt?.toDate() || null
      });
    });
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('Error getting AI matches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateAIMatches = async (req, res) => {
  try {
    const { companyId, jobId } = req.body;
    
    // This would integrate with actual AI matching service
    // For now, return mock data
    const mockMatches = [
      {
        candidateId: 'candidate_1',
        matchScore: 92,
        skillsMatch: ['JavaScript', 'React', 'Node.js'],
        cultureFit: 88,
        predictedSuccess: 85
      },
      {
        candidateId: 'candidate_2',
        matchScore: 87,
        skillsMatch: ['Python', 'Django', 'PostgreSQL'],
        cultureFit: 82,
        predictedSuccess: 79
      }
    ];
    
    // Save matches to database
    const batch = db.batch();
    const matchesCollection = db.collection(COMPANY_AI_MATCHES);
    
    mockMatches.forEach((match, index) => {
      const matchRef = matchesCollection.doc();
      const matchData = {
        id: matchRef.id,
        companyId,
        jobId,
        ...match,
        status: 'pending',
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(matchRef, matchData);
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      data: mockMatches,
      message: 'AI matches generated successfully'
    });
  } catch (error) {
    console.error('Error generating AI matches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCompanyBranding = async (req, res) => {
  try {
    const { companyId } = req.params;
    const brandingData = req.body;
    
    const companyRef = db.collection(COMPANY_COLLECTION).doc(companyId);
    
    await companyRef.update({
      ...brandingData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const updatedDoc = await companyRef.get();
    
    res.json({
      success: true,
      data: updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating company branding:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCompanyAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { period = 'month' } = req.query;
    
    // Get company data
    const companyRef = db.collection(COMPANY_COLLECTION).doc(companyId);
    const companyDoc = await companyRef.get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    // Get job applications
    const applicationsRef = db.collection('applications');
    const applicationsSnapshot = await applicationsRef
      .where('companyId', '==', companyId)
      .get();
    
    const applications = [];
    applicationsSnapshot.forEach(doc => {
      applications.push(doc.data());
    });
    
    // Calculate analytics
    const totalApplications = applications.length;
    const hiredCount = applications.filter(app => app.status === 'hired').length;
    const interviewCount = applications.filter(app => app.status === 'interview').length;
    const newCount = applications.filter(app => app.status === 'applied' || app.status === 'pending').length;
    
    // Get job stats
    const jobsRef = db.collection('jobs');
    const jobsSnapshot = await jobsRef
      .where('companyId', '==', companyId)
      .get();
    
    const jobs = [];
    jobsSnapshot.forEach(doc => {
      jobs.push(doc.data());
    });
    
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(job => job.status === 'active').length;
    
    // Get followers count
    const followersRef = db.collection(COMPANY_FOLLOWERS_COLLECTION);
    const followersSnapshot = await followersRef
      .where('companyId', '==', companyId)
      .get();
    
    const totalFollowers = followersSnapshot.size;
    
    // Construct analytics response
    const analytics = {
      overview: {
        totalApplications,
        totalJobs,
        activeJobs,
        totalFollowers,
        hireRate: totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 100) : 0,
        interviewRate: totalApplications > 0 ? Math.round((interviewCount / totalApplications) * 100) : 0
      },
      pipeline: {
        new: newCount,
        interview: interviewCount,
        hired: hiredCount
      },
      timeSeries: generateTimeSeriesData(period),
      topSkills: ['JavaScript', 'React', 'Python', 'Node.js', 'MongoDB'],
      diversityMetrics: {
        gender: { male: 60, female: 40, other: 0 },
        ageGroups: { '18-24': 30, '25-34': 50, '35+': 20 }
      }
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting company analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function generateTimeSeriesData(period) {
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
}