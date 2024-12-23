const AITweetAnalyzer = require('../utils/ai_analyzer');

async function enrichTweets() {
    console.log('Starting Tweet Enrichment Process...\n');
    
    try {
        const analyzer = new AITweetAnalyzer();
        
        // Enrich tweets
        console.log('Enriching tweets with AI analysis...');
        const enrichedTweets = await analyzer.enrichTweetDatabase();
        
        // Display some sample descriptions
        console.log('\nSample of enriched tweets:');
        console.log('='.repeat(50));
        
        enrichedTweets.slice(0, 5).forEach((tweet, index) => {
            console.log(`\nTweet ${index + 1}:`);
            console.log(`Original: ${tweet.text.slice(0, 100)}...`);
            console.log(`Description: ${tweet.semantic_description}`);
        });
        
        console.log('\nEnrichment complete! Check enriched_tweets.json for full results.');
        
    } catch (error) {
        console.error('Enrichment process failed:', error);
    }
}

// Run the enrichment process
console.log('='.repeat(50));
console.log('Tweet Enrichment Process');
console.log('='.repeat(50), '\n');

enrichTweets().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
