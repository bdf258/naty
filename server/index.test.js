import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a test app with the same routes as the main server
function createTestApp(geminiApiKey = 'test-api-key') {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Chat endpoint for Gemini API
  app.post('/api/chat', async (req, res) => {
    const apiKey = geminiApiKey;

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // For testing, return a mock response
    return res.json({ response: 'Mock response from Gemini API' });
  });

  return app;
}

describe('Server API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const app = createTestApp();
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return a valid ISO timestamp', async () => {
      const app = createTestApp();
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('POST /api/chat', () => {
    it('should return 400 if messages is not provided', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Messages array is required');
    });

    it('should return 400 if messages is not an array', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({ messages: 'not an array' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Messages array is required');
    });

    it('should return 500 if API key is not configured', async () => {
      const app = createTestApp(null);
      const response = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Gemini API key not configured');
    });

    it('should return success response with valid messages', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should accept context parameter', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          context: {
            currentQuestion: {
              id: '1',
              category: 'Test',
              question: 'Test question?',
            },
            previousAnswers: { 'Q1': 'Answer 1' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should handle multiple messages', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should accept context with data sources', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          context: {
            currentQuestion: {
              id: '1',
              category: 'Test',
              question: 'Test question?',
            },
            previousAnswers: {},
            dataSources: [
              {
                id: 'ds1',
                name: 'Test Document',
                type: 'file',
                content: 'Test content',
              },
            ],
          },
        });

      expect(response.status).toBe(200);
    });

    it('should handle empty messages array', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/chat')
        .send({ messages: [] });

      expect(response.status).toBe(200);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const app = createTestApp();
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});

describe('Request validation', () => {
  it('should handle large payloads up to 10mb limit', async () => {
    const app = createTestApp();
    const largeContent = 'x'.repeat(1024 * 1024); // 1MB content

    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: largeContent }],
      });

    expect(response.status).toBe(200);
  });

  it('should accept JSON content type', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }));

    expect(response.status).toBe(200);
  });
});
