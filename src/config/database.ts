import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { env } from './environment';

// Database connection options
const connectionOptions: ConnectOptions = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  bufferCommands: false, // Disable mongoose buffering
  autoIndex: true, // Build indexes
  autoCreate: true, // Create collections if they don't exist
};

// Database connection state
let dbConnection: Connection | null = null;
let isConnecting = false;
let connectionPromise: Promise<Connection> | null = null;

// Connection event handlers
const setupConnectionHandlers = (connection: Connection): void => {
  connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
  });

  connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });

  connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
  });

  connection.on('close', () => {
    console.log('🔒 MongoDB connection closed');
  });
};

// Connect to MongoDB
export const connectToDatabase = async (): Promise<Connection> => {
  // Return existing connection if available
  if (dbConnection && dbConnection.readyState === 1) {
    return dbConnection;
  }

  // Return existing promise if connecting
  if (connectionPromise) {
    return connectionPromise;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    throw new Error('Database connection already in progress');
  }

  isConnecting = true;

  try {
    console.log('🔌 Connecting to MongoDB...');
    
    connectionPromise = mongoose.connect(env.MONGODB_URI, connectionOptions);
    const connection = await connectionPromise;
    
    dbConnection = connection;
    setupConnectionHandlers(connection);
    
    console.log(`📊 Connected to MongoDB database: ${env.MONGODB_DB_NAME}`);
    
    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
};

// Get database connection
export const getDatabaseConnection = (): Connection | null => {
  return dbConnection;
};

// Check if database is connected
export const isDatabaseConnected = (): boolean => {
  return dbConnection?.readyState === 1;
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  if (dbConnection) {
    try {
      console.log('🔄 Disconnecting from MongoDB...');
      await mongoose.disconnect();
      dbConnection = null;
      console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
};

// Health check for database
export const checkDatabaseHealth = async (): Promise<'healthy' | 'unhealthy'> => {
  try {
    if (!isDatabaseConnected()) {
      return 'unhealthy';
    }

    // Ping the database
    await mongoose.connection.db.admin().ping();
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
};

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Export database instance for use throughout the application
export const db = {
  connection: getDatabaseConnection,
  isConnected: isDatabaseConnected,
  health: checkDatabaseHealth,
  connect: connectToDatabase,
  disconnect: disconnectDatabase,
  initialize: initializeDatabase,
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});
