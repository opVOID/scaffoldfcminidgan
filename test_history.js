const MEGAPOT_API_KEY = "cZ0nVsc61Ttn9Omasz3w";
const API_BASE_URL = "https://api.megapot.io/api/v1";

async function testHistory() {
    console.log('Testing /jackpot-history endpoint...\n');

    const response = await fetch(`${API_BASE_URL}/jackpot-history`, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': MEGAPOT_API_KEY
        }
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Is Array:', Array.isArray(data));
    console.log('Number of items:', Array.isArray(data) ? data.length : 'N/A');

    if (Array.isArray(data) && data.length > 0) {
        console.log('\nFirst item structure:');
        console.log(JSON.stringify(data[0], null, 2));

        console.log('\nSecond item structure:');
        console.log(JSON.stringify(data[1], null, 2));
    } else {
        console.log('\nFull response:');
        console.log(JSON.stringify(data, null, 2));
    }
}

testHistory();
