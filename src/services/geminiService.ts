// Gemini API Service - proxied through backend server

// Get API URL from runtime config (Docker) or build-time env var (dev)
declare global {
  interface Window {
    ENV?: {
      VITE_API_URL?: string;
    };
  }
}

const getApiUrl = (): string => {
  // Check runtime config first (for Docker deployment)
  if (window.ENV?.VITE_API_URL && !window.ENV.VITE_API_URL.includes('__')) {
    return window.ENV.VITE_API_URL;
  }
  // Fall back to build-time env var or default
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

const API_BASE_URL = getApiUrl();

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

export async function sendMessage(
  messages: Message[],
  context?: ChatContext
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, context })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (data.response) {
      return data.response;
    }

    throw new Error('Unexpected response format from API');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with API');
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
