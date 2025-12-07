// Script to add 5 mock users to the Upstash KV database
// Run with: node add-mock-users.js

const KV_REST_API_URL = 'https://immune-mollusk-40593.upstash.io';
const KV_REST_API_TOKEN = 'AZ6RAAIncDJjYmU3MTM5Mjg3YWU0ZjI1YjZjZGRjNjQxYjEzZTUyMnAyNDA1OTM';

const mockUsers = [
    {
        address: '0x1111111111111111111111111111111111111111',
        data: {
            lastCheckIn: Date.now(),
            streak: 10,
            xp: 1500,
            farcaster: { username: 'mock_user_1', fid: 1001, pfp: 'https://i.imgur.com/1.png' }
        }
    },
    {
        address: '0x2222222222222222222222222222222222222222',
        data: {
            lastCheckIn: Date.now() - 86400000,
            streak: 5,
            xp: 800,
            farcaster: { username: 'mock_user_2', fid: 1002, pfp: 'https://i.imgur.com/2.png' }
        }
    },
    {
        address: '0x3333333333333333333333333333333333333333',
        data: {
            lastCheckIn: Date.now() - 43200000,
            streak: 20,
            xp: 3000,
            farcaster: { username: 'mock_user_3', fid: 1003, pfp: 'https://i.imgur.com/3.png' }
        }
    },
    {
        address: '0x4444444444444444444444444444444444444444',
        data: {
            lastCheckIn: Date.now() - 100000,
            streak: 2,
            xp: 250,
            farcaster: { username: 'mock_user_4', fid: 1004, pfp: 'https://i.imgur.com/4.png' }
        }
    },
    {
        address: '0x5555555555555555555555555555555555555555',
        data: {
            lastCheckIn: 0,
            streak: 0,
            xp: 50,
            farcaster: { username: 'mock_user_5', fid: 1005, pfp: 'https://i.imgur.com/5.png' }
        }
    }
];

async function addMockUsers() {
    console.log('Adding 5 mock users to KV...\n');

    for (const user of mockUsers) {
        try {
            const key = `user:${user.address.toLowerCase()}:data`;
            const value = JSON.stringify(user.data);

            console.log(`Adding user ${user.data.farcaster.username} (${user.address})...`);

            const response = await fetch(KV_REST_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['SET', key, value])
            });

            const data = await response.json();
            if (data.result === 'OK') {
                console.log('✓ Success');
            } else {
                console.log('✗ Failed:', data);
            }
        } catch (error) {
            console.error('✗ Error:', error.message);
        }
    }

    console.log('\nDone!');
}

addMockUsers();
