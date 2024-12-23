const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class TweetScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        try {
            console.log('Step 1: Starting initialization...');
            
            console.log('Step 2: Attempting to connect to Chrome on port 9222...');
            this.browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });

            console.log('Step 3: Successfully connected to Chrome');

            console.log('Step 4: Creating new tab...');
            this.page = await this.browser.newPage();
            
            console.log('Step 5: Setting up page configuration...');
            await this.page.setViewport({ width: 1280, height: 800 });
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('Step 6: Getting current page URL...');
            try {
                const currentUrl = await this.page.evaluate(() => window.location.href);
                console.log('Current page URL:', currentUrl);
            } catch (e) {
                console.log('Could not get current URL:', e.message);
            }

            console.log('Step 7: Checking page readiness...');
            try {
                const pageState = await this.page.evaluate(() => ({
                    url: window.location.href,
                    readyState: document.readyState,
                    title: document.title
                }));
                console.log('Page state:', pageState);
            } catch (e) {
                console.log('Could not check page state:', e.message);
            }

            console.log('Step 8: Initialization complete');
            return true;
        } catch (error) {
            console.error('Initialization failed with error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            if (this.page) {
                try {
                    console.log('Attempting to close page...');
                    await this.page.close();
                } catch (e) {
                    console.error('Failed to close page:', e.message);
                }
            }
            
            if (this.browser) {
                try {
                    console.log('Attempting to disconnect from browser...');
                    await this.browser.disconnect();
                } catch (e) {
                    console.error('Failed to disconnect from browser:', e.message);
                }
            }
            
            throw error;
        }
    }

    async scrapeBookmarks() {
        if (!this.page) {
            throw new Error('Scraper not properly initialized');
        }

        try {
            console.log('Step 1: Navigating to Twitter bookmarks...');
            
            // First navigate to Twitter main page
            console.log('Step 1.1: Going to Twitter main page first...');
            await this.page.goto('https://twitter.com', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            console.log('Step 1.2: Waiting for initial page load...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Now navigate to bookmarks
            console.log('Step 1.3: Going to bookmarks page...');
            await this.page.goto('https://twitter.com/i/bookmarks', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            
            console.log('Step 2: Waiting for page to load...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            console.log('Step 3: Checking if we need to log in...');
            const isLoginPage = await this.page.evaluate(() => {
                return window.location.href.includes('/login') || 
                       document.querySelector('[data-testid="loginButton"]') !== null;
            });

            if (isLoginPage) {
                console.log('Login required. Please log in manually in the browser window.');
                return { status: 'login_required' };
            }

            console.log('Step 4: Starting tweet extraction...');
            const tweets = [];
            let previousTweetCount = 0;
            let noNewTweetsCount = 0;
            const maxScrollAttempts = 30;  // Increased from 10 to 30 attempts

            const extractTweets = async () => {
                const newTweets = await this.page.evaluate(() => {
                    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
                    return Array.from(tweetElements).map(tweet => {
                        // Helper function to safely get text content
                        const getText = (selector) => {
                            const el = tweet.querySelector(selector);
                            return el ? el.textContent.trim() : null;
                        };

                        // Helper function to get attribute
                        const getAttr = (selector, attr) => {
                            const el = tweet.querySelector(selector);
                            return el ? el.getAttribute(attr) : null;
                        };

                        // Get tweet link
                        const tweetLink = tweet.querySelector('a[href*="/status/"]');
                        const tweetUrl = tweetLink ? tweetLink.href : null;
                        const tweetId = tweetUrl ? tweetUrl.split('/status/')[1]?.split('?')[0] : null;

                        // Get user info
                        const userLink = tweet.querySelector('a[href^="/"][role="link"]');
                        const userName = userLink ? userLink.textContent : null;
                        const userHandle = userLink ? userLink.href.split('/')[3] : null;

                        // Get tweet content
                        const tweetText = getText('[data-testid="tweetText"]');
                        const timestamp = getAttr('time', 'datetime');

                        // Get metrics
                        const metrics = {
                            replies: getText('[data-testid="reply"]'),
                            retweets: getText('[data-testid="retweet"]'),
                            likes: getText('[data-testid="like"]'),
                            views: tweet.querySelector('a[href$="/analytics"]')?.textContent
                        };

                        // Get media
                        const photos = Array.from(tweet.querySelectorAll('[data-testid="tweetPhoto"]')).map(img => {
                            const imgEl = img.querySelector('img');
                            return imgEl ? imgEl.src : null;
                        }).filter(Boolean);

                        const links = Array.from(tweet.querySelectorAll('a[href]'))
                            .map(a => a.href)
                            .filter(href => !href.includes('/status/') && !href.startsWith('https://twitter.com/'))
                            .filter(Boolean);

                        // Get quoted tweet if present
                        const quotedTweet = tweet.querySelector('[data-testid="quotedTweet"]');
                        const quotedTweetData = quotedTweet ? {
                            url: quotedTweet.querySelector('a[href*="/status/"]')?.href || null,
                            text: getText('[data-testid="quotedTweet"] [data-testid="tweetText"]'),
                            user: {
                                name: quotedTweet.querySelector('a[href^="/"][role="link"]')?.textContent || null,
                                handle: quotedTweet.querySelector('a[href^="/"][role="link"]')?.href?.split('/')[3] || null
                            }
                        } : null;

                        return {
                            id: tweetId,
                            url: tweetUrl,
                            user: {
                                name: userName,
                                handle: userHandle
                            },
                            text: tweetText,
                            timestamp,
                            metrics,
                            media: {
                                photos,
                                links
                            },
                            quotedTweet: quotedTweetData
                        };
                    });
                });

                return newTweets;
            };

            while (noNewTweetsCount < maxScrollAttempts) {
                // Extract current tweets
                const currentTweets = await extractTweets();
                
                // Add only new tweets to our collection
                const newTweets = currentTweets.filter(tweet => 
                    !tweets.some(existing => existing.id === tweet.id)
                );
                tweets.push(...newTweets);

                console.log(`Found ${newTweets.length} new tweets. Total: ${tweets.length}`);

                if (tweets.length === previousTweetCount) {
                    noNewTweetsCount++;
                } else {
                    noNewTweetsCount = 0;
                }
                previousTweetCount = tweets.length;

                // Scroll down
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                
                // Wait for new content to load
                await new Promise(resolve => setTimeout(resolve, 5000));  // Increased from 2000 to 5000ms
            }

            console.log(`Finished extracting tweets. Total found: ${tweets.length}`);

            // Save tweets to a file
            await fs.writeFile(
                'bookmarked_tweets.json',
                JSON.stringify(tweets, null, 2)
            );
            console.log('Saved tweets to bookmarked_tweets.json');

            return {
                status: 'success',
                tweetCount: tweets.length,
                tweets
            };

        } catch (error) {
            console.error('Scraping failed with error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async close() {
        console.log('Starting cleanup...');
        try {
            if (this.page) {
                try {
                    console.log('Closing page...');
                    await this.page.close();
                } catch (e) {
                    console.error('Error closing page:', e);
                }
            }
            if (this.browser) {
                try {
                    console.log('Disconnecting from browser...');
                    await this.browser.disconnect();
                } catch (e) {
                    console.error('Error disconnecting from browser:', e);
                }
            }
            console.log('Cleanup complete');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}

module.exports = TweetScraper;
