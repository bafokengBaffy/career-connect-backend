// middleware/fileUploadValidation.js
const path = require('path');
const logger = require('../utils/logger');

/**
 * File Upload Validation Middleware
 * Validates file types, sizes, and extensions
 */
const fileUploadValidation = (req, res, next) => {
  if (!req.file && !req.files) return next();
  
  const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : Object.values(req.files).flat());
  
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  for (const file of files) {
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn('Invalid file type rejected', {
        mimetype: file.mimetype,
        filename: file.originalname,
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        allowedTypes: allowedMimeTypes
      });
    }
    
    // Check file size
    if (file.size > maxSize) {
      logger.warn('File too large rejected', {
        size: file.size,
        filename: file.originalname,
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'File too large',
        maxSize: `${maxSize / (1024 * 1024)}MB`
      });
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
    if (!allowedExtensions.includes(ext)) {
      logger.warn('Invalid file extension rejected', {
        extension: ext,
        filename: file.originalname,
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid file extension'
      });
    }
    
    // Check for malicious content (basic signature check)
    if (file.buffer && file.buffer.length > 0) {
      // Check for PHP code in images (basic)
      const buffer = file.buffer.toString().substring(0, 100);
      if (buffer.includes('<?php') || buffer.includes('<script')) {
        logger.warn('Malicious content detected in file', {
          filename: file.originalname,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          error: 'File contains invalid content'
        });
      }
    }
  }
  
  next();
};

module.exports = fileUploadValidation;