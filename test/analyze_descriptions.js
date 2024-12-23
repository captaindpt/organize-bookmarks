const fs = require('fs').promises;
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

function extractJsonFromResponse(text) {
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

async function analyzeDescriptions() {
    try {
        // Load enriched tweets
        console.log('Loading enriched tweets...');
        const data = await fs.readFile('enriched_tweets.json', 'utf8');
        const tweets = JSON.parse(data);
        
        // Extract all descriptions
        const descriptions = tweets
            .filter(tweet => tweet.semantic_description && tweet.semantic_description !== 'Failed to analyze tweet')
            .map(tweet => tweet.semantic_description);
        
        console.log(`Analyzing ${descriptions.length} tweet descriptions...\n`);
        
        // Initialize Anthropic client
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        const systemPrompt = `You are an expert at content analysis and categorization.
Analyze the provided tweet descriptions and create a categorization scheme.
Return ONLY a JSON object with this exact structure:
{
    "categories": [
        {
            "name": "string",
            "description": "string",
            "examples": ["string"],
            "subcategories": [
                {
                    "name": "string",
                    "description": "string"
                }
            ]
        }
    ],
    "rationale": "string",
    "usage_tips": ["string"]
}

Guidelines for categories:
1. Each category should be distinct and clear
2. Names should be concise (1-2 words)
3. Descriptions should explain what belongs in the category
4. Include 2-3 example descriptions per category
5. Add subcategories only where they add value

DO NOT include any text outside the JSON object.`;

        // Send descriptions to Claude in chunks to avoid token limits
        const chunkSize = 50;
        let allDescriptions = '';
        
        for (let i = 0; i < descriptions.length; i += chunkSize) {
            const chunk = descriptions.slice(i, i + chunkSize);
            allDescriptions += chunk.join('\n\n') + '\n\n';
        }

        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: `Create a categorization scheme for these tweet descriptions. Return ONLY a JSON object:\n\n${allDescriptions}`
                }
            ],
            system: systemPrompt,
            temperature: 0.1
        });

        // Parse and format the response
        const analysis = extractJsonFromResponse(response.content[0].text);
        
        // Save the categorization scheme
        await fs.writeFile(
            'tweet_categories.json',
            JSON.stringify(analysis, null, 2)
        );
        
        // Display the results
        console.log('Proposed Categories:');
        console.log('='.repeat(50));
        
        analysis.categories.forEach(category => {
            console.log(`\n${category.name}`);
            console.log('-'.repeat(category.name.length));
            console.log(category.description);
            console.log('\nExamples:');
            category.examples.forEach(ex => console.log(`- ${ex}`));
            
            if (category.subcategories?.length) {
                console.log('\nSubcategories:');
                category.subcategories.forEach(sub => {
                    console.log(`- ${sub.name}: ${sub.description}`);
                });
            }
        });
        
        console.log('\nRationale:');
        console.log(analysis.rationale);
        
        console.log('\nUsage Tips:');
        analysis.usage_tips.forEach((tip, i) => {
            console.log(`${i + 1}. ${tip}`);
        });
        
        console.log('\nFull categorization scheme saved to tweet_categories.json');
        
    } catch (error) {
        console.error('Analysis failed:', error);
        if (error.message.includes('response:')) {
            console.error('Full response:', error.message);
        }
    }
}

// Run the analysis
console.log('='.repeat(50));
console.log('Tweet Description Analysis');
console.log('='.repeat(50), '\n');

analyzeDescriptions().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
