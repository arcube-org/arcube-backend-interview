// Import the main environment configuration to ensure test environment is loaded
import './environment';

// Global test configuration
beforeEach(() => {
  // Reset any test-specific state
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Ensure NODE_ENV is set to test
  process.env.NODE_ENV = 'test';
  
  // Suppress console output during tests unless NODE_ENV=test-debug
  if (process.env.NODE_ENV !== 'test-debug') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console output
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}); 