import * as XLSX from 'xlsx';
import type { DPIAQuestion } from './geminiService';

export interface ExcelParseResult {
  success: boolean;
  questions: DPIAQuestion[];
  errors: string[];
  warnings: string[];
}

// Sheets to parse from the Natal.IA Legal template
const TEMPLATE_SHEETS = [
  'Step 1 (General)',
  'Step 2 (Mandatory)',
  'Step 3 (Mandatory)',
  'Step 4 (AI High-risk only)',
  'Step 5 (AI High-risk only)',
  'Step 6 (Mandatory)'
];

// Expected column mappings - flexible to handle different Excel formats
const COLUMN_MAPPINGS = {
  id: ['id', 'question_id', 'questionid', 'ref', 'reference', 'number', '#'],
  category: ['category', 'section', 'group', 'type', 'area'],
  question: ['question', 'text', 'question_text', 'questiontext', 'description', 'questions'],
  guidance: ['guidance', 'help', 'hint', 'instructions', 'explanation', 'notes', 'message from the platform'],
  exampleResponse: ['example', 'example_response', 'exampleresponse', 'sample', 'template'],
  required: ['required', 'mandatory', 'optional', 'req']
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], mappings: string[]): number {
  for (const mapping of mappings) {
    const normalizedMapping = normalizeHeader(mapping);
    const index = headers.findIndex(h => normalizeHeader(h) === normalizedMapping);
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

// Check if a string looks like it's a question (not a title/header)
function isLikelyQuestion(text: string): boolean {
  if (!text || text.trim().length < 10) return false;
  // Exclude obvious titles/headers
  if (text.startsWith('Step ') || text === 'AI RISK ASSESSMENT') return false;
  if (text.includes('Please review the list below')) return false;
  // Questions typically end with ? or are substantive text
  return text.includes('?') || text.length > 30;
}

// Extract section/category name from text
function extractSectionName(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Match patterns like "Step 1:", "3.1.", "Principle 1", or section headers
  if (trimmed.match(/^Step \d+:/i)) return trimmed;
  if (trimmed.match(/^\d+\.\d+\.?\s/)) return trimmed.split('\n')[0].trim();
  if (trimmed.match(/^Principle \d+/i)) return trimmed.split('\n')[0].trim();
  // Check for category headers (typically short, capitalized text)
  if (trimmed.length < 100 && !trimmed.includes('?') && trimmed.match(/^[A-Z][^.!?]*$/)) {
    return trimmed;
  }
  return null;
}

// Parse the Natal.IA Legal template format
function parseTemplateSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  _warnings: string[]
): DPIAQuestion[] {
  const questions: DPIAQuestion[] = [];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (data.length < 2) return questions;

  let currentSubCategory = '';
  let questionCounter = 0;

  // Determine the structure of this sheet
  // Template format: Column A (number), Column B (question), Column C (answer), Column D (guidance)
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] as unknown[];
    if (!row || row.length === 0) continue;

    // Find the first non-null cell to determine offset
    let offset = 0;
    while (offset < row.length && (row[offset] === null || row[offset] === undefined)) {
      offset++;
    }

    // Check for section headers
    const firstCell = row[offset];
    const secondCell = row[offset + 1];

    // Check if this is a section/category header
    if (firstCell && typeof firstCell === 'string') {
      const sectionName = extractSectionName(firstCell);
      if (sectionName && !isLikelyQuestion(firstCell)) {
        if (sectionName.match(/^Step \d+/i) || sectionName.match(/^Principle \d+/i)) {
          currentSubCategory = sectionName;
        } else if (sectionName.length < 80) {
          currentSubCategory = sectionName;
        }
        continue;
      }
    }

    // Check for sub-section headers in second column
    if (secondCell && typeof secondCell === 'string') {
      const sectionName = extractSectionName(secondCell);
      if (sectionName && !isLikelyQuestion(secondCell)) {
        if (sectionName.match(/^\d+\.\d+\.?\s/) || sectionName.match(/^Principle \d+/i)) {
          currentSubCategory = sectionName;
        } else if (sectionName.length < 80 && !secondCell.includes('\n\n')) {
          currentSubCategory = sectionName;
        }
        continue;
      }
    }

    // Look for question rows - typically have a number in first meaningful column
    // and question text in the next column
    let questionId: string | null = null;
    let questionText: string | null = null;
    let guidance: string | null = null;

    // Check if first meaningful cell is a number (question ID)
    if (typeof firstCell === 'number' || (typeof firstCell === 'string' && /^\d+$/.test(firstCell.trim()))) {
      questionId = String(firstCell);
      // Question text is in the next column
      if (secondCell && typeof secondCell === 'string' && isLikelyQuestion(secondCell)) {
        questionText = secondCell.trim();
        // Guidance might be in column D (offset + 3) or later
        const guidanceCell = row[offset + 3] || row[offset + 2];
        if (guidanceCell && typeof guidanceCell === 'string' && guidanceCell.trim().length > 10) {
          guidance = guidanceCell.trim();
        }
      }
    }
    // Alternative: question might be in first cell if it's text
    else if (typeof firstCell === 'string' && isLikelyQuestion(firstCell)) {
      questionCounter++;
      questionId = String(questionCounter);
      questionText = firstCell.trim();
      // Check for guidance in adjacent columns
      if (secondCell && typeof secondCell === 'string' && secondCell.trim().length > 10 && !isLikelyQuestion(secondCell)) {
        guidance = secondCell.trim();
      }
    }
    // Check second column for questions
    else if (secondCell && typeof secondCell === 'string' && isLikelyQuestion(secondCell)) {
      // First cell might be the question number
      if (typeof firstCell === 'number' || (typeof firstCell === 'string' && /^\d+$/.test(firstCell.trim()))) {
        questionId = String(firstCell);
      } else {
        questionCounter++;
        questionId = String(questionCounter);
      }
      questionText = secondCell.trim();
      // Look for guidance in further columns
      const guidanceCell = row[offset + 3] || row[offset + 2];
      if (guidanceCell && typeof guidanceCell === 'string' && guidanceCell.trim().length > 10) {
        guidance = guidanceCell.trim();
      }
    }

    // If we found a valid question, add it
    if (questionText && questionText.length > 10) {
      // Build category from sheet name and sub-category
      let category = sheetName.replace(/\(.*\)/, '').trim();
      if (currentSubCategory) {
        category = currentSubCategory;
      }

      // Build full question ID
      const stepMatch = sheetName.match(/Step (\d+)/);
      const stepNum = stepMatch ? stepMatch[1] : '0';
      const fullId = `${stepNum}.${questionId}`;

      questions.push({
        id: fullId,
        category,
        question: questionText,
        guidance: guidance || undefined,
        exampleResponse: undefined,
        required: true // Default to required for this template
      });
    }
  }

  return questions;
}

