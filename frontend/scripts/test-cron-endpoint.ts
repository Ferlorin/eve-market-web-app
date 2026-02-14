import axios from 'axios';

async function testCronEndpoint() {
  console.log('🧪 Testing cron endpoint...\n');
  
  const CRON_SECRET = process.env.CRON_SECRET || '920b800e664e79ec7e745affa9df7ca3449360b0e64cf6bf2b6adb98ecb74d0b';
  const url = 'http://localhost:3000/api/cron/fetch-markets';
  
  try {
    console.log('📡 Sending request to:', url);
    console.log('🔑 Using auth header\n');
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      timeout: 600000 // 10 minutes
    });
    
    console.log('✅ Cron endpoint responded successfully:\n');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n✅ Test passed!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Server error:', error.response.status);
      console.error('Response:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the dev server running?');
      console.error('   Run: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

testCronEndpoint();
