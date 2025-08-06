import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

// Test data for different scenarios
const testCases = [
  {
    name: 'Full Refund - JFK Centurion Lounge (2 hours before)',
    data: {
      product_id: 'PROD-001',
      booking_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    expected: {
      refund_policy: 'full_refund',
      refund_amount: 45.00,
      cancellation_fee: 0
    }
  },
  {
    name: 'Partial Refund - LAX Lounge (6 hours before)',
    data: {
      product_id: 'PROD-002',
      booking_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    expected: {
      refund_policy: '75_percent_refund',
      refund_amount: 26.25,
      cancellation_fee: 8.75
    }
  },
  {
    name: 'No Refund - ORD Lounge (25 hours before)',
    data: {
      product_id: 'PROD-003',
      booking_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    },
    expected: {
      refund_policy: 'no_refund',
      refund_amount: 0,
      cancellation_fee: 25.00
    }
  },
  {
    name: 'Airport Transfer - Full Refund (30 hours before)',
    data: {
      product_id: 'PROD-004',
      booking_time: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
    },
    expected: {
      refund_policy: 'full_refund',
      refund_amount: 85.00,
      cancellation_fee: 0
    }
  },
  {
    name: 'eSIM - Full Refund (not activated)',
    data: {
      product_id: 'PROD-005',
      booking_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    expected: {
      refund_policy: 'full_refund',
      refund_amount: 15.00,
      cancellation_fee: 0
    }
  }
];

async function testCancellationAPI() {
  console.log('🧪 Testing DragonPass Mock API with Cancellation Policies\n');

  for (const testCase of testCases) {
    try {
      console.log(`📋 Test: ${testCase.name}`);
      console.log(`📤 Request:`, JSON.stringify(testCase.data, null, 2));
      
      const response = await axios.post(`${BASE_URL}/api/v1/test-cancellation`, testCase.data);
      
      console.log(`📥 Response:`, JSON.stringify(response.data, null, 2));
      
      // Validate expected results
      const result = response.data;
      if (result.calculation.refund_policy === testCase.expected.refund_policy) {
        console.log('✅ Refund policy matches expected');
      } else {
        console.log(`❌ Refund policy mismatch. Expected: ${testCase.expected.refund_policy}, Got: ${result.calculation.refund_policy}`);
      }
      
      if (Math.abs(result.calculation.refund_amount - testCase.expected.refund_amount) < 0.01) {
        console.log('✅ Refund amount matches expected');
      } else {
        console.log(`❌ Refund amount mismatch. Expected: ${testCase.expected.refund_amount}, Got: ${result.calculation.refund_amount}`);
      }
      
      console.log('---\n');
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}\n`);
    }
  }
}

async function testHealthCheck() {
  try {
    console.log('🏥 Testing Health Check...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check Response:', response.data);
  } catch (error: any) {
    console.log('❌ Health Check Failed:', error.message);
  }
}

async function testGetProducts() {
  try {
    console.log('\n📦 Testing Get Products...');
    const response = await axios.get(`${BASE_URL}/api/v1/products`);
    console.log(`✅ Found ${response.data.count} products`);
    response.data.products.forEach((product: any) => {
      console.log(`  - ${product.id}: ${product.title} (${product.provider})`);
      console.log(`    Price: ${product.price.currency} ${product.price.amount}`);
      console.log(`    Cancellation Windows: ${product.cancellationPolicy.windows.length}`);
    });
  } catch (error: any) {
    console.log('❌ Get Products Failed:', error.message);
  }
}

async function testActualCancellation() {
  try {
    console.log('\n🔄 Testing Actual Cancellation...');
    
    const cancellationRequest = {
      product_id: 'PROD-001',
      booking_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    };
    
    const response = await axios.post(`${BASE_URL}/api/v1/cancellations`, cancellationRequest);
    console.log('✅ Cancellation Response:', JSON.stringify(response.data, null, 2));
    
    // Test getting the cancellation status
    const cancellationId = response.data.cancellation_id;
    const statusResponse = await axios.get(`${BASE_URL}/api/v1/cancellations/${cancellationId}`);
    console.log('✅ Cancellation Status:', JSON.stringify(statusResponse.data, null, 2));
    
  } catch (error: any) {
    console.log('❌ Actual Cancellation Failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
async function runTests() {
  await testHealthCheck();
  await testGetProducts();
  await testCancellationAPI();
  await testActualCancellation();
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testCancellationAPI, testHealthCheck, testGetProducts, testActualCancellation }; 