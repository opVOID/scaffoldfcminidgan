// Test script for Megapot contract data fetching
// Run with: node test-megapot.js

const RPC_URL = 'https://mainnet.base.org';
const MEGAPOT_CONTRACT_ADDRESS = '0x0ba7E0054B8F9b0A61e1Ae15B5185E0F8c6e8f1B';

console.log('=== Megapot Contract Test ===\n');
console.log('Contract Address:', MEGAPOT_CONTRACT_ADDRESS);
console.log('RPC URL:', RPC_URL);
console.log('');

const MEGAPOT_SELECTORS = {
    purchaseTickets: '0x7eff275e',
    ticketPrice: '0x2c6a0e66',
    feeBps: '0x5582a642',
    referralFeeBps: '0x8da5cb5b',
    ticketCountTotalBps: '0x18160ddd',
    usersInfo: '0x8456cb59',
    lastJackpotEndTime: '0x2e1a7d4d'
};

async function testContractCall(name, selector) {
    console.log(`Testing ${name} (${selector})...`);

    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                    {
                        to: MEGAPOT_CONTRACT_ADDRESS,
                        data: selector
                    },
                    'latest'
                ]
            })
        });

        const result = await response.json();

        if (result.error) {
            console.log(`✗ Error:`, result.error);
            return null;
        }

        if (result.result) {
            console.log(`✓ Success:`, result.result);

            // Try to parse the result
            try {
                const hexValue = result.result;
                const decimalValue = parseInt(hexValue, 16);
                console.log(`  Decimal value: ${decimalValue}`);

                // For price/fee values (assuming 6 decimals for USDC)
                if (name.includes('Price') || name.includes('price')) {
                    const usdcValue = decimalValue / 1e6;
                    console.log(`  USDC value: ${usdcValue}`);
                }

                // For basis points
                if (name.includes('Bps') || name.includes('Total')) {
                    const bpsValue = decimalValue / 10000;
                    console.log(`  BPS value: ${bpsValue}`);
                }
            } catch (parseError) {
                console.log(`  (Could not parse as number)`);
            }

            return result.result;
        }

        console.log(`✗ No result returned`);
        return null;
    } catch (error) {
        console.log(`✗ Exception:`, error.message);
        return null;
    }

    console.log('');
}

async function testMegapotContract() {
    console.log('Starting contract tests...\n');

    // Test each selector
    await testContractCall('ticketPrice', MEGAPOT_SELECTORS.ticketPrice);
    console.log('');

    await testContractCall('feeBps', MEGAPOT_SELECTORS.feeBps);
    console.log('');

    await testContractCall('referralFeeBps', MEGAPOT_SELECTORS.referralFeeBps);
    console.log('');

    await testContractCall('ticketCountTotalBps', MEGAPOT_SELECTORS.ticketCountTotalBps);
    console.log('');

    await testContractCall('lastJackpotEndTime', MEGAPOT_SELECTORS.lastJackpotEndTime);
    console.log('');

    // Test alternative selectors for ticketPrice
    console.log('=== Testing alternative selectors for price ===\n');

    const alternativeSelectors = {
        'cost()': '0x13faede6',
        'price()': '0xa035b1fe',
        'getTicketPrice()': '0x2c6a0e66',
        'ticketCost()': '0x8b7afe2e'
    };

    for (const [name, selector] of Object.entries(alternativeSelectors)) {
        await testContractCall(name, selector);
        console.log('');
    }

    console.log('=== Tests complete ===');
}

testMegapotContract().catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
});
