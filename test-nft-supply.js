// Test NFT supply fetching
const RPC_URL = 'https://mainnet.base.org';
const NFT_CONTRACT = '0xB7116Be05Bf2662a0F60A160F29b9cb69Ade67Be';

const hexToDecimal = (hex) => {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
};

const fetchCollectionStats = async () => {
  try {
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

    console.log('Sending batch request to:', RPC_URL);
    console.log('Request body:', JSON.stringify(batchBody, null, 2));

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error(`RPC HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log('Raw response text:', text);
    
    let results;
    try {
      results = JSON.parse(text);
    } catch (e) {
      console.warn("Failed to parse JSON response", text);
      throw new Error("Invalid JSON response from RPC");
    }

    console.log('Parsed results:', results);

    const totalSupplyRes = Array.isArray(results) ? results.find((r) => r.id === 1) : null;
    const maxSupplyRes = Array.isArray(results) ? results.find((r) => r.id === 2) : null;
    const costRes = Array.isArray(results) ? results.find((r) => r.id === 3) : null;

    console.log('NFT Contract Responses:', { totalSupplyRes, maxSupplyRes, costRes });

    const totalSupply = totalSupplyRes?.result && totalSupplyRes.result !== '0x' ? hexToDecimal(totalSupplyRes.result) : 0;
    const maxSupply = maxSupplyRes?.result && maxSupplyRes.result !== '0x' ? hexToDecimal(maxSupplyRes.result) : 11305;
    const price = costRes?.result && costRes.result !== '0x' ? hexToEth(costRes.result) : 0.002;

    console.log('Final values:', { totalSupply, maxSupply, price });

    return { totalSupply, maxSupply, price };
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return { totalSupply: 0, maxSupply: 11305, price: 0.002 };
  }
};

const hexToEth = (hex) => {
  if (!hex || hex === '0x') return 0;
  const wei = parseInt(hex, 16);
  return wei / 1e18;
};

fetchCollectionStats().then(result => {
  console.log('Final result:', result);
}).catch(error => {
  console.error('Test error:', error);
});
