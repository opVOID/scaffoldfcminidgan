
import './setup-test.js';
import { getUserData, checkInUser, rewardUserShare, updateLeaderboard, getLeaderboard, getTokensByOwner, mintToken } from './services/db';
import { verifyAuth } from './services/auth';

async function runTests() {
    console.log('--- Starting Backend Logic Tests ---');

    const testAddress = '0x' + Math.random().toString(16).slice(2, 42);
    console.log(`Testing with address: ${testAddress}`);

    // Test 1: Get Initial User Data
    console.log('\nTest 1: Initial User Data');
    const initialData = await getUserData(testAddress);
    console.log('Initial XP:', initialData.xp);
    if (initialData.xp !== 0) throw new Error('Initial XP should be 0');

    // Test 2: Check-in User
    console.log('\nTest 2: Check-in User');
    const checkInResult = await checkInUser(testAddress);
    console.log('Check-in Result:', checkInResult.message);
    if (!checkInResult.success) throw new Error('Check-in should succeed');

    const dataAfterCheckIn = await getUserData(testAddress);
    console.log('XP after check-in:', dataAfterCheckIn.xp);
    if (dataAfterCheckIn.xp !== 50) throw new Error('XP should be 50 after check-in');

    // Test 3: Check-in Cooldown
    console.log('\nTest 3: Check-in Cooldown');
    const checkInAgain = await checkInUser(testAddress);
    console.log('Check-in Again Result:', checkInAgain.message);
    if (checkInAgain.success) throw new Error('Check-in again should fail due to cooldown');

    // Test 4: XP Reward
    console.log('\nTest 4: XP Reward');
    const rewardResult = await rewardUserShare(testAddress);
    console.log('Reward Result SUCCESS:', rewardResult.success);
    const dataAfterReward = await getUserData(testAddress);
    console.log('XP after reward:', dataAfterReward.xp);
    if (dataAfterReward.xp !== 51) throw new Error('XP should be 51 after reward');

    // Test 5: Leaderboard
    console.log('\nTest 5: Leaderboard Update');
    await updateLeaderboard(testAddress, 100);
    const lb = await getLeaderboard(10);
    const entry = lb.find(e => e.address.toLowerCase() === testAddress.toLowerCase());
    console.log('Leaderboard Entry:', entry);
    if (!entry || entry.score !== 100) throw new Error('Leaderboard score mismatch');

    // Test 6: Minting & Collection
    console.log('\nTest 6: Minting & Collection');
    const mintResult = await mintToken(testAddress, 2);
    console.log('Minted count:', mintResult.tokens.length);
    const userTokens = await getTokensByOwner(testAddress);
    console.log('User Token Count:', userTokens.length);
    if (userTokens.length !== 2) throw new Error('User should have 2 tokens');

    console.log('\n✅ ALL BACKEND LOGIC TESTS PASSED!');
}

runTests().catch(err => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
});
