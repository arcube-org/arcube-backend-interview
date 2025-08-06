#!/usr/bin/env ts-node

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { seedDatabase, checkSeedStatus } from '../utils/seed-database';
import { env } from '../config/environment';

// Load environment variables

const runSeed = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database seeding script...');
    console.log(`📡 Connecting to database: ${env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Run seed
    await seedDatabase();
    
    // Check status
    await checkSeedStatus();
    
    console.log('✅ Seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seed script
if (require.main === module) {
  runSeed();
} 