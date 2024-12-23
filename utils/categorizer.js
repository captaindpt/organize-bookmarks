/**
 * Tweet Categorizer
 * Analyzes and categorizes tweets based on their content and characteristics
 */

class TweetCategorizer {
    constructor() {
        // Define category patterns
        this.categories = {
            actionable: {
                name: 'Actionable',
                description: 'Tweets containing specific actions, tutorials, or how-to content',
                patterns: [
                    /how to|tutorial|guide|tips|steps|learn|implement|build|create|start|try|use/i,
                    /\b\d+\s+ways?\b|\b\d+\s+tips?\b|\b\d+\s+steps?\b/i,
                    /you can|you should|you need to|if you want/i
                ]
            },
            ponderable: {
                name: 'Ponderable',
                description: 'Philosophical, thought-provoking, or reflective content',
                patterns: [
                    /think|thought|believe|wonder|question|perhaps|maybe|opinion|theory/i,
                    /what if|why do|how come|imagine if/i,
                    /life|meaning|purpose|truth|reality|perspective/i
                ]
            },
            technical: {
                name: 'Technical',
                description: 'Technical content, coding, tools, or technology discussions',
                patterns: [
                    /code|programming|software|dev|api|framework|library|tool|tech/i,
                    /\b(js|javascript|python|react|node|ai|ml|api)\b/i,
                    /algorithm|database|backend|frontend|fullstack/i
                ]
            },
            resource: {
                name: 'Resource',
                description: 'Links to resources, tools, articles, or references',
                patterns: [
                    /resource|tool|library|framework|platform|service/i,
                    /check out|look at|great|awesome|useful|helpful/i,
                    /free|open source|available|released/i
                ]
            },
            insight: {
                name: 'Insight',
                description: 'Observations, insights, and analysis',
                patterns: [
                    /realize|understand|notice|observe|find|discover/i,
                    /interesting|fascinating|surprising|turns out/i,
                    /actually|basically|fundamentally|essentially/i
                ]
            },
            career: {
                name: 'Career & Business',
                description: 'Career advice, business insights, and professional growth',
                patterns: [
                    /career|job|work|business|startup|company|industry/i,
                    /salary|promotion|interview|hire|hiring|team|leadership/i,
                    /success|fail|growth|opportunity|market|strategy/i
                ]
            },
            announcement: {
                name: 'Announcement',
                description: 'Product launches, updates, or news',
                patterns: [
                    /announce|launch|release|update|new|introducing|coming soon/i,
                    /just shipped|now available|check out our/i,
                    /proud to|excited to|happy to/i
                ]
            }
        };
    }

    /**
     * Safely get tweet text including quoted tweet
     */
    getTweetText(tweet) {
        const mainText = tweet?.text || '';
        const quotedText = tweet?.quotedTweet?.text || '';
        return `${mainText} ${quotedText}`.toLowerCase();
    }

    /**
     * Categorize a single tweet
     */
    categorizeTweet(tweet) {
        if (!tweet) return [];
        
        const categories = [];
        const content = this.getTweetText(tweet);

        // Check each category
        for (const [key, category] of Object.entries(this.categories)) {
            // Check if any pattern matches
            const matches = category.patterns.some(pattern => pattern.test(content));
            if (matches) {
                categories.push(key);
            }
        }

        // Special cases
        if (tweet.media?.photos?.length > 0) {
            categories.push('visual');
        }
        if (tweet.media?.links?.length > 0) {
            categories.push('resource');
        }

        return categories;
    }

    /**
     * Analyze a collection of tweets and return category statistics
     */
    analyzeCollection(tweets) {
        if (!Array.isArray(tweets)) {
            throw new Error('Expected tweets to be an array');
        }

        const stats = {
            totalTweets: tweets.length,
            categoryCounts: {},
            categoryExamples: {},
            multiCategoryTweets: 0,
            uncategorizedTweets: 0
        };

        // Initialize category counts
        Object.keys(this.categories).forEach(category => {
            stats.categoryCounts[category] = 0;
            stats.categoryExamples[category] = [];
        });

        // Add visual and resource categories
        stats.categoryCounts.visual = 0;
        stats.categoryExamples.visual = [];
        
        // Analyze each tweet
        tweets.forEach(tweet => {
            if (!tweet) return;
            
            const categories = this.categorizeTweet(tweet);

            if (categories.length === 0) {
                stats.uncategorizedTweets++;
            } else if (categories.length > 1) {
                stats.multiCategoryTweets++;
            }

            // Update category counts and examples
            categories.forEach(category => {
                if (!stats.categoryCounts[category]) {
                    stats.categoryCounts[category] = 0;
                    stats.categoryExamples[category] = [];
                }
                
                stats.categoryCounts[category]++;
                
                if (stats.categoryExamples[category].length < 3) {
                    stats.categoryExamples[category].push({
                        text: this.getTweetText(tweet),
                        url: tweet.url,
                        user: tweet.user?.handle || 'unknown'
                    });
                }
            });
        });

        return stats;
    }

    /**
     * Get tweets for a specific category
     */
    getTweetsByCategory(tweets, category) {
        if (!Array.isArray(tweets)) return [];
        return tweets.filter(tweet => 
            this.categorizeTweet(tweet).includes(category)
        );
    }
}

module.exports = TweetCategorizer;
