import * as XLSX from 'xlsx';
import type { DPIAQuestion } from './geminiService';

export interface ExcelParseResult {
  success: boolean;
  questions: DPIAQuestion[];
  errors: string[];
  warnings: string[];
}

// Expected column mappings - flexible to handle different Excel formats
const COLUMN_MAPPINGS = {
  id: ['id', 'question_id', 'questionid', 'ref', 'reference', 'number', '#'],
  category: ['category', 'section', 'group', 'type', 'area'],
  question: ['question', 'text', 'question_text', 'questiontext', 'description'],
  guidance: ['guidance', 'help', 'hint', 'instructions', 'explanation', 'notes'],
  exampleResponse: ['example', 'example_response', 'exampleresponse', 'sample', 'template'],
  required: ['required', 'mandatory', 'optional', 'req']
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], mappings: string[]): number {
  for (const mapping of mappings) {
    const index = headers.findIndex(h => normalizeHeader(h) === mapping);
    if (index !== -1) return index;
  }
  return -1;
}

function parseRequiredValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['yes', 'true', '1', 'required', 'mandatory', 'y'].includes(lower);
  }
  return true; // Default to required
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            success: false,
            questions: [],
            errors: ['No sheets found in the Excel file'],
            warnings: []
          });
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            questions: [],
            errors: ['Excel file must have at least a header row and one data row'],
            warnings: []
          });
          return;
        }

        // Parse headers
        const headers = jsonData[0].map(h => String(h || ''));
        const errors: string[] = [];
        const warnings: string[] = [];

        // Find column indices
        const columnIndices = {
          id: findColumn(headers, COLUMN_MAPPINGS.id),
          category: findColumn(headers, COLUMN_MAPPINGS.category),
          question: findColumn(headers, COLUMN_MAPPINGS.question),
          guidance: findColumn(headers, COLUMN_MAPPINGS.guidance),
          exampleResponse: findColumn(headers, COLUMN_MAPPINGS.exampleResponse),
          required: findColumn(headers, COLUMN_MAPPINGS.required)
        };

        // Validate required columns
        if (columnIndices.question === -1) {
          resolve({
            success: false,
            questions: [],
            errors: ['Could not find a "Question" column. Please ensure your Excel file has a column named "Question", "Text", or similar.'],
            warnings: []
          });
          return;
        }

        if (columnIndices.id === -1) {
          warnings.push('No ID column found - IDs will be auto-generated');
        }

        if (columnIndices.category === -1) {
          warnings.push('No Category column found - all questions will be in "General" category');
        }

        // Parse data rows
        const questions: DPIAQuestion[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const questionText = row[columnIndices.question];
          if (!questionText || String(questionText).trim() === '') {
            warnings.push(`Row ${i + 1}: Empty question text, skipping`);
            continue;
          }

          const question: DPIAQuestion = {
            id: columnIndices.id !== -1 && row[columnIndices.id]
              ? String(row[columnIndices.id])
              : `q_${i}`,
            category: columnIndices.category !== -1 && row[columnIndices.category]
              ? String(row[columnIndices.category])
              : 'General',
            question: String(questionText).trim(),
            guidance: columnIndices.guidance !== -1 && row[columnIndices.guidance]
              ? String(row[columnIndices.guidance]).trim()
              : undefined,
            exampleResponse: columnIndices.exampleResponse !== -1 && row[columnIndices.exampleResponse]
              ? String(row[columnIndices.exampleResponse]).trim()
              : undefined,
            required: columnIndices.required !== -1
              ? parseRequiredValue(row[columnIndices.required])
              : true
          };

          questions.push(question);
        }

        if (questions.length === 0) {
          resolve({
            success: false,
            questions: [],
            errors: ['No valid questions found in the Excel file'],
            warnings
          });
          return;
        }

        resolve({
          success: true,
          questions,
          errors,
          warnings
        });

      } catch (error) {
        resolve({
          success: false,
          questions: [],
          errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: []
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        questions: [],
        errors: ['Failed to read the file'],
        warnings: []
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

// Generate a sample Excel template
export function generateSampleExcel(): Blob {
  const sampleData = [
    ['ID', 'Category', 'Question', 'Guidance', 'Example Response', 'Required'],
    ['1.1', 'Data Processing', 'Describe the nature, scope, context and purposes of the processing.', 'Consider what data is being processed, why, and how it relates to your AI system.', 'We process customer interaction data including...', 'Yes'],
    ['1.2', 'Data Processing', 'What categories of personal data will be processed?', 'List all types: names, emails, biometric data, etc.', 'The following categories of personal data will be processed: 1) Contact information...', 'Yes'],
    ['2.1', 'Legal Basis', 'What is the legal basis for processing?', 'Refer to GDPR Article 6 and, if applicable, Article 9 for special categories.', 'The legal basis for this processing is...', 'Yes'],
    ['3.1', 'Risk Assessment', 'What are the potential risks to data subjects?', 'Consider privacy, discrimination, security risks, etc.', 'The identified risks include: 1) Unauthorized access...', 'Yes'],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },   // ID
    { wch: 18 },  // Category
    { wch: 50 },  // Question
    { wch: 40 },  // Guidance
    { wch: 40 },  // Example
    { wch: 10 }   // Required
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'DPIA Questions');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Dummy/demo questions for when no Excel is uploaded
export const DEMO_DPIA_QUESTIONS: DPIAQuestion[] = [
  // Section 1: Processing Description
  {
    id: '1.1',
    category: 'Processing Description',
    question: 'Describe the nature, scope, context and purposes of the processing.',
    guidance: 'Provide a comprehensive overview of your AI system, including what data it processes, why, and in what context it operates.',
    exampleResponse: 'Our AI system processes customer support inquiries to provide automated responses. It analyzes text input from customers, categorizes requests, and either responds automatically or routes to human agents.',
    required: true
  },
  {
    id: '1.2',
    category: 'Processing Description',
    question: 'What categories of personal data will be processed by the AI system?',
    guidance: 'List all types of personal data: identifiers, contact info, behavioral data, biometric data, special categories, etc.',
    exampleResponse: 'Categories include: 1) Contact information (name, email), 2) Communication content (message text), 3) Behavioral patterns (interaction history), 4) Technical identifiers (IP address, device info).',
    required: true
  },
  {
    id: '1.3',
    category: 'Processing Description',
    question: 'Who are the data subjects affected by this processing?',
    guidance: 'Identify all groups whose data will be processed (customers, employees, third parties, vulnerable groups, children, etc.)',
    required: true
  },

  // Section 2: Legal Basis
  {
    id: '2.1',
    category: 'Legal Basis',
    question: 'What is the legal basis for processing personal data in this AI system?',
    guidance: 'Reference GDPR Article 6 grounds: consent, contract, legal obligation, vital interests, public task, or legitimate interests.',
    exampleResponse: 'The legal basis is Article 6(1)(b) - performance of a contract, as processing is necessary to provide the customer support service. For analytics, we rely on Article 6(1)(f) - legitimate interests.',
    required: true
  },
  {
    id: '2.2',
    category: 'Legal Basis',
    question: 'If relying on legitimate interests, describe the legitimate interests assessment.',
    guidance: 'Detail: 1) What is the legitimate interest, 2) Is processing necessary for that purpose, 3) Balance against data subject rights and freedoms.',
    required: false
  },
  {
    id: '2.3',
    category: 'Legal Basis',
    question: 'Will the AI system process any special categories of data (Article 9 GDPR)?',
    guidance: 'Special categories include: racial/ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, sex life/orientation.',
    required: true
  },

  // Section 3: Necessity and Proportionality
  {
    id: '3.1',
    category: 'Necessity & Proportionality',
    question: 'How does this processing serve the stated purposes, and is the use of AI necessary?',
    guidance: 'Explain why an AI system specifically is needed and how it contributes to achieving the purpose more effectively than alternatives.',
    required: true
  },
  {
    id: '3.2',
    category: 'Necessity & Proportionality',
    question: 'What measures ensure data minimization in the AI system?',
    guidance: 'Describe how you limit data collection and processing to what is strictly necessary. Include retention policies.',
    required: true
  },

  // Section 4: Risk Assessment
  {
    id: '4.1',
    category: 'Risk Assessment',
    question: 'What are the potential risks to the rights and freedoms of data subjects?',
    guidance: 'Consider: discrimination, privacy intrusion, loss of control, security breaches, inaccurate decisions, profiling impacts, etc.',
    exampleResponse: 'Identified risks: 1) Inaccurate automated responses leading to customer harm (Medium), 2) Potential bias in categorization algorithms (High), 3) Unauthorized access to conversation history (Medium).',
    required: true
  },
  {
    id: '4.2',
    category: 'Risk Assessment',
    question: 'Assess the likelihood and severity of each identified risk.',
    guidance: 'For each risk, rate likelihood (unlikely, possible, likely) and severity (minimal, significant, severe). Consider both individual and societal impacts.',
    required: true
  },
  {
    id: '4.3',
    category: 'Risk Assessment',
    question: 'What specific risks arise from the use of AI/algorithmic decision-making?',
    guidance: 'Consider: algorithmic bias, lack of explainability, model drift, adversarial attacks, training data quality issues.',
    required: true
  },

  // Section 5: Mitigation Measures
  {
    id: '5.1',
    category: 'Risk Mitigation',
    question: 'What technical measures are implemented to address identified risks?',
    guidance: 'Include: encryption, access controls, anonymization, secure development practices, monitoring, logging, bias testing.',
    required: true
  },
  {
    id: '5.2',
    category: 'Risk Mitigation',
    question: 'What organizational measures are implemented to address identified risks?',
    guidance: 'Include: policies, training, governance structures, incident response procedures, regular audits, documentation.',
    required: true
  },
  {
    id: '5.3',
    category: 'Risk Mitigation',
    question: 'How is human oversight of the AI system ensured?',
    guidance: 'Under EU AI Act, describe mechanisms for human intervention, override capabilities, and monitoring of AI decisions.',
    required: true
  },

  // Section 6: Data Subject Rights
  {
    id: '6.1',
    category: 'Data Subject Rights',
    question: 'How are data subjects informed about the AI processing?',
    guidance: 'Describe transparency measures: privacy notices, AI disclosure, explanation of automated decision-making.',
    required: true
  },
  {
    id: '6.2',
    category: 'Data Subject Rights',
    question: 'How can data subjects exercise their rights (access, rectification, erasure, etc.)?',
    guidance: 'Detail procedures for handling Article 15-22 GDPR rights requests in the context of AI processing.',
    required: true
  },
  {
    id: '6.3',
    category: 'Data Subject Rights',
    question: 'If automated decision-making with legal/significant effects occurs, how is the right to human review ensured?',
    guidance: 'Article 22 GDPR requires safeguards including the right to obtain human intervention, express views, and contest decisions.',
    required: false
  },

  // Section 7: AI-Specific Considerations (EU AI Act)
  {
    id: '7.1',
    category: 'EU AI Act Compliance',
    question: 'What is the risk classification of this AI system under the EU AI Act?',
    guidance: 'Determine if the system is: Prohibited, High-Risk (Annex III), Limited Risk (transparency obligations), or Minimal Risk.',
    required: true
  },
  {
    id: '7.2',
    category: 'EU AI Act Compliance',
    question: 'How is the accuracy, robustness, and cybersecurity of the AI system ensured?',
    guidance: 'Describe testing procedures, performance metrics, adversarial testing, security measures, and ongoing monitoring.',
    required: true
  },
  {
    id: '7.3',
    category: 'EU AI Act Compliance',
    question: 'What documentation and record-keeping practices are in place for the AI system?',
    guidance: 'Include: technical documentation, training data records, performance logs, decision audit trails, incident records.',
    required: true
  }
];
