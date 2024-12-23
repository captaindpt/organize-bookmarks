const fs = require('fs').promises;
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

function extractJsonFromResponse(text) {
    // Find the first occurrence of '{'
    const start = text.indexOf('{');
    if (start === -1) {
        throw new Error('No JSON object found in response');
    }
    
    // Find the last occurrence of '}'
    const end = text.lastIndexOf('}');
    if (end === -1) {
        throw new Error('Invalid JSON structure in response');
    }
    
    // Extract just the JSON part
    const jsonStr = text.substring(start, end + 1);
    
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`Failed to parse object from response: ${jsonStr}`);
    }
}

class TweetCategorizer {
    constructor(anthropic) {
        this.anthropic = anthropic;
    }

    async getInitialCategories(descriptions) {
        console.log('Getting initial category suggestions...');
        
        // Filter out very short descriptions and those indicating errors
        const validDescriptions = descriptions.filter(desc => {
            return desc.length > 20 && 
                   !desc.includes('Failed to analyze') &&
                   !desc.includes('not enough information') &&
                   !desc.includes('cannot determine');
        });
        
        console.log(`Using ${validDescriptions.length} valid descriptions for categorization...`);
        
        const response = await this.anthropic.messages.create({
            model: "claude-3-opus-20240229",  // Using Opus for initial analysis
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: `Analyze these tweet descriptions and suggest potential categories. Return your analysis as a JSON object:\n\n${validDescriptions.slice(0, 100).join('\n\n')}\n\n[Note: This is a sample of ${validDescriptions.length} descriptions]`
                }
            ],
            system: `You are an expert at content categorization.
Analyze the tweet descriptions and suggest potential categories.
Consider the main themes, purposes, and types of content.
Return ONLY a JSON object with this structure:
{
    "suggested_categories": [
        {
            "name": "string",
            "description": "string",
            "examples": ["string"]
        }
    ],
    "patterns_noticed": ["string"],
    "categorization_challenges": ["string"]
}

DO NOT include any explanatory text outside the JSON object.
If you notice any issues, include them in the categorization_challenges array.`,
            temperature: 0.1
        });

        return extractJsonFromResponse(response.content[0].text);
    }

    async finalizeCategorization(initialAnalysis) {
        console.log('\nFinalizing categories...');
        
        const response = await this.anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: `Based on this initial analysis, create a final set of 5-6 categories (including Misc). Return your categories as a JSON object:\n\n${JSON.stringify(initialAnalysis, null, 2)}`
                }
            ],
            system: `You are a JSON API that returns ONLY valid JSON objects with no other text.
Your task is to create a FINAL set of 5-6 clear, distinct categories (including Misc).
Categories should be broad enough to be useful but specific enough to be meaningful.

Return EXACTLY this structure with no other text:
{
    "final_categories": [
        {
            "name": "string",
            "description": "string",
            "matching_criteria": ["string"]
        }
    ],
    "rationale": "string"
}`,
            temperature: 0
        });

        // Write raw response for debugging
        await fs.writeFile('final_categories_raw.json', response.content[0].text);
        
        const result = extractJsonFromResponse(response.content[0].text);
        await fs.writeFile('final_categories.json', JSON.stringify(result, null, 2));
        return result;
    }

    async categorizeDescriptions(descriptions, categories) {
        console.log('\nCategorizing tweets...');
        
        // Filter out problematic descriptions
        const validDescriptions = descriptions.filter(desc => {
            return desc.length > 20 && 
                   !desc.includes('Failed to analyze') &&
                   !desc.includes('not enough information') &&
                   !desc.includes('cannot determine');
        });
        
        console.log(`Categorizing ${validDescriptions.length} valid descriptions...`);
        
        const batchSize = 10;
        const categorizedTweets = {};
        
        // Initialize category arrays and create a set for quick lookup
        const validCategories = new Set();
        const categoryDescriptions = {};
        
        // Create mapping of categories with their descriptions
        categories.final_categories.forEach(cat => {
            const name = cat.name.trim();
            categorizedTweets[name] = [];
            validCategories.add(name);
            categoryDescriptions[name] = cat.description;
        });
        
        // Ensure Misc category exists
        if (!validCategories.has('Misc')) {
            categorizedTweets['Misc'] = [];
            validCategories.add('Misc');
            categoryDescriptions['Misc'] = "Tweets that don't clearly fit into other categories";
        }

        // Process descriptions in batches
        for (let i = 0; i < validDescriptions.length; i += batchSize) {
            const batch = validDescriptions.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validDescriptions.length/batchSize)}...`);
            
            try {
                const response = await this.anthropic.messages.create({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 1024,
                    messages: [
                        {
                            role: "user",
                            content: `Categorize these descriptions into the provided categories. Return ONLY a JSON object with category assignments:\n\n${batch.join('\n---\n')}`
                        }
                    ],
                    system: `You are categorizing tweet descriptions into EXACTLY these categories:
