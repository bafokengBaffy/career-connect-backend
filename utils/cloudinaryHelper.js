// utils/cloudinaryHelper.js
const cloudinary = require('../config/cloudinary');

class CloudinaryHelper {
  static async uploadBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'career-connect',
          resource_type: 'auto',
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
  }

  static async deleteFile(publicId) {
    return await cloudinary.uploader.destroy(publicId);
  }

  static generateUrl(publicId, transformations = []) {
    return cloudinary.url(publicId, {
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        ...transformations
      ]
    });
  }

  static async uploadFromUrl(url, options = {}) {
    return await cloudinary.uploader.upload(url, {
      folder: 'career-connect',
      resource_type: 'auto',
      ...options
    });
  }

  // Create image transformations
  static getAvatarTransformations() {
    return [
      { width: 200, height: 200, crop: 'thumb', gravity: 'face' },
      { radius: 'max' }
    ];
  }

  static getCompanyLogoTransformations() {
    return [
      { width: 300, height: 300, crop: 'fill' },
      { quality: 'auto' }
    ];
  }

  static getDocumentTransformations() {
    return [
      { flags: 'attachment:resume' }, // Forces download with resume filename
      { quality: 'auto:good' }
    ];
  }
}

module.exports = CloudinaryHelper;