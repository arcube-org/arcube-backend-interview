#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

const TEST_EMAIL = 'vijaykumar4495@gmail.com';

async function testSendGridEmail(): Promise<void> {
  const correlationId = `test-email-${Date.now()}`;
  const testLogger = logger.child({ correlationId });

  testLogger.info('Starting SendGrid email test', {
    testEmail: TEST_EMAIL,
    environment: process.env.NODE_ENV
  });

  try {
    // Test 1: Send a simple test email
    testLogger.info('Sending test email...');
    
    const result = await emailService.sendTestEmail(TEST_EMAIL);
    
    if (result.success) {
      testLogger.info('✅ Test email sent successfully!', {
        messageId: result.messageId,
        testEmail: TEST_EMAIL
      });
      console.log('\n🎉 SUCCESS: Test email sent successfully!');
      console.log(`📧 Sent to: ${TEST_EMAIL}`);
      console.log(`🆔 Message ID: ${result.messageId || 'N/A'}`);
    } else {
      testLogger.error('❌ Test email failed', {
        error: result.error,
        statusCode: result.statusCode
      });
      console.log('\n❌ FAILED: Test email failed');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    testLogger.error('❌ Test email failed with exception', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.log('\n❌ FAILED: Test email failed with exception');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof Error && error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
  }

  // Test 2: Check SendGrid health status
  try {
    testLogger.info('Checking SendGrid health status...');
    
    const healthStatus = await emailService.getHealthStatus();
    
    testLogger.info('SendGrid health check completed', {
      status: healthStatus.status,
      error: healthStatus.error
    });
    
    console.log(`\n🏥 SendGrid Health Status: ${healthStatus.status.toUpperCase()}`);
    if (healthStatus.error) {
      console.log(`⚠️  Health Check Error: ${healthStatus.error}`);
    }
    
  } catch (error) {
    testLogger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.log(`\n❌ Health Check Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Send a cancellation notification email (example)
  try {
    testLogger.info('Sending cancellation notification email...');
    
    const cancellationResult = await emailService.sendCancellationNotification(
      TEST_EMAIL,
      'TEST-ORDER-123',
      'DragonPass Lounge Access',
      75.00,
      'USD'
    );
    
    if (cancellationResult.success) {
      testLogger.info('✅ Cancellation notification sent successfully!', {
        messageId: cancellationResult.messageId,
        testEmail: TEST_EMAIL
      });
      console.log('\n✅ SUCCESS: Cancellation notification sent successfully!');
      console.log(`📧 Sent to: ${TEST_EMAIL}`);
      console.log(`🆔 Message ID: ${cancellationResult.messageId || 'N/A'}`);
    } else {
      testLogger.error('❌ Cancellation notification failed', {
        error: cancellationResult.error,
        statusCode: cancellationResult.statusCode
      });
      console.log('\n❌ FAILED: Cancellation notification failed');
      console.log(`Error: ${cancellationResult.error}`);
    }
    
  } catch (error) {
    testLogger.error('❌ Cancellation notification failed with exception', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    console.log('\n❌ FAILED: Cancellation notification failed with exception');
    console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  testLogger.info('SendGrid email test completed');
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('\nCheck your email inbox for the test messages!');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSendGridEmail()
    .then(() => {
      console.log('\n✅ Email test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Email test script failed:', error);
      process.exit(1);
    });
}

export { testSendGridEmail }; 