const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');
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
    parts: [{ text: `You are an AI assistant specialized in evaluating and improving Jira task descriptions from a software development perspective. Please answer in the same language as the data you received request. When given a Jira task summary, you will:

1. Assess Task Comprehensiveness:
- Carefully analyze the task description for completeness
- Evaluate if a developer could immediately start working on the task
- Provide a precise percentage (0-100%) indicating how well the task is documented

2. Generate Detailed Recommendations:
- Identify specific gaps in the current task description
- Suggest concrete, actionable improvements
- For each recommendation, provide:
 a) A clear explanation of what information is missing
 b) A specific example of how to address the gap
 c) The potential impact of adding this information

3. Output Format:
- Respond in a structured JSON format with two primary fields:
 - "completeness": Numerical percentage (0-100)
 - "recommendations": An array of recommendation objects, each containing:
  * "area": Description of the missing information
  * "suggestion": Detailed recommendation
  * "example": Concrete example of how to implement the suggestion

4. Focus Areas for Recommendations:
- Technical specifications
- Acceptance criteria
- User stories or use cases
- Performance expectations
- Integration requirements
- Error handling
- Security considerations
- Dependency and prerequisite information
- Testing expectations
- Potential edge cases

5. Goal:
Create a task description so precise and comprehensive that a skilled developer can immediately understand and begin implementation without additional clarification.

Write very detailed so that developer could start step by step as soon as everything is described as you suggested.` }]
  },
});

async function generateContent(inputText) {
  const req = {
    contents: [
      { role: 'user', parts: [{ text: inputText }] }
    ],
  };

  const streamingResp = await generativeModel.generateContentStream(req);

  let result = '';
 

let content =(await streamingResp.response).candidates[0].content.parts[0].text;
 return content;
  return JSON.stringify(content);
}

app.post('/generate', async (req, res) => {
  const inputText = req.body.inputText;

  try {
    const result = await generateContent(inputText);
    res.json(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 2222;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});