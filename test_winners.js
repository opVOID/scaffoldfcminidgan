import { getRecentWinners } from './services/megapot.js';

async function test() {
    console.log('Testing getRecentWinners...\n');

    const winners = await getRecentWinners(3);

    console.log('Number of winners:', winners.length);
    console.log('\nFirst winner:');
    console.log(JSON.stringify(winners[0], null, 2));

    if (winners[0]) {
        console.log('\nFormatted date:', new Date(winners[0].timestamp).toLocaleDateString());
    }
}

test();
