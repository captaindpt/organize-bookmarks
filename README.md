# Twitter Bookmarks Analyzer (Work in Progress)

A tool for scraping and analyzing your Twitter bookmarks using AI to generate semantic descriptions and categorizations.

## Current Features

- **Bookmark Scraping**: Automated scraping of Twitter bookmarks page using Puppeteer
- **AI Analysis**: Uses Claude API to generate semantic descriptions of tweets
- **Smart Categorization**: AI-powered categorization of tweets into meaningful groups
- **Data Storage**: Saves enriched tweet data and categorizations in JSON format

## Project Structure

```
organize-bookmarks/
├── test/
│   ├── scraper.test.js     # Twitter bookmark scraping logic
│   ├── enrich_tweets.js    # AI analysis of tweets
│   └── categorize_tweets.js # Tweet categorization logic
├── .env                    # Environment variables
└── README.md              # Documentation
```

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API keys:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

1. Run the bookmark scraper:
```bash
node test/scraper.test.js
```

2. Enrich tweets with AI descriptions:
```bash
node test/enrich_tweets.js
```

3. Categorize the enriched tweets:
```bash
node test/categorize_tweets.js
```

## Output Files

- `bookmarks.json`: Raw scraped bookmark data
- `enriched_tweets.json`: Tweets with AI-generated descriptions
- `initial_categories.json`: Initial category analysis
- `final_categories.json`: Final categorization scheme
- `categorized_tweets.json`: Tweets grouped by category

## Future Plans

- Web interface for viewing and managing categorized bookmarks
- Real-time bookmark analysis
- Custom category creation
- Search and filtering capabilities
- Export functionality

## Note

This project is currently a work in progress and primarily focused on the data collection and analysis components. The UI implementation is planned for future development.
