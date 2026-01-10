import { describe, it, expect, vi } from 'vitest';
import {
  parseExcelFile,
  generateSampleExcel,
  DEMO_DPIA_QUESTIONS
} from './excelParser';

describe('excelParser', () => {
  describe('DEMO_DPIA_QUESTIONS', () => {
    it('should have questions defined', () => {
      expect(DEMO_DPIA_QUESTIONS).toBeDefined();
      expect(Array.isArray(DEMO_DPIA_QUESTIONS)).toBe(true);
      expect(DEMO_DPIA_QUESTIONS.length).toBeGreaterThan(0);
    });

    it('should have properly structured questions', () => {
      DEMO_DPIA_QUESTIONS.forEach((question) => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('category');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('required');
        expect(typeof question.id).toBe('string');
        expect(typeof question.category).toBe('string');
        expect(typeof question.question).toBe('string');
        expect(typeof question.required).toBe('boolean');
      });
    });

    it('should have questions from multiple steps', () => {
      const categories = new Set(DEMO_DPIA_QUESTIONS.map(q => q.category));
      expect(categories.size).toBeGreaterThan(3);
    });

    it('should have Step 1 overview questions', () => {
      const step1Questions = DEMO_DPIA_QUESTIONS.filter(q =>
        q.category.includes('Step 1') || q.id.startsWith('1.')
      );
      expect(step1Questions.length).toBeGreaterThan(0);
    });

    it('should have risk screening questions (Step 2)', () => {
      const step2Questions = DEMO_DPIA_QUESTIONS.filter(q =>
        q.category.includes('Step 2') || q.id.startsWith('2.')
      );
      expect(step2Questions.length).toBeGreaterThan(0);
    });

    it('should have technical overview questions (Step 3)', () => {
      const step3Questions = DEMO_DPIA_QUESTIONS.filter(q =>
        q.category.includes('Step 3') || q.id.startsWith('3.')
      );
      expect(step3Questions.length).toBeGreaterThan(0);
    });

    it('should have guidance for most questions', () => {
      const questionsWithGuidance = DEMO_DPIA_QUESTIONS.filter(q => q.guidance);
      expect(questionsWithGuidance.length).toBeGreaterThan(DEMO_DPIA_QUESTIONS.length / 2);
    });
  });

  describe('generateSampleExcel', () => {
    it('should generate a valid Blob', () => {
      const blob = generateSampleExcel();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('parseExcelFile', () => {
    it('should return error for empty file', async () => {
      const mockFile = new File([''], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Create a proper mock class
      const MockFileReader = vi.fn().mockImplementation(function(this: {
        onload: ((e: ProgressEvent<FileReader>) => void) | null;
        onerror: (() => void) | null;
        result: ArrayBuffer | null;
        readAsArrayBuffer: () => void;
      }) {
        this.onload = null;
        this.onerror = null;
        this.result = null;
        this.readAsArrayBuffer = function() {
          setTimeout(() => {
            this.result = new ArrayBuffer(0);
            if (this.onload) {
              this.onload({ target: { result: this.result } } as ProgressEvent<FileReader>);
            }
          }, 0);
        };
      });

      vi.stubGlobal('FileReader', MockFileReader);

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });

    it('should handle file read errors', async () => {
      const mockFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Create a mock that triggers error
      const MockFileReaderError = vi.fn().mockImplementation(function(this: {
        onload: ((e: ProgressEvent<FileReader>) => void) | null;
        onerror: (() => void) | null;
        result: ArrayBuffer | null;
        readAsArrayBuffer: () => void;
      }) {
        this.onload = null;
        this.onerror = null;
        this.result = null;
        this.readAsArrayBuffer = function() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        };
      });

      vi.stubGlobal('FileReader', MockFileReaderError);

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to read the file');

      vi.unstubAllGlobals();
    });
  });
});
