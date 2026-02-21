// @ts-nocheck
/**
 * Redis Mock
 * Mocks Redis for testing
 */

const setupRedisMock = () => {
  const mockRedis = {
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(3600),
    exists: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };

  const mockRedisClient = {
    ...mockRedis,
    connect: jest.fn().mockResolvedValue(),
    isOpen: true,
  };

  const mockSessionStore = {
    get: jest.fn().mockImplementation((sid, cb) => cb(null, {})),
    set: jest.fn().mockImplementation((sid, sess, cb) => cb(null)),
    destroy: jest.fn().mockImplementation((sid, cb) => cb(null)),
    all: jest.fn().mockImplementation((cb) => cb(null, [])),
    length: jest.fn().mockImplementation((cb) => cb(null, 0)),
    clear: jest.fn().mockImplementation((cb) => cb(null)),
  };

  jest.mock('redis', () => ({
    createClient: jest.fn().mockReturnValue(mockRedisClient),
  }));

  jest.mock('connect-redis', () => {
    return jest.fn().mockImplementation(() => {
      return jest.fn().mockImplementation(() => mockSessionStore);
    });
  });

  jest.mock('../../middleware', () => ({
    ...jest.requireActual('../../middleware'),
    initializeRedis: jest.fn().mockResolvedValue({
      redisClient: mockRedisClient,
      sessionStore: mockSessionStore,
    }),
  }));
};

module.exports = { setupRedisMock };