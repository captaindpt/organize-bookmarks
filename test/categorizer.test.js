const fs = require('fs').promises;
const TweetCategorizer = require('../utils/categorizer');

async function testCategorizer() {
    console.log('Starting Tweet Categorization Analysis...\n');
    
    try {
        // Load tweets
        console.log('Loading tweets...');
        const data = await fs.readFile('bookmarked_tweets.json', 'utf8');
        const tweets = JSON.parse(data);
        console.log(`Loaded ${tweets.length} tweets\n`);

        // Initialize categorizer
        const categorizer = new TweetCategorizer();
        
        // Analyze tweets
        console.log('Analyzing tweets...');
        const stats = categorizer.analyzeCollection(tweets);
        
        // Display results
        console.log('\nCategory Distribution:');
        console.log('='.repeat(50));
        
        // Sort categories by count
        const sortedCategories = Object.entries(stats.categoryCounts)
            .sort(([,a], [,b]) => b - a);
        
        // Calculate percentages and display
        sortedCategories.forEach(([category, count]) => {
            const percentage = ((count / stats.totalTweets) * 100).toFixed(1);
            console.log(`${category.padEnd(15)} : ${count} tweets (${percentage}%)`);
            
            // Show examples
            console.log('Examples:');
            stats.categoryExamples[category].forEach((example, index) => {
                const truncatedText = example.text?.substring(0, 100) + '...';
                console.log(`  ${index + 1}. @${example.user}: ${truncatedText}`);
            });
            console.log();
        });
        
        console.log('='.repeat(50));
        console.log('\nAdditional Stats:');
        console.log(`Multi-category tweets: ${stats.multiCategoryTweets}`);
        console.log(`Uncategorized tweets: ${stats.uncategorizedTweets}`);
        
        // Sample of uncategorized tweets
        console.log('\nSample of Uncategorized Tweets:');
        const uncategorized = tweets.filter(tweet => 
            categorizer.categorizeTweet(tweet).length === 0
        ).slice(0, 3);
        
        uncategorized.forEach((tweet, index) => {
            console.log(`${index + 1}. @${tweet.user.handle}: ${tweet.text?.substring(0, 100)}...`);
        });

    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

// Run the test
console.log('='.repeat(50));
console.log('Tweet Categorization Analysis');
console.log('='.repeat(50), '\n');

testCategorizer().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
