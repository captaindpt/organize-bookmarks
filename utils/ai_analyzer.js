const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
require('dotenv').config();

class AITweetAnalyzer {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }

    /**
     * Extract JSON from Claude's response, handling markdown formatting
     */
    extractJsonFromResponse(text) {
        try {
            // Try parsing the text directly first
            return JSON.parse(text);
        } catch (e) {
            // If direct parsing fails, try to extract JSON from markdown
            const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch (e2) {
                    throw new Error(`Failed to parse JSON from response: ${text}`);
                }
            }
            
            // If no JSON block found, try to find any object-like structure
            const objectMatch = text.match(/\{[\s\S]*?\}/);
            if (objectMatch) {
                try {
                    return JSON.parse(objectMatch[0]);
                } catch (e3) {
                    throw new Error(`Failed to parse object from response: ${text}`);
                }
            }
            
            throw new Error(`No valid JSON found in response: ${text}`);
        }
    }

    /**
     * Enrich a single tweet with a semantic description
     */
    async enrichTweet(tweet) {
        // Prepare tweet content including media and links
        const tweetContent = this.formatTweetContent(tweet);
        
        const systemPrompt = `You are an expert at understanding and describing social media content.
Your task is to provide a clear, semantic description of the tweet that captures its essence and main points.
Focus on explaining WHAT the tweet is about and WHY someone might want to reference it later.
Return a JSON object with a single field "description" containing your semantic description.
Keep the description concise but informative, around 2-3 sentences.
DO NOT include markdown formatting in your response.`;

        try {
            const response = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: `Provide a semantic description of this tweet:\n\n${tweetContent}`
                    }
                ],
                system: systemPrompt,
                temperature: 0.2
            });

            // Parse the JSON response
            const analysis = this.extractJsonFromResponse(response.content[0].text);
            return {
                ...tweet,
                semantic_description: analysis.description
            };

        } catch (error) {
            console.error('Error enriching tweet:', error);
            return {
                ...tweet,
                semantic_description: 'Failed to analyze tweet'
            };
        }
    }

    /**
     * Format tweet content including media and links
     */
    formatTweetContent(tweet) {
        let content = [];
        
        // Add main tweet text
        content.push(`Tweet: ${tweet.text || ''}`);
        
        // Add quoted tweet if present
        if (tweet.quotedTweet?.text) {
            content.push(`Quoted Tweet: ${tweet.quotedTweet.text}`);
        }
        
        // Add media information
        if (tweet.media?.photos?.length) {
            content.push(`Images: ${tweet.media.photos.length} photos`);
            tweet.media.photos.forEach((photo, index) => {
                content.push(`Image ${index + 1}: ${photo.url || 'URL not available'}`);
            });
        }
        
        // Add links
        if (tweet.media?.links?.length) {
            content.push('Links:');
            tweet.media.links.forEach(link => {
                content.push(link.url || 'URL not available');
            });
        }
        
        return content.join('\n');
    }

    /**
     * Process all tweets in batches and save enriched data
     */
    async enrichTweetDatabase(inputFile = 'bookmarked_tweets.json', batchSize = 5) {
        try {
            // Load tweets
            const data = await fs.readFile(inputFile, 'utf8');
            const tweets = JSON.parse(data);
            
            const enrichedTweets = [];
            console.log(`Processing ${tweets.length} tweets in batches of ${batchSize}...`);
            
            // Process tweets in batches
            for (let i = 0; i < tweets.length; i += batchSize) {
                const batch = tweets.slice(i, i + batchSize);
                console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tweets.length/batchSize)}`);
                
                try {
                    // Process each tweet in the batch
                    const enrichedBatch = await Promise.all(
                        batch.map(tweet => this.enrichTweet(tweet))
                    );
                    
                    enrichedTweets.push(...enrichedBatch);
                    
                    // Save progress after each batch
                    await fs.writeFile(
                        'enriched_tweets.json',
                        JSON.stringify(enrichedTweets, null, 2)
                    );
                } catch (batchError) {
                    console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError);
                }
                
                // Add a delay between batches to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('Finished processing all tweets');
            return enrichedTweets;
            
        } catch (error) {
            console.error('Error processing tweet database:', error);
            throw error;
        }
    }
}

module.exports = AITweetAnalyzer;
