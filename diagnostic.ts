import { getRaffleStats, checkUSDCAllowance } from './services/megapot.js';
import { fetchCollectionStats } from './services/web3.js';
import { MEGAPOT_API_KEY, RPC_URL, CONTRACT_ADDRESS } from './constants.js';

console.log('--- DIAGNOSTIC START ---');
console.log('MEGAPOT_API_KEY:', MEGAPOT_API_KEY);
console.log('RPC_URL:', RPC_URL);
console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS);

async function testMegapot() {
    console.log('\nTesting Megapot API...');
    try {
        // We need to import megapotFetch to get raw response, but it's not exported.
        // Instead, let's just use fetch directly with the key
        const url = "https://api.megapot.io/api/v1/jackpot-round-stats/active";
        const res = await fetch(url, {
            headers: {
                'apikey': MEGAPOT_API_KEY
            }
        });
        const data = await res.json();
        console.log('Raw Megapot Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Megapot API Failed:', e);
    }
}

async function testNFTSupply() {
    console.log('\nTesting NFT Supply...');
    try {
        const stats = await fetchCollectionStats();
        console.log('Collection Stats:', stats);
    } catch (e) {
        console.error('NFT Supply Failed:', e);
    }
}

async function testUSDCAllowance() {
    console.log('\nTesting USDC Allowance...');
    // Use a random address or the referral address for testing
    const testAddress = "0x5872286f932E5b015Ef74B2f9c8723022D1B5e1B";
    try {
        const allowance = await checkUSDCAllowance(testAddress);
        console.log(`Allowance for ${testAddress}:`, allowance);
    } catch (e) {
        console.error('USDC Allowance Failed:', e);
    }
}

async function run() {
    await testMegapot();
    await testNFTSupply();
    await testUSDCAllowance();
    console.log('\n--- DIAGNOSTIC END ---');
}

run();
