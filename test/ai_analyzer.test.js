const fs = require('fs').promises;
const AITweetAnalyzer = require('../utils/ai_analyzer');

async function testAIAnalyzer() {
    console.log('Starting AI Tweet Analysis...\n');
    
    try {
        // Load tweets
        console.log('Loading tweets...');
        const data = await fs.readFile('bookmarked_tweets.json', 'utf8');
        const tweets = JSON.parse(data);
        console.log(`Loaded ${tweets.length} tweets\n`);

        // Take a sample of tweets for testing
        const sampleSize = 20;
        const sampleTweets = tweets
            .sort(() => 0.5 - Math.random()) // Shuffle array
            .slice(0, sampleSize);

        // Initialize analyzer
        const analyzer = new AITweetAnalyzer();
        
        // Analyze tweets
        console.log(`Analyzing ${sampleSize} sample tweets...`);
        const analysis = await analyzer.analyzeTweets(sampleTweets);
        
        // Display results
        console.log('\nAnalysis Results:');
        console.log('='.repeat(50));
        
        // Intent Distribution
        console.log('\nIntent Distribution:');
        Object.entries(analysis.intents)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([intent, stats]) => {
                console.log(`${intent}: ${stats.count} tweets (${stats.percentage}%)`);
            });

        // Category Distribution
        console.log('\nCategory Distribution:');
        Object.entries(analysis.categories)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([category, stats]) => {
                console.log(`${category}: ${stats.count} tweets (${stats.percentage}%)`);
            });

        // Actionability
        console.log('\nActionability:');
        console.log(`Actionable Tweets: ${analysis.actionableCount} (${((analysis.actionableCount / sampleSize) * 100).toFixed(1)}%)`);
        
        console.log('\nCommon Suggested Actions:');
        Object.entries(analysis.commonActions)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5)
            .forEach(([action, stats]) => {
                console.log(`- ${action}: ${stats.count} mentions`);
            });

        // Cognitive Value
        console.log('\nCognitive Value Types:');
        Object.entries(analysis.cognitiveTypes)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([type, stats]) => {
                console.log(`${type}: ${stats.count} tweets (${stats.percentage}%)`);
            });

        // Timeline Distribution
        console.log('\nRelevance Timeline:');
        Object.entries(analysis.timelineDistribution)
            .forEach(([timeline, stats]) => {
                console.log(`${timeline}: ${stats.count} tweets (${stats.percentage}%)`);
            });

        // Sentiment Distribution
        console.log('\nSentiment Distribution:');
        Object.entries(analysis.sentimentDistribution)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([sentiment, stats]) => {
                console.log(`${sentiment}: ${stats.count} tweets (${stats.percentage}%)`);
            });

        // Key Insights
        console.log('\nKey Insights:');
        analysis.keyInsights.slice(0, 5).forEach((insight, index) => {
            console.log(`${index + 1}. ${insight}`);
        });

    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

// Run the test
console.log('='.repeat(50));
console.log('AI Tweet Analysis');
console.log('='.repeat(50), '\n');

testAIAnalyzer().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
