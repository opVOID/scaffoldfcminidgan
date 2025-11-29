// Test USDC allowance
const MEGAPOT_CONTRACT_ADDRESS = "0xbEDd4F2beBE9E3E636161E644759f3cbe3d51B95";
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RPC_URL = 'https://mainnet.base.org';

const checkUSDCAllowance = async (userAddress) => {
  try {
    // allowance(address owner, address spender)
    const selector = "0xdd62ed3e";
    const owner = userAddress.replace('0x', '').toLowerCase().padStart(64, '0');
    const spender = MEGAPOT_CONTRACT_ADDRESS.replace('0x', '').toLowerCase().padStart(64, '0');
    const data = `${selector}${owner}${spender}`;

    console.log('Checking allowance for:', userAddress);
    console.log('Spender:', MEGAPOT_CONTRACT_ADDRESS);
    console.log('Call data:', data);

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: USDC_CONTRACT_ADDRESS, data }, 'latest']
      })
    });

    const result = await response.json();
    console.log('Allowance RPC response:', result);

    if (result.result && result.result !== '0x') {
      const allowanceRaw = parseInt(result.result, 16);
      const allowance = allowanceRaw / 1000000; // USDC has 6 decimals
      console.log('Raw allowance (wei):', allowanceRaw);
      console.log('Parsed allowance (USDC):', allowance);
      return allowance;
    }
    
    console.log('No allowance found or zero allowance');
    return 0;
  } catch (e) {
    console.error("checkUSDCAllowance error:", e);
    return 0;
  }
};

// Test with a sample address
checkUSDCAllowance('0x5872286f932E5b015Ef74B2f9c8723022D1B5e1B').then(allowance => {
  console.log('Final allowance:', allowance);
}).catch(error => {
  console.error('Test error:', error);
});
