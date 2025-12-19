// Test referral rewards fetching

const RPC_URL = "https://mainnet.base.org";
const MEGAPOT_CONTRACT_ADDRESS = "0xbEDd4F2beBE9E3E636161E644759f3cbe3d51B95";
const REFERRAL_ADDRESS = "0x5872286f932E5b015Ef74B2f9c8723022D1B5e1B";

async function testReferralFetch() {
    try {
        // Test with correct BaseScan selector
        console.log('--- Testing with correct BaseScan selector ---');
        const selector = '630f0b1c'; // From BaseScan: referralFeesClaimable(address)
        const cleanAddress = REFERRAL_ADDRESS.slice(2).toLowerCase().padStart(64, '0');
        const callData = '0x' + selector + cleanAddress;
        
        console.log('Contract:', MEGAPOT_CONTRACT_ADDRESS);
        console.log('Address:', REFERRAL_ADDRESS);
        console.log('Selector:', selector);
        console.log('Call Data:', callData);
        
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: MEGAPOT_CONTRACT_ADDRESS,
                    data: callData
                }, 'latest'],
                id: 1
            })
        });
        
        const data = await response.json();
        console.log('Response:', data);
        
        if (data.error) {
            console.error('RPC Error:', data.error);
        } else if (data.result) {
            const amountHex = data.result;
            const amountWei = parseInt(amountHex, 16);
            const amountUSD = amountWei / 1_000_000;
            console.log('Referral Rewards:', amountUSD.toFixed(6), 'USDC');
        }
        
        // Also test referralFeesTotal for comparison
        console.log('\n--- Testing referralFeesTotal ---');
        const totalSelector = '7480494f'; // From BaseScan: referralFeesTotal()
        const totalCallData = '0x' + totalSelector;
        
        const response2 = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: MEGAPOT_CONTRACT_ADDRESS,
                    data: totalCallData
                }, 'latest'],
                id: 2
            })
        });
        
        const data2 = await response2.json();
        console.log('referralFeesTotal response:', data2);
        
        if (data2.error) {
            console.error('RPC Error with total:', data2.error);
        } else if (data2.result) {
            const totalHex = data2.result;
            const totalWei = parseInt(totalHex, 16);
            const totalUSD = totalWei / 1_000_000;
            console.log('Total Referral Fees:', totalUSD.toFixed(6), 'USDC');
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testReferralFetch();
