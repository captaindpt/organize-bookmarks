const TweetScraper = require('../utils/scraper');

async function testScraper() {
    console.log('Starting scraper test...');
    const scraper = new TweetScraper();
    
    try {
        console.log('\nStep 1: Creating scraper instance...');
        console.log('Step 2: Starting initialization...');
        await scraper.initialize();
        
        console.log('\nStep 3: Analyzing current page...');
        const pageAnalysis = await scraper.scrapeBookmarks();
        
        console.log('\nStep 4: Analysis Results:');
        const { tweets, ...summaryStats } = pageAnalysis;
        console.log(JSON.stringify(summaryStats, null, 2));
        
    } catch (error) {
        console.error('\nTest failed with error:', error.message);
        console.error('Full error stack:', error.stack);
        if (error.cause) {
            console.error('Error cause:', error.cause);
        }
    } finally {
        console.log('\nStep 5: Starting cleanup...');
        await scraper.close();
        console.log('Test completed');
    }
}

// Run the test
console.log('='.repeat(50));
console.log('Starting Twitter Bookmark Scraper Test');
console.log('='.repeat(50), '\n');

testScraper().catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
});
