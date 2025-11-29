import { CONTRACT_ADDRESS } from './constants.js';

const RPC_URL = "https://mainnet.base.org";

console.log('Probing NFT Contract:', CONTRACT_ADDRESS);
console.log('RPC:', RPC_URL);

const SELECTORS = {
    name: "0x06fdde03",
    symbol: "0x95d89b41",
    totalSupply: "0x18160ddd",
    maxSupply: "0xd5abeb01", // Custom?
    cost: "0x2c6a0e66",      // Custom?
    mintPrice: "0x18cba421", // Maybe?
    price: "0xa035b1fe",     // Maybe?
};

async function ethCall(data: string) {
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: CONTRACT_ADDRESS, data }, 'latest']
        })
    });
    const json = await res.json();
    return json.result;
}

function hexToString(hex: string) {
    if (!hex || hex === '0x') return '';
    try {
        let str = '';
        const raw = hex.replace('0x', '');
        for (let i = 0; i < raw.length; i += 2) {
            const code = parseInt(raw.substr(i, 2), 16);
            if (code > 0) str += String.fromCharCode(code);
        }
        // Remove length prefix/padding if standard string
        return str.replace(/[^\x20-\x7E]/g, '').trim();
    } catch (e) {
        return hex;
    }
}

async function run() {
    // 1. Check code
    const codeRes = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getCode',
            params: [CONTRACT_ADDRESS, 'latest']
        })
    });
    const codeJson = await codeRes.json();
    console.log('Code Length:', codeJson.result ? codeJson.result.length : 0);

    if (!codeJson.result || codeJson.result === '0x') {
        console.error('NO CODE AT ADDRESS!');
        return;
    }

    // 2. Check Standard Functions
    console.log('Name (raw):', await ethCall(SELECTORS.name));
    console.log('Symbol (raw):', await ethCall(SELECTORS.symbol));
    console.log('TotalSupply (raw):', await ethCall(SELECTORS.totalSupply));

    // 3. Check Custom Functions
    console.log('MaxSupply (raw):', await ethCall(SELECTORS.maxSupply));
    console.log('Cost (raw):', await ethCall(SELECTORS.cost));
}

run();
