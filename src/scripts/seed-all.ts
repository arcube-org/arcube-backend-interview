#!/usr/bin/env ts-node

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { seedDatabase, checkSeedStatus, clearDefaultUsers } from '../utils/seed-database';
import { seedOrders, checkOrdersStatus } from './seed-orders';
import { env } from '../config/environment';

// Load environment variables

const runSeed = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database seeding script...');
    console.log(`📡 Connecting to database: ${env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Clear only default users before seeding
    console.log('🗑️  Clearing existing default users...');
    await clearDefaultUsers();
    
    // Run user seed
    console.log('\n👥 Seeding users...');
    await seedDatabase();
    
    // Check user status
    await checkSeedStatus();
    
    // Run orders seed
    console.log('\n🛒 Seeding orders...');
    await seedOrders();
    
    // Check orders status
    await checkOrdersStatus();
    
    console.log('\n🎉 Complete seeding process finished successfully!');
    console.log('📊 Summary:');
    console.log('   - Users created and verified');
    console.log('   - Orders created with sample products');
    console.log('   - Ready for testing cancellation system');
    
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

export { runSeed }; 