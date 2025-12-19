// Calculate function selectors from ABI
const crypto = require('crypto');

function keccak256(data) {
    return crypto.createHash('sha3-256').update(data).digest('hex');
}

const functions = [
    'totalSupply()',
    'maxSupply()',
    'cost()',
    'walletOfOwner(address)'
];

console.log('Function Selectors:');
functions.forEach(fn => {
    const hash = keccak256(fn);
    const selector = '0x' + hash.substring(0, 8);
    console.log(`${fn.padEnd(30)} => ${selector}`);
});
