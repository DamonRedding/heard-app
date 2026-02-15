#!/usr/bin/env node

// Test script to verify API connection to production

const API_URL = 'https://churchheard.com';

async function testConnection() {
  console.log('Testing connection to:', API_URL);
  console.log('----------------------------');

  try {
    // Test 1: Basic connectivity
    console.log('1. Testing basic connectivity...');
    const response = await fetch(`${API_URL}/api/submissions?limit=1`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`   ✅ Success! Found ${data.total || 0} total submissions`);

    // Test 2: CORS headers
    console.log('\n2. Checking CORS headers...');
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
      'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers'),
    };
    console.log('   CORS headers:', corsHeaders);

    if (!corsHeaders['Access-Control-Allow-Origin']) {
      console.log('   ⚠️  WARNING: No CORS headers found. You may need to add them to your production server.');
    }

    // Test 3: Preflight request
    console.log('\n3. Testing preflight request...');
    const preflightResponse = await fetch(`${API_URL}/api/submissions`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        'Origin': 'http://localhost:5173'
      }
    });
    console.log(`   Preflight status: ${preflightResponse.status}`);

    console.log('\n✅ Connection test complete!');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check that your production server is running');
    console.error('2. Verify the URL is correct');
    console.error('3. Ensure CORS is configured on your server');
    console.error('4. Check for any firewall or security settings');
  }
}

// Run the test
testConnection();