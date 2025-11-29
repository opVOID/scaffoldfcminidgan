// Test the actual Mint page data fetching
const RPC_URL = 'https://mainnet.base.org';
const NFT_CONTRACT = '0xB7116Be05Bf2662a0F60A160F29b9cb69Ade67Be';

const hexToDecimal = (hex) => {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
};

const hexToEth = (hex) => {
  if (!hex || hex === '0x') return 0;
  const wei = parseInt(hex, 16);
  return wei / 1e18;
};

// Simulate the exact same function from web3.ts
const fetchCollectionStats = async () => {
  try {
    console.log('=== Testing NFT Supply Fetching ===');
    
    const batchBody = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: NFT_CONTRACT, data: '0x18160ddd' }, 'latest']
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{ to: NFT_CONTRACT, data: '0xd5abeb01' }, 'latest']
      },
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_call',
        params: [{ to: NFT_CONTRACT, data: '0x2c6a0e66' }, 'latest']
      }
    ];

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    let results;
    try {
      results = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON response from RPC");
    }

    const totalSupplyRes = Array.isArray(results) ? results.find((r) => r.id === 1) : null;
    const maxSupplyRes = Array.isArray(results) ? results.find((r) => r.id === 2) : null;
    const costRes = Array.isArray(results) ? results.find((r) => r.id === 3) : null;

    console.log('Raw responses:', { totalSupplyRes, maxSupplyRes, costRes });

    const totalSupply = totalSupplyRes?.result && totalSupplyRes.result !== '0x' ? hexToDecimal(totalSupplyRes.result) : 0;
    const maxSupply = maxSupplyRes?.result && maxSupplyRes.result !== '0x' ? hexToDecimal(maxSupplyRes.result) : 11305;
    const price = costRes?.result && costRes.result !== '0x' ? hexToEth(costRes.result) : 0.002;

    console.log('Final parsed values:', { totalSupply, maxSupply, price });
    
    // This is what should be displayed: "Already Minted 20 / 11305"
    console.log(`=== DISPLAY TEXT: Already Minted ${totalSupply} / ${maxSupply} ===`);

    return { totalSupply, maxSupply, price };
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return { totalSupply: 0, maxSupply: 11305, price: 0.002 };
  }
};

// Test multiple times to see if it's consistent
console.log('Test 1:');
fetchCollectionStats().then(() => {
  console.log('\nTest 2:');
  return fetchCollectionStats();
}).then(() => {
  console.log('\nTest 3:');
  return fetchCollectionStats();
}).catch(error => {
  console.error('Test error:', error);
});
