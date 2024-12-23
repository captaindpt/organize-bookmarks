/**
 * Tweet Database Analyzer
 * Processes and analyzes the bookmarked tweets database
 * 
 * TODO: Connect this with the scraper module to create an integrated experience
 */

const fs = require('fs').promises;

class TweetAnalyzer {
    constructor(databasePath) {
        this.databasePath = databasePath;
        this.tweets = [];
    }

    async loadDatabase() {
        try {
            const data = await fs.readFile(this.databasePath, 'utf8');
            this.tweets = JSON.parse(data);
            return {
                status: 'success',
                count: this.tweets.length
            };
        } catch (error) {
            throw new Error(`Failed to load database: ${error.message}`);
        }
    }

    /**
     * Get basic statistics about the tweet database
     */
    getStats() {
        const stats = {
            totalTweets: this.tweets.length,
            tweetsWithPhotos: 0,
            tweetsWithQuotes: 0,
            tweetsWithLinks: 0,
            userStats: new Map(),
            dateRange: {
                earliest: null,
                latest: null
            }
        };

        for (const tweet of this.tweets) {
            // Count media types
            if (tweet.media?.photos?.length > 0) stats.tweetsWithPhotos++;
            if (tweet.media?.links?.length > 0) stats.tweetsWithLinks++;
            if (tweet.quotedTweet) stats.tweetsWithQuotes++;

            // Track user stats
            const userHandle = tweet.user.handle;
            if (!stats.userStats.has(userHandle)) {
                stats.userStats.set(userHandle, { count: 0, name: tweet.user.name });
            }
            stats.userStats.get(userHandle).count++;

            // Track date range
            const tweetDate = new Date(tweet.timestamp);
            if (!stats.dateRange.earliest || tweetDate < new Date(stats.dateRange.earliest)) {
                stats.dateRange.earliest = tweet.timestamp;
            }
            if (!stats.dateRange.latest || tweetDate > new Date(stats.dateRange.latest)) {
                stats.dateRange.latest = tweet.timestamp;
            }
        }

        // Convert userStats Map to array and sort by count
        const topUsers = Array.from(stats.userStats.entries())
            .map(([handle, data]) => ({
                handle,
                name: data.name,
                tweetCount: data.count
            }))
            .sort((a, b) => b.tweetCount - a.tweetCount)
            .slice(0, 10);

        return {
            ...stats,
            userStats: topUsers
        };
    }

    /**
     * Search tweets by text content
     */
    searchByContent(query, options = {}) {
        const {
            caseSensitive = false,
            includeQuotes = true,
            fromDate,
            toDate
        } = options;

        const searchQuery = caseSensitive ? query : query.toLowerCase();
        
        return this.tweets.filter(tweet => {
            // Apply date filter if specified
            if (fromDate && new Date(tweet.timestamp) < new Date(fromDate)) return false;
            if (toDate && new Date(tweet.timestamp) > new Date(toDate)) return false;

            // Search in tweet text
            const tweetText = caseSensitive ? tweet.text : tweet.text?.toLowerCase();
            if (tweetText?.includes(searchQuery)) return true;

            // Search in quoted tweet if enabled
            if (includeQuotes && tweet.quotedTweet) {
                const quotedText = caseSensitive ? 
                    tweet.quotedTweet.text : 
                    tweet.quotedTweet.text?.toLowerCase();
                if (quotedText?.includes(searchQuery)) return true;
            }

            return false;
        });
    }

    /**
     * Get tweets by date range
     */
    getTweetsByDate(fromDate, toDate) {
        return this.tweets.filter(tweet => {
            const tweetDate = new Date(tweet.timestamp);
            return (!fromDate || tweetDate >= new Date(fromDate)) &&
                   (!toDate || tweetDate <= new Date(toDate));
        });
    }

    /**
     * Get tweets by user
     */
    getTweetsByUser(userHandle) {
        return this.tweets.filter(tweet => 
            tweet.user.handle.toLowerCase() === userHandle.toLowerCase()
        );
    }

    /**
     * Get tweets with specific media type
     */
    getTweetsByMediaType(mediaType) {
        switch (mediaType) {
            case 'photos':
                return this.tweets.filter(tweet => tweet.media?.photos?.length > 0);
            case 'links':
                return this.tweets.filter(tweet => tweet.media?.links?.length > 0);
            case 'quotes':
                return this.tweets.filter(tweet => tweet.quotedTweet !== null);
            default:
                throw new Error(`Invalid media type: ${mediaType}`);
        }
    }
}

module.exports = TweetAnalyzer;
