// Function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Function to update stats display
function updateStats(stats) {
    // Update total tweets
    document.getElementById('totalTweets').textContent = `${stats.totalTweets} tweets`;
    
    // Update date range
    document.getElementById('dateRange').innerHTML = 
        `${formatDate(stats.dateRange.earliest)} to<br>${formatDate(stats.dateRange.latest)}`;
    
    // Update media stats
    document.getElementById('mediaStats').innerHTML = 
        `Photos: ${stats.tweetsWithPhotos}<br>` +
        `Links: ${stats.tweetsWithLinks}<br>` +
        `Quotes: ${stats.tweetsWithQuotes}`;
    
    // Update AI stats
    const aiTweets = stats.searchByContent?.('AI')?.length || 0;
    document.getElementById('aiStats').textContent = 
        `${aiTweets} tweets mention AI`;
    
    // Update top users list
    const usersList = document.getElementById('topUsersList');
    usersList.innerHTML = stats.userStats
        .map(user => `
            <div class="user-card">
                <div class="handle">@${user.handle}</div>
                <div class="tweet-count">${user.tweetCount} tweets</div>
            </div>
        `)
        .join('');
}

// Function to display tweet
function createTweetCard(tweet) {
    return `
        <div class="tweet-card">
            <div class="user-info">
                <span class="handle">@${tweet.user.handle}</span>
                <span class="date">${formatDate(tweet.timestamp)}</span>
            </div>
            <div class="content">${tweet.text}</div>
            <div class="metrics">
                ${tweet.metrics.replies ? `<span>🗣 ${tweet.metrics.replies}</span>` : ''}
                ${tweet.metrics.retweets ? `<span>🔁 ${tweet.metrics.retweets}</span>` : ''}
                ${tweet.metrics.likes ? `<span>❤️ ${tweet.metrics.likes}</span>` : ''}
                ${tweet.metrics.views ? `<span>👁 ${tweet.metrics.views}</span>` : ''}
            </div>
        </div>
    `;
}

// Handle form submission
document.getElementById('bookmarkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookmarkUrl = document.getElementById('bookmarkUrl').value;
    const statusDiv = document.getElementById('status');
    
    try {
        statusDiv.textContent = 'Processing your bookmarks...';
        statusDiv.className = 'status-container';
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookmarkUrl }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusDiv.textContent = 'Successfully analyzed your bookmarks!';
            statusDiv.className = 'status-container success';
            updateStats(data.stats);
        } else {
            throw new Error(data.message || 'Failed to process bookmarks');
        }
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.className = 'status-container error';
    }
});

// Handle search
document.getElementById('searchButton').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('searchResults');
    
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (response.ok) {
            if (data.tweets.length === 0) {
                resultsDiv.innerHTML = '<p>No tweets found matching your search.</p>';
            } else {
                resultsDiv.innerHTML = data.tweets.map(createTweetCard).join('');
            }
        } else {
            throw new Error(data.message || 'Search failed');
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});
