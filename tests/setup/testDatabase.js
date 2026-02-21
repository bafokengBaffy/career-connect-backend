// @ts-nocheck
/**
 * In-memory MongoDB for testing
 * Provides isolated database for each test suite
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to in-memory database
 */
const connectDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to in-memory database');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Disconnected from in-memory database');
  } catch (error) {
    console.error('Database disconnection error:', error);
    throw error;
  }
};

/**
 * Clear all collections
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Create test document
 */
const createTestDocument = async (model, data) => {
  return await model.create(data);
};

/**
 * Create multiple test documents
 */
const createTestDocuments = async (model, dataArray) => {
  return await model.insertMany(dataArray);
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDatabase,
  createTestDocument,
  createTestDocuments,
};