// Parse standard format with explicit headers
function parseStandardFormat(
  sheet: XLSX.WorkSheet,
  _warnings: string[]
): DPIAQuestion[] {
  const questions: DPIAQuestion[] = [];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (jsonData.length < 2) return questions;

  // Parse headers from first row
  const headers = (jsonData[0] as unknown[]).map(h => String(h || ''));

  // Find column indices
  const columnIndices = {
    id: findColumn(headers, COLUMN_MAPPINGS.id),
    category: findColumn(headers, COLUMN_MAPPINGS.category),
    question: findColumn(headers, COLUMN_MAPPINGS.question),
    guidance: findColumn(headers, COLUMN_MAPPINGS.guidance),
    exampleResponse: findColumn(headers, COLUMN_MAPPINGS.exampleResponse),
    required: findColumn(headers, COLUMN_MAPPINGS.required)
  };

  // Need at least a question column
  if (columnIndices.question === -1) {
    return questions;
  }

  // Parse data rows
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as unknown[];
    if (!row || row.length === 0) continue;

    const questionText = row[columnIndices.question];
    if (!questionText || String(questionText).trim() === '') continue;

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

  return questions;
}

// Detect if this is a Natal.IA Legal template
function isNatalTemplate(sheetNames: string[]): boolean {
  return TEMPLATE_SHEETS.some(templateSheet =>
    sheetNames.some(name => name.includes('Step') || name === templateSheet)
  );
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            questions: [],
            errors: ['No sheets found in the Excel file'],
            warnings: []
          });
          return;
        }

        const warnings: string[] = [];
        let questions: DPIAQuestion[] = [];

        // Check if this is the Natal.IA Legal template format
        if (isNatalTemplate(workbook.SheetNames)) {
          // Parse all Step sheets from the template
          const sheetsToProcess = workbook.SheetNames.filter(name =>
            name.includes('Step') && !name.includes('Commands') && !name.includes('Sheet')
          );

          for (const sheetName of sheetsToProcess) {
            const sheet = workbook.Sheets[sheetName];
            const sheetQuestions = parseTemplateSheet(sheet, sheetName, warnings);
            questions = questions.concat(sheetQuestions);
          }

          if (questions.length === 0) {
            warnings.push('No questions found in Step sheets, trying standard format');
            // Fall back to standard format on first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            questions = parseStandardFormat(firstSheet, warnings);
          }
        } else {
          // Use standard format parsing on first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          questions = parseStandardFormat(firstSheet, warnings);

          if (questions.length === 0) {
            // Try template parsing as fallback
            questions = parseTemplateSheet(firstSheet, workbook.SheetNames[0], warnings);
          }
        }

        if (questions.length === 0) {
          resolve({
            success: false,
            questions: [],
            errors: ['No valid questions found in the Excel file. Please ensure your file has questions with text longer than 10 characters.'],
            warnings
          });
          return;
        }

        resolve({
          success: true,
          questions,
          errors: [],
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

// Generate a sample Excel template matching Natal.IA Legal format
export function generateSampleExcel(): Blob {
  const workbook = XLSX.utils.book_new();

  // Step 1 (General) - Company details and overview questions
  const step1Data = [
    [null, 'AI RISK ASSESSMENT'],
    [],
    [null, 'Details of the Company'],
    [null, 'Name of the Company', '[Free text answer]'],
    [null, 'Date of the Assessment', '[Free text answer]'],
    [null, 'Date of the sign-off', '[Free text answer]'],
    [null, 'Name and role of the person responsible for this AI System or Project', '[Free text answer]'],
    [],
    [null, 'Step 1: Overview of the AI System'],
    [null, 'In this first step, we\'d like to gather a high-level understanding of your AI system or project.'],
    [null, 'Questions', 'Responses', 'Instructions'],
    [1, 'What is the complete name of the AI system or project you\'d like us to review?', '[Free text answer]', 'Please provide the official or working name of the AI system.'],
    [2, 'How does your organisation interact with AI systems? Please choose the option that best describes your role', null, 'You are likely acting as a Provider if your organisation builds an AI system and makes it available to others under your own name or brand.\n\nYou are likely acting as a Deployer if your organisation uses an AI system as part of its activities.'],
    [3, 'What business goals or benefits is your company hoping to achieve with this AI system or use case?', '[Free text answer]', 'Examples:\n- Improving accuracy in creditworthiness assessments\n- Enhancing decision-making in recruitment\n- Supporting fraud detection'],
    [4, 'Which individuals or groups could be directly or indirectly affected by the AI system?', '[Free text answer]', 'This can include people who use the system or anyone impacted by its outcomes, such as employees, customers, applicants, or vulnerable individuals.'],
    [5, 'What is the expected timeline for implementing, using, or offering this AI system or project?', '[Free text answer]', 'Please provide an estimated timeline.'],
  ];

  const step1Sheet = XLSX.utils.aoa_to_sheet(step1Data);
  step1Sheet['!cols'] = [
    { wch: 5 },   // Number
    { wch: 60 },  // Question
    { wch: 30 },  // Response
    { wch: 50 },  // Instructions
  ];
  XLSX.utils.book_append_sheet(workbook, step1Sheet, 'Step 1 (General)');

  // Step 2 (Mandatory) - Risk screening questions
  const step2Data = [
    [null, 'AI RISK ASSESSMENT'],
    [],
    [],
    [null, 'Step 2: AI Risk Screening Questions'],
    [null, 'These questions help us understand the type of AI system and determine whether any special rules may apply.'],
    [null, null, 'Answer', 'Condition', 'Message from the Platform'],
    [1, 'Will the AI system be used for any prohibited uses under the EU AI Act?\n\n1- AI systems using subliminal or manipulative techniques\n2- AI systems exploiting vulnerable individuals\n3- AI systems for social scoring\n4- Real-time remote biometric identification in public spaces', null, 'If Yes,', 'This AI system may fall under a prohibited use. Please contact a lawyer for review.'],
    [2, 'Does the AI system form part of a product requiring third-party conformity assessment?\n\nExamples: Medical devices, Toys, Machinery, Motor vehicles, Aviation systems', null, 'If Yes,', 'The AI system is likely classified as high-risk under the EU AI Act.'],
    [3, 'Will the AI system involve any of these types of processing?\n\n1- Biometric or sensitive information\n2- Access to education or training\n3- Employment, workforce management\n4- Access to essential services (credit scoring, healthcare)\n5- Law enforcement interactions\n6- Border control or migration management\n7- Safety components of products', null, 'If Yes,', 'Please confirm whether the system performs narrow procedural tasks or supports human decision-making.'],
  ];

  const step2Sheet = XLSX.utils.aoa_to_sheet(step2Data);
  step2Sheet['!cols'] = [
    { wch: 5 },   // Number
    { wch: 70 },  // Question
    { wch: 15 },  // Answer
    { wch: 15 },  // Condition
    { wch: 50 },  // Message
  ];
  XLSX.utils.book_append_sheet(workbook, step2Sheet, 'Step 2 (Mandatory)');

  // Step 3 (Mandatory) - Technical AI Overview
  const step3Data = [
    [null, 'AI RISK ASSESSMENT'],
    [],
    [null, 'Step 3: Technical AI Overview'],
    [],
    [null, '3.1. Technical Overview & System Characteristics'],
    [null, 'This section helps us understand how the AI system works, what data it relies on, and its intended purpose.'],
    [null, null, 'Answer', 'Instructions'],
    [1, 'What is the intended purpose of the AI system?', '[Free text answer]', 'Please describe what the AI system is meant to do, including the core function, what problem it solves, and who it supports.'],
    [2, 'What are the potential unintended uses of the AI system?', '[Free text answer]', 'Consider situations where the system could be used in a different context than designed, or misused.'],
    [3, 'Could you describe the context in which the AI system will be used and the specific use case it supports?', '[Free text answer]', 'Include details about the business area, users, decisions influenced, and deployment environment.'],
    [4, 'Is the AI system you are describing a general-purpose AI model?', null, 'A general-purpose AI model is one trained on diverse datasets that can perform many different tasks.'],
    [5, 'What type of AI technology does the system use?', '[Free text answer]', 'Examples: machine learning, deep learning, natural language processing, computer vision, etc.'],
    [6, 'What types of data does the AI system rely on to operate?', '[Free text answer]', 'Include input data types: text, images, audio, structured business data, behavioral data, etc.'],
    [7, 'What is the main context of the data used for training, testing, and/or validating the AI system?', '[Free text answer]', 'Describe data provenance, quality processes, potential bias risks, and temporal scope.'],
    [8, 'Does the AI system handle any personal data about individuals?', null, 'Personal data includes names, emails, ID numbers, images, voice recordings, IP addresses, etc.'],
    [9, 'What data is used to train or fine-tune the AI system?', '[Free text answer]', 'Describe whether internal, customer, public, vendor, or synthetic data is used.'],
    [10, 'How does the AI system generate its outputs?', '[Free text answer]', 'Describe if it classifies, predicts, generates content, recommends, or detects anomalies.'],
    [11, 'How mature is the AI system in the market?', '[Free text answer]', 'Is it widely used, recently released, prototype, or emerging technology?'],
    [12, 'At what stage of development is the AI system?', null, 'Being trained, undergoing validation, pilot phase, or fully deployed?'],
    [13, 'Will the AI system incorporate or rely on third-party tools, models, or APIs?', null, 'Describe any external dependencies.'],
    [14, 'Will the AI system influence or support decision-making?', null, '1. Fully automated\n2. Human-in-the-loop\n3. Human-on-the-loop\n4. Informational only\n5. Not sure'],
    [],
    [null, '3.2. Relevant contractual provisions'],
    [null, 'This section covers contractual, licensing, and IP considerations.'],
    [1, 'Do you have the right to use the data for training or operating this AI system?', null, 'Describe any licences, agreements, or permissions.'],
    [2, 'Who owns the AI model or technology you are using?', '[Free text answer]', 'Is it internal, vendor, open-source, or third-party service?'],
    [3, 'Are there any licensing or contractual restrictions on using the model or the data?', '[Free text answer]', 'Include restrictions on commercial use, fine-tuning, redistribution, etc.'],
    [4, 'Who owns the outputs generated by the AI system?', '[Free text answer]', 'Your organisation, vendor, or shared arrangement?'],
  ];

  const step3Sheet = XLSX.utils.aoa_to_sheet(step3Data);
  step3Sheet['!cols'] = [
    { wch: 5 },   // Number
    { wch: 70 },  // Question
    { wch: 30 },  // Answer
    { wch: 50 },  // Instructions
  ];
  XLSX.utils.book_append_sheet(workbook, step3Sheet, 'Step 3 (Mandatory)');

  // Step 4 (AI High-risk only) - Risk identification
  const step4Data = [
    [null, null, 'AI RISK ASSESSMENT'],
    [null, null, 'This section is only necessary for AI systems classified as High-Risk'],
    [],
    [null, 'Step 4: Identify the risks'],
    [],
    [null, 'Principle 1', 'Safety, security and robustness'],
    [null, null, 'AI systems should remain safe, secure, and reliable throughout their life cycle.'],
    [null, null, 'Performance & Reliability Risks', 'Likelihood', 'Severity', 'Overall Risk', 'Explanation'],
    [null, 1, 'The system may produce inaccurate, unexpected, or fabricated outputs (e.g., hallucinations).', null, null, null, '[Provide details]'],
    [null, 2, 'Performance may vary across different inputs, contexts, or users.', null, null, null, '[Provide details]'],
    [null, 3, 'The system may produce false positives or false negatives.', null, null, null, '[Provide details]'],
    [],
    [null, null, 'Data Quality & Accuracy Risks', 'Likelihood', 'Severity', 'Overall Risk', 'Explanation'],
    [null, 1, 'The training or testing data may contain inaccuracies, errors, or inconsistencies.', null, null, null, '[Provide details]'],
    [null, 2, 'Some data sources may be outdated or not aligned with the current use case.', null, null, null, '[Provide details]'],
    [],
    [null, null, 'Security Risks', 'Likelihood', 'Severity', 'Overall Risk', 'Explanation'],
    [null, 1, 'The system may be sensitive to prompt injection or adversarial inputs.', null, null, null, '[Provide details]'],
    [null, 2, 'Model extraction, data poisoning, or interference could affect behaviour.', null, null, null, '[Provide details]'],
    [],
    [null, 'Principle 2', 'Human-centred values and fairness'],
    [null, null, 'AI systems should incorporate human rights, human oversight, and allow human intervention.'],
    [null, null, 'Fairness and Non-Discrimination Risks', 'Likelihood', 'Severity', 'Overall Risk', 'Explanation'],
    [null, 1, 'The AI may not perform consistently across different demographic or cultural groups.', null, null, null, '[Provide details]'],
    [null, 2, 'Outputs may reflect patterns that affect at-risk or marginalised groups.', null, null, null, '[Provide details]'],
  ];

  const step4Sheet = XLSX.utils.aoa_to_sheet(step4Data);
  step4Sheet['!cols'] = [
    { wch: 3 },   // Empty
    { wch: 12 },  // Principle/Number
    { wch: 60 },  // Risk description
    { wch: 12 },  // Likelihood
    { wch: 12 },  // Severity
    { wch: 12 },  // Overall Risk
    { wch: 40 },  // Explanation
  ];
  XLSX.utils.book_append_sheet(workbook, step4Sheet, 'Step 4 (AI High-risk only)');

  // Step 5 (AI High-risk only) - Mitigations
  const step5Data = [
    [],
    [null, null, 'AI RISK ASSESSMENT'],
    [null, null, 'This section is only necessary for AI systems classified as High-Risk'],
    [],
    [null, 'Step 5: Risk Mitigation Measures'],
    [],
    [null, null, 'Answer', 'Instructions'],
    [1, 'What technical measures are implemented to address identified risks?', '[Free text answer]', 'Include encryption, access controls, anonymization, secure development, monitoring, bias testing.'],
    [2, 'What organizational measures are implemented to address identified risks?', '[Free text answer]', 'Include policies, training, governance, incident response, audits, documentation.'],
    [3, 'How is human oversight of the AI system ensured?', '[Free text answer]', 'Describe mechanisms for human intervention, override capabilities, and monitoring.'],
    [4, 'How are data subjects informed about the AI processing?', '[Free text answer]', 'Describe transparency measures: privacy notices, AI disclosure, explanation of automated decisions.'],
    [5, 'How can data subjects exercise their rights?', '[Free text answer]', 'Detail procedures for access, rectification, erasure, etc.'],
  ];

  const step5Sheet = XLSX.utils.aoa_to_sheet(step5Data);
  step5Sheet['!cols'] = [
    { wch: 5 },   // Number
    { wch: 60 },  // Question
    { wch: 30 },  // Answer
    { wch: 50 },  // Instructions
  ];
  XLSX.utils.book_append_sheet(workbook, step5Sheet, 'Step 5 (AI High-risk only)');

  // Step 6 (Mandatory) - Sign off
  const step6Data = [
    [],
    [null, 'AI RISK ASSESSMENT'],
    [],
    [null, 'Step 6: Sign off'],
    [],
    [null, null, 'Answer', 'Instructions'],
    [1, 'Name of the person completing this assessment', '[Free text answer]', 'Please provide your full name.'],
    [2, 'Role/Title of the person completing this assessment', '[Free text answer]', 'Please provide your role or job title.'],
    [3, 'Date of completion', '[Free text answer]', 'Please provide the date.'],
    [4, 'Declaration: I confirm that the information provided in this assessment is accurate to the best of my knowledge.', null, 'Please confirm by typing "I confirm" or selecting Yes.'],
    [5, 'Additional comments or notes', '[Free text answer]', 'Optional: Add any other relevant information.'],
  ];

  const step6Sheet = XLSX.utils.aoa_to_sheet(step6Data);
  step6Sheet['!cols'] = [
    { wch: 5 },   // Number
    { wch: 60 },  // Question
    { wch: 30 },  // Answer
    { wch: 50 },  // Instructions
  ];
  XLSX.utils.book_append_sheet(workbook, step6Sheet, 'Step 6 (Mandatory)');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Demo questions matching the Natal.IA Legal AI Risk Assessment Template
export const DEMO_DPIA_QUESTIONS: DPIAQuestion[] = [
  // Step 1: Overview of the AI System
  {
    id: '1.1',
    category: 'Step 1: Overview of the AI System',
    question: 'What is the complete name of the AI system or project you\'d like us to review?',
    guidance: 'Please provide the official or working name of the AI system.',
    required: true
  },
  {
    id: '1.2',
    category: 'Step 1: Overview of the AI System',
    question: 'How does your organisation interact with AI systems? Please choose the option that best describes your role.',
    guidance: 'You are likely acting as a Provider if your organisation builds an AI system and makes it available to others under your own name or brand.\n\nYou are likely acting as a Deployer if your organisation uses an AI system as part of its activities.\n\nYou may be a Distributor if your organisation does not develop the AI system, but you sell, resell, supply, or otherwise make it available on the EU market.',
    required: true
  },
  {
    id: '1.3',
    category: 'Step 1: Overview of the AI System',
    question: 'What business goals or benefits is your company hoping to achieve with this AI system or use case?',
    guidance: 'Examples High-risk AI Use Case:\n- Improving accuracy in creditworthiness assessments\n- Enhancing decision-making in recruitment\n- Supporting fraud detection\n\nExamples Limited-Risk AI Use Case:\n- Improving customer support through chatbots\n- Personalising recommendations\n- Supporting marketing analysis',
    required: true
  },
  {
    id: '1.4',
    category: 'Step 1: Overview of the AI System',
    question: 'Which individuals or groups could be directly or indirectly affected by the AI system?',
    guidance: 'This can include people who use the system or anyone impacted by its outcomes, such as employees, customers, applicants, vulnerable individuals, or data subjects whose information is used.',
    required: true
  },
  {
    id: '1.5',
    category: 'Step 1: Overview of the AI System',
    question: 'What is the expected timeline for implementing, using, or offering this AI system or project?',
    guidance: 'Please provide an estimated timeline for implementation.',
    required: true
  },

  // Step 2: AI Risk Screening Questions
  {
    id: '2.1',
    category: 'Step 2: AI Risk Screening',
    question: 'Will the AI system be used for any prohibited uses under the EU AI Act?\n\n1- AI systems using subliminal or manipulative techniques\n2- AI systems exploiting vulnerable individuals\n3- AI systems for social scoring\n4- Real-time remote biometric identification in public spaces',
    guidance: 'If Yes: The AI system may fall under a prohibited use. Please contact a lawyer for review.\n\nIf No: We can move forward with the next questions to map your AI system in more detail.',
    required: true
  },
  {
    id: '2.2',
    category: 'Step 2: AI Risk Screening',
    question: 'Does the AI system form part of a product requiring third-party conformity assessment?\n\nExamples include: Medical devices, Toys, Machinery, Motor vehicles, Aviation systems, Electrical safety products',
    guidance: 'If Yes: The AI system is likely classified as high-risk under the EU AI Act. We will continue with high-risk system questions.\n\nIf No: We still need to review the system\'s risk level, purpose, data use, and safeguards.',
    required: true
  },
  {
    id: '2.3',
    category: 'Step 2: AI Risk Screening',
    question: 'Will the AI system involve any of these types of processing?\n\n1- Biometric or sensitive information\n2- Access to education or training\n3- Employment, workforce management\n4- Access to essential services (credit scoring, healthcare)\n5- Law enforcement interactions\n6- Border control or migration management\n7- Safety components of products',
    guidance: 'If Yes: Please confirm whether the system performs narrow procedural tasks or supports human decision-making.\n\nIf No: We will continue with technical questions. Your organisation aims to map all AI systems regardless of their risk level.',
    required: true
  },

  // Step 3: Technical AI Overview
  {
    id: '3.1',
    category: 'Step 3: Technical Overview',
    question: 'What is the intended purpose of the AI system?',
    guidance: 'Please describe what the AI system is meant to do, including the core function, what problem it solves, who it supports, and the type of decisions or outputs it provides.',
    required: true
  },
  {
    id: '3.2',
    category: 'Step 3: Technical Overview',
    question: 'What are the potential unintended uses of the AI system?',
    guidance: 'Consider situations where the system could be used in a different context than designed, accessed by unintended users, repurposed, misinterpreted, or combined with other tools in risky ways.',
    required: true
  },
  {
    id: '3.3',
    category: 'Step 3: Technical Overview',
    question: 'Could you describe the context in which the AI system will be used and the specific use case it supports?',
    guidance: 'Include details about the business area, users, decisions influenced, deployment environment, legal/regulatory requirements, cultural considerations, and relevant languages.',
    required: true
  },
  {
    id: '3.4',
    category: 'Step 3: Technical Overview',
    question: 'Is the AI system you are describing a general-purpose AI model?',
    guidance: 'A general-purpose AI model is one trained on diverse datasets that shows broad generality and can perform many different tasks.',
    required: true
  },
  {
    id: '3.5',
    category: 'Step 3: Technical Overview',
    question: 'What type of AI technology does the system use?',
    guidance: 'Examples: machine learning, deep learning, natural language processing, large language models (LLMs), predictive analytics, rule-based systems, computer vision, recommendation engines.',
    required: true
  },
  {
    id: '3.6',
    category: 'Step 3: Technical Overview',
    question: 'What types of data does the AI system rely on to operate?',
    guidance: 'Include input data types: text, images, audio, video, structured business data, behavioral data, sensor data, metadata.',
    required: true
  },
  {
    id: '3.7',
    category: 'Step 3: Technical Overview',
    question: 'Does the AI system handle any personal data about individuals?',
    guidance: 'Personal data includes names, emails, ID numbers, images, voice recordings, IP addresses, or any information that can be linked to a specific person.',
    required: true
  },
  {
    id: '3.8',
    category: 'Step 3: Technical Overview',
    question: 'Will the AI system influence or support decision-making?',
    guidance: '1. Fully automated decisions\n2. Human-in-the-loop (AI supports human decision-maker)\n3. Human-on-the-loop (AI acts independently but monitored)\n4. No impact on decisions (informational only)\n5. Not sure',
    required: true
  },

  // Step 3.2: Contractual Provisions
  {
    id: '3.9',
    category: 'Step 3: Contractual Provisions',
    question: 'Do you have the right to use the data for training or operating this AI system?',
    guidance: 'Describe any licences, agreements, or permissions that allow data use for AI development.',
    required: true
  },
  {
    id: '3.10',
    category: 'Step 3: Contractual Provisions',
    question: 'Who owns the AI model or technology you are using?',
    guidance: 'Is the model developed internally, provided by a vendor, open-source, or a third-party service/API?',
    required: true
  },
  {
    id: '3.11',
    category: 'Step 3: Contractual Provisions',
    question: 'Are there any licensing or contractual restrictions on using the model or the data?',
    guidance: 'Include restrictions on commercial use, fine-tuning, redistribution, output ownership, or usage limits.',
    required: true
  },

  // Step 4: Risk Identification (High-Risk AI Systems)
  {
    id: '4.1',
    category: 'Step 4: Safety & Reliability Risks',
    question: 'Could the system produce inaccurate, unexpected, or fabricated outputs (e.g., hallucinations)?',
    guidance: 'Consider the likelihood and severity of this risk. Provide details about any known limitations.',
    required: true
  },
  {
    id: '4.2',
    category: 'Step 4: Safety & Reliability Risks',
    question: 'May performance vary across different inputs, contexts, or users?',
    guidance: 'Assess whether the system behaves consistently across different scenarios and user groups.',
    required: true
  },
  {
    id: '4.3',
    category: 'Step 4: Data Quality Risks',
    question: 'May the training or testing data contain inaccuracies, errors, or inconsistencies?',
    guidance: 'Describe data quality processes and any known issues with data accuracy.',
    required: true
  },
  {
    id: '4.4',
    category: 'Step 4: Security Risks',
    question: 'Is the system sensitive to prompt injection or adversarial inputs?',
    guidance: 'Consider vulnerabilities to manipulation, data poisoning, or security attacks.',
    required: true
  },
  {
    id: '4.5',
    category: 'Step 4: Fairness Risks',
    question: 'May the AI not perform consistently across different demographic or cultural groups?',
    guidance: 'Consider potential bias affecting protected characteristics: gender, ethnicity, age, disability, socioeconomic status.',
    required: true
  },

  // Step 5: Risk Mitigation
  {
    id: '5.1',
    category: 'Step 5: Risk Mitigation',
    question: 'What technical measures are implemented to address identified risks?',
    guidance: 'Include encryption, access controls, anonymization, secure development, monitoring, logging, bias testing.',
    required: true
  },
  {
    id: '5.2',
    category: 'Step 5: Risk Mitigation',
    question: 'What organizational measures are implemented to address identified risks?',
    guidance: 'Include policies, training, governance structures, incident response, audits, documentation.',
    required: true
  },
  {
    id: '5.3',
    category: 'Step 5: Risk Mitigation',
    question: 'How is human oversight of the AI system ensured?',
    guidance: 'Describe mechanisms for human intervention, override capabilities, and monitoring of AI decisions.',
    required: true
  },
  {
    id: '5.4',
    category: 'Step 5: Risk Mitigation',
    question: 'How are data subjects informed about the AI processing?',
    guidance: 'Describe transparency measures: privacy notices, AI disclosure, explanation of automated decisions.',
    required: true
  },
  {
    id: '5.5',
    category: 'Step 5: Risk Mitigation',
    question: 'How can data subjects exercise their rights (access, rectification, erasure, etc.)?',
    guidance: 'Detail procedures for handling GDPR rights requests in the context of AI processing.',
    required: true
  },

  // Step 6: Sign Off
  {
    id: '6.1',
    category: 'Step 6: Sign Off',
    question: 'Name and role of the person completing this assessment',
    guidance: 'Please provide your full name and job title.',
    required: true
  },
  {
    id: '6.2',
    category: 'Step 6: Sign Off',
    question: 'Declaration: I confirm that the information provided in this assessment is accurate to the best of my knowledge.',
    guidance: 'Please confirm by typing "I confirm" or selecting Yes.',
    required: true
  }
];
