// Simple test to check what's happening in the browser
console.log('=== Megapot Debug Test ===');

// Test 1: Check if API key is available
import { MEGAPOT_API_KEY } from './constants';
console.log('API Key available:', !!MEGAPOT_API_KEY);

// Test 2: Try to fetch raffle stats
import { getRaffleStats } from './services/megapot';

getRaffleStats().then(stats => {
    console.log('Raffle Stats:', stats);
}).catch(err => {
    console.error('Raffle Stats Error:', err);
});

// Test 3: Check NFT stats
import { fetchCollectionStats } from './services/web3';

fetchCollectionStats().then(stats => {
    console.log('NFT Stats:', stats);
}).catch(err => {
    console.error('NFT Stats Error:', err);
});
