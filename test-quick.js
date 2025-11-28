// Quick test for Megapot API and NFT contract
const MEGAPOT_API_KEY = 'cZ0nVsc61Ttn9Omasz3w';
const NFT_CONTRACT = '0xB7116Be05Bf2662a0F60A160F29b9cb69Ade67Be';
const RPC_URL = 'https://base.llamarpc.com';

console.log('=== Testing Megapot API ===\n');

// Test 1: Megapot API
async function testMegapotAPI() {
    try {
        const url = `https://api.megapot.io/api/v1/jackpot-round-stats/active?chainId=8453`;
        console.log('Fetching:', url);

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'apikey': MEGAPOT_API_KEY
            }
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Megapot API Error:', error);
    }
}

// Test 2: NFT Contract - Total Supply
async function testNFTContract() {
    console.log('\n=== Testing NFT Contract ===\n');

    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{
                    to: NFT_CONTRACT,
                    data: '0x18160ddd' // totalSupply()
                }, 'latest']
            })
        });

        const result = await response.json();
        console.log('Total Supply Response:', result);

        if (result.result) {
            const supply = parseInt(result.result, 16);
            console.log('Total Supply:', supply);
        }
    } catch (error) {
        console.error('NFT Contract Error:', error);
    }
}

testMegapotAPI().then(() => testNFTContract());
