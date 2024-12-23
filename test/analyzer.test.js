const TweetAnalyzer = require('../utils/analyzer');

async function testAnalyzer() {
    console.log('Starting Tweet Analyzer Test...\n');
    
    const analyzer = new TweetAnalyzer('bookmarked_tweets.json');
    
    try {
        // Load database
        console.log('Loading tweet database...');
        const loadResult = await analyzer.loadDatabase();
        console.log(`Loaded ${loadResult.count} tweets\n`);

        // Get basic stats
        console.log('Basic Statistics:');
        const stats = analyzer.getStats();
        console.log('- Total Tweets:', stats.totalTweets);
        console.log('- Tweets with Photos:', stats.tweetsWithPhotos);
        console.log('- Tweets with Quotes:', stats.tweetsWithQuotes);
        console.log('- Tweets with Links:', stats.tweetsWithLinks);
        console.log('\nDate Range:');
        console.log('- Earliest:', new Date(stats.dateRange.earliest).toLocaleString());
        console.log('- Latest:', new Date(stats.dateRange.latest).toLocaleString());
        
        console.log('\nTop 5 Users:');
        stats.userStats.slice(0, 5).forEach((user, index) => {
            console.log(`${index + 1}. @${user.handle} (${user.tweetCount} tweets)`);
        });

        // Example search
        console.log('\nExample Search - tweets containing "AI":');
        const aiTweets = analyzer.searchByContent('AI', { caseSensitive: false });
        console.log(`Found ${aiTweets.length} tweets containing "AI"`);
        if (aiTweets.length > 0) {
            console.log('\nFirst matching tweet:');
            console.log('- Text:', aiTweets[0].text);
            console.log('- By:', aiTweets[0].user.handle);
            console.log('- Date:', new Date(aiTweets[0].timestamp).toLocaleString());
        }

        // Example media filter
        console.log('\nMedia Statistics:');
        const photosOnly = analyzer.getTweetsByMediaType('photos');
        const linksOnly = analyzer.getTweetsByMediaType('links');
        const quotesOnly = analyzer.getTweetsByMediaType('quotes');
        console.log('- Tweets with Photos:', photosOnly.length);
        console.log('- Tweets with Links:', linksOnly.length);
        console.log('- Tweets with Quotes:', quotesOnly.length);

    } catch (error) {
        console.error('\nTest failed:', error.message);
    }
}

// Run the test
console.log('='.repeat(50));
console.log('Starting Tweet Database Analysis');
console.log('='.repeat(50), '\n');

testAnalyzer().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
