const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TweetScraper = require('./utils/scraper');
const TweetAnalyzer = require('./utils/analyzer');

const app = express();
const port = 3000;

// Initialize analyzer
const analyzer = new TweetAnalyzer('bookmarked_tweets.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', async (req, res) => {
    const { bookmarkUrl } = req.body;
    
    try {
        // Initialize scraper
        const scraper = new TweetScraper();
        await scraper.initialize();
        
        // Scrape bookmarks
        const scrapeResult = await scraper.scrapeBookmarks();
        await scraper.close();
        
        if (scrapeResult.status === 'login_required') {
            return res.status(401).json({ 
                message: 'Please log in to Twitter in the Chrome browser first' 
            });
        }
        
        // Load and analyze the scraped tweets
        await analyzer.loadDatabase();
        const stats = analyzer.getStats();
        
        res.json({ 
            status: 'success',
            stats
        });
    } catch (error) {
        console.error('Analysis failed:', error);
        res.status(500).json({ 
            message: 'Failed to analyze bookmarks',
            error: error.message 
        });
    }
});

app.get('/search', async (req, res) => {
    const { q: query } = req.query;
    
    try {
        // Make sure database is loaded
        await analyzer.loadDatabase();
        
        // Search tweets
        const tweets = analyzer.searchByContent(query, {
            caseSensitive: false,
            includeQuotes: true
        });
        
        res.json({ tweets });
    } catch (error) {
        console.error('Search failed:', error);
        res.status(500).json({ 
            message: 'Failed to search tweets',
            error: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
