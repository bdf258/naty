import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, getQuickHelpSuggestions, type DPIAQuestion } from './geminiService';

describe('geminiService', () => {
  describe('getQuickHelpSuggestions', () => {
    it('should return Data Processing suggestions for that category', () => {
      const question: DPIAQuestion = {
        id: '1',
        category: 'Data Processing',
        question: 'What data will be processed?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What data will be processed?');
      expect(suggestions).toContain('Help me describe the data flows');
      expect(suggestions).toContain('What counts as personal data in this context?');
    });

    it('should return Risk Assessment suggestions', () => {
      const question: DPIAQuestion = {
        id: '2',
        category: 'Risk Assessment',
        question: 'What are the risks?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What are common risks I should consider?');
      expect(suggestions).toContain('How do I assess risk severity?');
      expect(suggestions).toContain('Help me identify mitigation measures');
    });

    it('should return Legal Basis suggestions', () => {
      const question: DPIAQuestion = {
        id: '3',
        category: 'Legal Basis',
        question: 'What is the legal basis?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What legal bases are available under GDPR?');
      expect(suggestions).toContain('How do I determine the appropriate legal basis?');
      expect(suggestions).toContain('Explain legitimate interest assessment');
    });

    it('should return Data Subject Rights suggestions', () => {
      const question: DPIAQuestion = {
        id: '4',
        category: 'Data Subject Rights',
        question: 'How do we handle rights?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What rights do data subjects have?');
      expect(suggestions).toContain('How should we handle data subject requests?');
    });

    it('should return Security Measures suggestions', () => {
      const question: DPIAQuestion = {
        id: '5',
        category: 'Security Measures',
        question: 'What security measures?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What security measures should we implement?');
      expect(suggestions).toContain('Help me describe our technical safeguards');
    });

    it('should return AI Specific suggestions', () => {
      const question: DPIAQuestion = {
        id: '6',
        category: 'AI Specific',
        question: 'AI requirements?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('What transparency requirements apply to AI?');
      expect(suggestions).toContain('How do I document the AI system?');
      expect(suggestions).toContain('What human oversight is required?');
    });

    it('should return default suggestions for unknown category', () => {
      const question: DPIAQuestion = {
        id: '7',
        category: 'Unknown Category',
        question: 'Some question?',
        required: true,
      };

      const suggestions = getQuickHelpSuggestions(question);

      expect(suggestions).toContain('Explain this question in simpler terms');
      expect(suggestions).toContain('What information do I need to answer this?');
      expect(suggestions).toContain('Give me an example response');
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should send messages to the API and return response', async () => {
      const mockResponse = { response: 'Test response from API' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await sendMessage([{ role: 'user', content: 'Hello' }]);

      expect(result).toBe('Test response from API');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should include context in the request', async () => {
      const mockResponse = { response: 'Response with context' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const context = {
        currentQuestion: {
          id: '1',
          category: 'Test',
          question: 'Test question?',
          required: true,
        },
        previousAnswers: { 'Q1': 'Answer 1' },
      };

      await sendMessage([{ role: 'user', content: 'Hello' }], context);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"context"'),
        })
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(sendMessage([{ role: 'user', content: 'Hello' }])).rejects.toThrow('API error: 500');
    });

    it('should throw error on unexpected response format', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ unexpected: 'format' }),
      });

      await expect(sendMessage([{ role: 'user', content: 'Hello' }])).rejects.toThrow('Unexpected response format from API');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(sendMessage([{ role: 'user', content: 'Hello' }])).rejects.toThrow('Network error');
    });
  });
});
