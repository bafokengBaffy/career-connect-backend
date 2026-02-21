// config/rate-limit.js
module.exports = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: 'Global rate limit exceeded'
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    skipSuccessful: true,
    message: 'Authentication rate limit exceeded'
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Upload rate limit exceeded'
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'API rate limit exceeded'
  },
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Sensitive operation limit exceeded'
  }
};