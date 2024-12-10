const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');
const { parse } = require('json5');
const app = express();

app.use(express.json());

const vertex_ai = new VertexAI({ project: 'single-cab-444122-f7', location: 'us-central1' });
const model = 'gemini-1.5-flash-002';

const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'OFF',
    }
  ],
  systemInstruction: {
    parts: [{ text: `You are an AI assistant specialized in optimizing Jira task descriptions for software development. Your primary goal is to transform incomplete task descriptions into clear, actionable, and comprehensive specifications.

Core Evaluation Criteria:
1. Comprehensiveness Assessment
- Analyze the task description's completeness
- Determine if a developer can immediately start work
- Provide a precise documentation quality percentage (0-100%)

2. Detailed Improvement Recommendations
- Identify specific description gaps
- Generate concrete, actionable improvements
- For each recommendation, include:
 a) Missing information explanation
 b) Specific implementation guidance
 c) Potential improvement impact

3. Structured Output Requirements
- JSON format with two primary fields:
 - "completeness": Numerical percentage (0-100)
 - "recommendations": Array of improvement objects
  * "area": Missing information category
  * "suggestion": Detailed improvement recommendation
  * "example": Concrete implementation example

4. Critical Recommendation Focus Areas:
- Technical specifications
- Acceptance criteria
- User stories/use cases
- Performance expectations
- Integration requirements
- Error handling strategies
- Security considerations
- Dependency details
- Testing requirements
- Potential edge cases

Optimization Principles:
- Maximize task clarity
- Minimize ambiguity
- Enable immediate developer action
- Provide comprehensive context

Deliverable Objective:
Generate a task description so precise and detailed that a skilled developer can implement the task comprehensively without additional clarification.

Response Language:
- Check the prompt language and answer in the same language. If summary is german write german, if the analysed text is english write english and so on
- Provide a thorough, step-by-step breakdown` }]
  },
});

const languageDetectionModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature
    : 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'OFF',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'OFF',
    }
  ],
  systemInstruction: {
    parts: [{ text: `Tell me the language of the text.` }]
  },
});

async function detectLanguage(inputText) {
  const req = {
    contents: [
      { role: 'user', parts: [{ text: inputText }] }
    ],
  };

  const streamingResp = await languageDetectionModel.generateContentStream(req);
  let language = (await streamingResp.response).candidates[0].content.parts[0].text.trim();
  return language;
}

async function generateContent(inputText) {
  try {
    const language = await detectLanguage(inputText);

    const req = {
      contents: [
        { role: 'user', parts: [{ text: `${inputText}\n\nPlease answer in this language:${language}. everything. area suggestion and example ` }] }
      ],
    };

    const streamingResp = await generativeModel.generateContentStream(req);

    let result = '';
    let content = (await streamingResp.response).candidates[0].content.parts[0].text;
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    return JSON.stringify({ error: 'Failed to generate content', details: error.message });
  }
}

app.post('/generate', async (req, res) => {
  const inputText = req.body.inputText;

  try {
    const result = await generateContent(inputText);
    
    // Extract the JSON part of the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in the response');
    }
    
    const jsonString = jsonMatch[0];
    
    // Use json5 to parse the string, which is more forgiving than JSON.parse
    const parsedResult = parse(jsonString);
    
    res.json(parsedResult);
  } catch (error) {
    console.error('Error processing response:', error);
    console.error('Raw response:', result);
    res.status(500).json({ 
      error: 'Failed to process response', 
      details: error.message,
      position: error.at || 'unknown'
    });
  }
  
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 2222;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});