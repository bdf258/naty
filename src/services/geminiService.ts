// Gemini Flash 3.0 API Service for LLM support in DPIA assessment

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DPIAQuestion {
  id: string;
  category: string;
  question: string;
  guidance?: string;
  exampleResponse?: string;
  required: boolean;
}

export interface DataSourceContext {
  id: string;
  name: string;
  type: 'file' | 'link';
  content: string;
}

export interface ChatContext {
  currentQuestion: DPIAQuestion;
  previousAnswers: Record<string, string>;
  organizationContext?: string;
  dataSources?: DataSourceContext[];
}

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

export async function sendMessage(
  messages: Message[],
  context?: ChatContext
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
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
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error('Unexpected response format from Gemini API');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with Gemini API');
  }
}

// Quick help suggestions based on question type
export function getQuickHelpSuggestions(question: DPIAQuestion): string[] {
  const categoryHelpers: Record<string, string[]> = {
    'Data Processing': [
      'What data will be processed?',
      'Help me describe the data flows',
      'What counts as personal data in this context?'
    ],
    'Risk Assessment': [
      'What are common risks I should consider?',
      'How do I assess risk severity?',
      'Help me identify mitigation measures'
    ],
    'Legal Basis': [
      'What legal bases are available under GDPR?',
      'How do I determine the appropriate legal basis?',
      'Explain legitimate interest assessment'
    ],
    'Data Subject Rights': [
      'What rights do data subjects have?',
      'How should we handle data subject requests?',
      'What information must we provide to data subjects?'
    ],
    'Security Measures': [
      'What security measures should we implement?',
      'Help me describe our technical safeguards',
      'What are appropriate organizational measures?'
    ],
    'AI Specific': [
      'What transparency requirements apply to AI?',
      'How do I document the AI system?',
      'What human oversight is required?'
    ],
    'default': [
      'Explain this question in simpler terms',
      'What information do I need to answer this?',
      'Give me an example response'
    ]
  };

  return categoryHelpers[question.category] || categoryHelpers['default'];
}

// Generate a draft response based on context
export async function generateDraftResponse(
  _question: DPIAQuestion,
  context: ChatContext,
  userNotes?: string
): Promise<string> {
  const prompt = `Based on the current question and context provided, please generate a draft response that the user can review and customize. ${userNotes ? `The user has provided these notes: "${userNotes}"` : 'Create a template with placeholders for specific details they need to fill in.'}

Please format the response appropriately for a formal DPIA document.`;

  return sendMessage([{ role: 'user', content: prompt }], context);
}
