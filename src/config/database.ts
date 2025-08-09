import mongoose from 'mongoose';
import { env } from './environment';

// MongoDB connection options
const mongoOptions: mongoose.ConnectOptions = {
  dbName: env.MONGODB_DB_NAME,
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  bufferCommands: false, // Disable mongoose buffering
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads
};

// Database connection class
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionPromise: Promise<typeof mongoose> | null = null;

  private constructor() {
    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Setup MongoDB connection event handlers
  private setupEventHandlers(): void {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Handle application termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  // Connect to MongoDB
  public async connect(): Promise<typeof mongoose> {
    if (this.isConnected) {
      console.log('📊 MongoDB already connected');
      return mongoose;
    }

    if (this.connectionPromise) {
      console.log('⏳ MongoDB connection in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 URI: ${env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log(`🗄️ Database: ${env.MONGODB_DB_NAME}`);

    try {
      this.connectionPromise = mongoose.connect(env.MONGODB_URI, mongoOptions);
      await this.connectionPromise;
      return mongoose;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      this.connectionPromise = null;
      throw error;
    }
  }

  // Disconnect from MongoDB
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('📊 MongoDB already disconnected');
      return;
    }

    console.log('🔌 Disconnecting from MongoDB...');
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  // Graceful shutdown
  private async gracefulShutdown(): Promise<void> {
    console.log('🛑 Received shutdown signal, closing MongoDB connection...');
    try {
      await this.disconnect();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  // Check if database is connected
  public isDatabaseConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // Get connection status
  public getConnectionStatus(): {
    connected: boolean;
    readyState: number;
    host: string;
    name: string;
  } {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
    };
  }

  // Health check for database
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      if (!this.isDatabaseConnected()) {
        return { status: 'unhealthy', details: 'Database not connected' };
      }

      // Ping the database
      const db = mongoose.connection.db;
      if (!db) {
        return { status: 'unhealthy', details: 'Database instance not available' };
      }
      
      await db.admin().ping();
      return { status: 'healthy', details: 'Database connection is healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export mongoose for direct access if needed
export { mongoose };

// Export connection status type
export type DatabaseStatus = ReturnType<typeof db.getConnectionStatus>;
