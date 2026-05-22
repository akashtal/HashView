// Test setup and global configuration
require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Increase timeout for all tests (in-memory MongoDB download/startup can take time)
jest.setTimeout(60000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

let mongoServer;

// Override mongoose.connect to intercept any database connection attempt in the tests
// and redirect it to the mongodb-memory-server instance.
const originalConnect = mongoose.connect;
mongoose.connect = async function (uri, options) {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    uri = mongoUri;
  }
  return originalConnect.call(mongoose, uri, options);
};

beforeAll(async () => {
  // Close any existing connection that might have been opened previously
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  // Connect to trigger the MongoMemoryServer initialization and override process.env.MONGODB_URI
  await mongoose.connect();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

