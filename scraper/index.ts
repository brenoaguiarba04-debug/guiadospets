import { scrapeMercadoLivre } from './mercado-livre';
// Import others as they are converted
// import { syncShopee } from './shopee';

async function main() {
    const args = process.argv.slice(2);
    const target = args[0] || 'all';

    console.log(`🚀 Starting Scraper Runner (Target: ${target})...`);

    try {
        if (target === 'ml' || target === 'all') {
            await scrapeMercadoLivre();
        }

        // Add more targets here

    } catch (error) {
        console.error('❌ Fatal error in scraper runner:', error);
        process.exit(1);
    }
}

main();
