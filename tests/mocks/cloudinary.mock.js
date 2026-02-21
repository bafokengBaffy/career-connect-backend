// @ts-nocheck
/**
 * Cloudinary Mock
 * Mocks Cloudinary for testing
 */

const setupCloudinaryMock = () => {
  const mockCloudinary = {
    v2: {
      uploader: {
        upload: jest.fn().mockResolvedValue({
          secure_url: 'https://test-cloudinary.com/image.jpg',
          public_id: 'test-public-id',
          width: 800,
          height: 600,
          format: 'jpg',
          bytes: 1024,
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
        upload_stream: jest.fn().mockImplementation((options, callback) => {
          callback(null, { secure_url: 'test-url', public_id: 'test-id' });
        }),
      },
      api: {
        delete_resources: jest.fn().mockResolvedValue({ deleted: ['test-id'] }),
      },
      url: jest.fn().mockReturnValue('https://test-cloudinary.com/image.jpg'),
    },
    config: jest.fn(),
  };

  jest.mock('cloudinary', () => mockCloudinary);
  jest.mock('../../config/cloudinary', () => ({
    cloudinary: mockCloudinary.v2,
  }));
};

module.exports = { setupCloudinaryMock };