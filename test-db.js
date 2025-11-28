// Test script for Upstash KV database connectivity
// Run with: node test-db.js

// Hardcoded from .env.local (since Node.js doesn't read Vite env files)
const KV_REST_API_URL = 'https://immune-mollusk-40593.upstash.io';
const KV_REST_API_TOKEN = 'AZ6RAAIncDJjYmU3MTM5Mjg3YWU0ZjI1YjZjZGRjNjQxYjEzZTUyMnAyNDA1OTM';

console.log('=== Database Connection Test ===\n');
console.log('Environment Variables:');
console.log('KV_REST_API_URL:', KV_REST_API_URL ? '✓ Set' : '✗ Missing');
console.log('KV_REST_API_TOKEN:', KV_REST_API_TOKEN ? '✓ Set' : '✗ Missing');
console.log('');

async function testKVConnection() {
    console.log('Testing KV Connection...\n');

    // Test 1: SET operation
    console.log('Test 1: SET operation');
    try {
        const testKey = 'test_connection';
        const testValue = { status: 'ok', timestamp: Date.now() };

        const setResponse = await fetch(KV_REST_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', testKey, JSON.stringify(testValue)])
        });

        const setData = await setResponse.json();
        console.log('SET Response:', setData);

        if (setData.result === 'OK') {
            console.log('✓ SET operation successful\n');
        } else {
            console.log('✗ SET operation failed\n');
            return false;
        }
    } catch (error) {
        console.error('✗ SET operation error:', error.message);
        return false;
    }

    // Test 2: GET operation
    console.log('Test 2: GET operation');
    try {
        const testKey = 'test_connection';

        const getResponse = await fetch(KV_REST_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', testKey])
        });

        const getData = await getResponse.json();
        console.log('GET Response:', getData);

        if (getData.result) {
            const parsed = JSON.parse(getData.result);
            console.log('Retrieved value:', parsed);
            console.log('✓ GET operation successful\n');
        } else {
            console.log('✗ GET operation failed - no result\n');
            return false;
        }
    } catch (error) {
        console.error('✗ GET operation error:', error.message);
        return false;
    }

    // Test 3: User data operations
    console.log('Test 3: User data operations');
    try {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const userData = {
            lastCheckIn: Date.now(),
            streak: 5,
            xp: 250
        };

        // SET user data
        const setUserResponse = await fetch(KV_REST_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', `user:${testAddress.toLowerCase()}:data`, JSON.stringify(userData)])
        });

        const setUserData = await setUserResponse.json();
        console.log('SET User Data Response:', setUserData);

        // GET user data
        const getUserResponse = await fetch(KV_REST_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['GET', `user:${testAddress.toLowerCase()}:data`])
        });

        const getUserData = await getUserResponse.json();
        console.log('GET User Data Response:', getUserData);

        if (getUserData.result) {
            const parsed = JSON.parse(getUserData.result);
            console.log('Retrieved user data:', parsed);
            console.log('✓ User data operations successful\n');
        } else {
            console.log('✗ User data operations failed\n');
            return false;
        }
    } catch (error) {
        console.error('✗ User data operations error:', error.message);
        return false;
    }

    console.log('=== All tests passed! ===');
    return true;
}

testKVConnection().then(success => {
    if (!success) {
        console.log('\n❌ Some tests failed. Please check the errors above.');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
});
