const MEGAPOT_API_KEY = "cZ0nVsc61Ttn9Omasz3w";
const API_BASE_URL = "https://api.megapot.io/api/v1";

async function testDailyTicketPool() {
    console.log('Testing /daily-ticket-pool/round endpoint...\n');

    const response = await fetch(`${API_BASE_URL}/daily-ticket-pool/round`, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': MEGAPOT_API_KEY
        }
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('\nLatest completed round:');
    console.log(JSON.stringify(data, null, 2));
}

testDailyTicketPool();
