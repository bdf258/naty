import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are an expert Data Protection Impact Assessment (DPIA) assistant, specializing in EU AI Act compliance and GDPR requirements. Your role is to help users complete complex DPIA questionnaires by:

1. **Explaining Questions**: Breaking down complex legal and technical questions into understandable terms
2. **Structuring Responses**: Helping users formulate comprehensive, compliant responses
3. **Providing Examples**: Offering relevant examples and templates when helpful
4. **Identifying Risks**: Highlighting potential data protection risks and mitigation strategies
5. **Regulatory Guidance**: Referencing relevant EU AI Act articles, GDPR provisions, and best practices

When helping users:
- Be concise but thorough
- Use bullet points for clarity when listing items
- Cite specific regulations when relevant (e.g., "Under Article 35 of GDPR...")
- Suggest what information the user should gather if they don't have it readily available
- Flag any potential compliance concerns

Remember: You're helping with legitimate compliance work, not providing legal advice. Recommend consulting legal counsel for complex situations.`;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint for Gemini API
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Build context-aware prompt
  let contextPrompt = SYSTEM_PROMPT;

  if (context?.currentQuestion) {
    contextPrompt += `\n\n## Current Question Context
**Category**: ${context.currentQuestion.category}
**Question**: ${context.currentQuestion.question}
${context.currentQuestion.guidance ? `**Official Guidance**: ${context.currentQuestion.guidance}` : ''}
${context.currentQuestion.exampleResponse ? `**Example Response Format**: ${context.currentQuestion.exampleResponse}` : ''}`;
  }

  if (context?.previousAnswers && Object.keys(context.previousAnswers).length > 0) {
    contextPrompt += `\n\n## Previously Answered Questions
The user has already provided the following information:
${Object.entries(context.previousAnswers).map(([q, a]) => `- **${q}**: ${a}`).join('\n')}`;
  }

  if (context?.organizationContext) {
    contextPrompt += `\n\n## Organization Context
${context.organizationContext}`;
  }

  if (context?.dataSources && context.dataSources.length > 0) {
    contextPrompt += `\n\n## Relevant Data Sources
The user has selected the following data sources as relevant to this question. Use this information to help provide more accurate and contextual responses:

${context.dataSources.map((ds, i) => `### Source ${i + 1}: ${ds.name} (${ds.type})
${ds.content}`).join('\n\n')}`;
  }

  // Format messages for Gemini API
  const geminiMessages = [
    {
      role: 'user',
      parts: [{ text: contextPrompt }]
    },
    {
      role: 'model',
      parts: [{ text: 'I understand. I\'m ready to assist with the DPIA assessment. How can I help you with the current question?' }]
    },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))
  ];

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`,
        details: errorData
      });
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return res.json({ response: data.candidates[0].content.parts[0].text });
    }

    return res.status(500).json({ error: 'Unexpected response format from Gemini API' });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