${Array.from(validCategories).map(cat => `- ${cat}: ${categoryDescriptions[cat]}`).join('\n')}

Return ONLY a JSON object in this EXACT format (no other text):
{
    "categorizations": [
        {
            "description": "the exact description text",
            "category": "EXACTLY one of: ${Array.from(validCategories).join(', ')}"
        }
    ]
}

IMPORTANT:
1. Use ONLY the exact category names listed above
2. If unsure, use "Misc"
3. Return ONLY the JSON object, no other text`,
                    temperature: 0
                });

                let batchResults;
                try {
                    batchResults = extractJsonFromResponse(response.content[0].text);
                    
                    // Validate the response structure
                    if (!batchResults?.categorizations?.length) {
                        throw new Error('Invalid response structure');
                    }
                    
                    // Add descriptions to their categories
                    batchResults.categorizations.forEach(item => {
                        const category = item.category?.trim();
                        const description = item.description?.trim();
                        
                        if (!description) {
                            console.log('Empty description found, skipping...');
                            return;
                        }
                        
                        if (validCategories.has(category)) {
                            categorizedTweets[category].push(description);
                        } else {
                            console.log(`Unknown category "${category}" - adding to Misc`);
                            categorizedTweets['Misc'].push(description);
                        }
                    });
                    
                    // Save progress after each successful batch
                    await fs.writeFile('categorized_tweets.json', JSON.stringify(categorizedTweets, null, 2));
                    
                } catch (parseError) {
                    console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, parseError.message);
                    // Add failed batch to Misc
                    batch.forEach(desc => {
                        if (desc?.trim()) {
                            categorizedTweets['Misc'].push(desc.trim());
                        }
                    });
                }
                
                // Add a small delay between batches
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (apiError) {
                console.error(`API error in batch ${Math.floor(i/batchSize) + 1}:`, apiError.message);
                // Add failed batch to Misc
                batch.forEach(desc => {
                    if (desc?.trim()) {
                        categorizedTweets['Misc'].push(desc.trim());
                    }
                });
            }
        }

        return categorizedTweets;
    }
}

async function main() {
    try {
        // Load enriched tweets
        console.log('Loading enriched tweets...');
        const data = await fs.readFile('enriched_tweets.json', 'utf8');
        const tweets = JSON.parse(data);
        
        // Extract descriptions
        const descriptions = tweets
            .filter(tweet => tweet.semantic_description && tweet.semantic_description !== 'Failed to analyze tweet')
            .map(tweet => tweet.semantic_description);
        
        console.log(`Processing ${descriptions.length} tweet descriptions...\n`);
        
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        const categorizer = new TweetCategorizer(anthropic);
        
        // Step 1: Get initial category suggestions
        const initialAnalysis = await categorizer.getInitialCategories(descriptions);
        await fs.writeFile('initial_categories.json', JSON.stringify(initialAnalysis, null, 2));
        console.log('\nInitial categories saved to initial_categories.json');
        
        // Step 2: Finalize categories
        const finalCategories = await categorizer.finalizeCategorization(initialAnalysis);
        console.log('Final categories saved to final_categories.json');
        
        // Step 3: Categorize all descriptions
        const categorizedTweets = await categorizer.categorizeDescriptions(descriptions, finalCategories);
        await fs.writeFile('categorized_tweets.json', JSON.stringify(categorizedTweets, null, 2));
        console.log('Categorized tweets saved to categorized_tweets.json');
        
        // Display results
        console.log('\nFinal Categories:');
        console.log('='.repeat(50));
        
        finalCategories.final_categories.forEach(cat => {
            const tweetCount = categorizedTweets[cat.name]?.length || 0;
            console.log(`\n${cat.name} (${tweetCount} tweets)`);
            console.log('-'.repeat(cat.name.length));
            console.log(cat.description);
            console.log('\nMatching Criteria:');
            cat.matching_criteria.forEach(c => console.log(`- ${c}`));
        });
        
        console.log('\nRationale:');
        console.log(finalCategories.rationale);
        
        console.log('\nFiles created:');
        console.log('1. initial_categories.json - Initial category analysis');
        console.log('2. final_categories.json - Final 5-6 categories with criteria');
        console.log('3. categorized_tweets.json - Tweets grouped by category');
        
    } catch (error) {
        console.error('Process failed:', error);
        if (error.message.includes('response:')) {
            console.error('Full response:', error.message);
        }
    }
}

// Run the process
console.log('='.repeat(50));
console.log('Tweet Categorization Process');
console.log('='.repeat(50), '\n');

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
