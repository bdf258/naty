import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LLMAssistant } from './LLMAssistant';
import { DataSources } from './DataSources';
import { parseExcelFile, generateSampleExcel, DEMO_DPIA_QUESTIONS } from '@/services/excelParser';
import type { DPIAQuestion, DataSourceContext } from '@/services/geminiService';
import { getAllDataSources, type DataSource } from '@/services/dataSourcesDb';
import {
  Upload,
  FileSpreadsheet,
  Download,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DPIAAssessmentFormProps {
  onBack?: () => void;
  triageResult?: 'high-risk' | 'technical';
}

type ViewMode = 'upload' | 'assessment' | 'review';

export function DPIAAssessmentForm({ onBack, triageResult }: DPIAAssessmentFormProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [questions, setQuestions] = useState<DPIAQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  // Data sources: track selected sources per question
  const [selectedSourcesByQuestion, setSelectedSourcesByQuestion] = useState<Record<string, string[]>>({});
  const [allDataSources, setAllDataSources] = useState<DataSource[]>([]);

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    const grouped: Record<string, DPIAQuestion[]> = {};
    questions.forEach(q => {
      if (!grouped[q.category]) {
        grouped[q.category] = [];
      }
      grouped[q.category].push(q);
    });
    return grouped;
  }, [questions]);

  const categories = useMemo(() => Object.keys(questionsByCategory), [questionsByCategory]);

  const currentQuestion = questions[currentQuestionIndex];

  // Load all data sources for reference
  const loadAllDataSources = useCallback(async () => {
    try {
      const sources = await getAllDataSources();
      setAllDataSources(sources);
    } catch (err) {
      console.error('Failed to load data sources:', err);
    }
  }, []);

  useEffect(() => {
    loadAllDataSources();
  }, [loadAllDataSources]);

  // Get selected data sources for the current question as context for LLM
  const selectedDataSourcesForLLM = useMemo((): DataSourceContext[] => {
    if (!currentQuestion) return [];
    const selectedIds = selectedSourcesByQuestion[currentQuestion.id] || [];
    return allDataSources
      .filter(ds => selectedIds.includes(ds.id))
      .map(ds => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        content: ds.extractedText || ds.content
      }));
  }, [currentQuestion, selectedSourcesByQuestion, allDataSources]);

  // Handle selection change for current question
  const handleDataSourceSelectionChange = useCallback((ids: string[]) => {
    if (!currentQuestion) return;
    setSelectedSourcesByQuestion(prev => ({
      ...prev,
      [currentQuestion.id]: ids
    }));
  }, [currentQuestion]);

  const progress = useMemo(() => {
    const answered = Object.keys(answers).filter(id => answers[id]?.trim()).length;
    const required = questions.filter(q => q.required).length;
    const requiredAnswered = questions.filter(q => q.required && answers[q.id]?.trim()).length;
    return {
      total: questions.length,
      answered,
      required,
      requiredAnswered,
      percentage: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0
    };
  }, [questions, answers]);

  // File handling
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadWarnings([]);

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const result = await parseExcelFile(file);

    if (!result.success) {
      setUploadError(result.errors.join('. '));
      return;
    }

    if (result.warnings.length > 0) {
      setUploadWarnings(result.warnings);
    }

    setQuestions(result.questions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setViewMode('assessment');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const downloadTemplate = () => {
    const blob = generateSampleExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DPIA_Questions_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const useDemoQuestions = () => {
    setQuestions(DEMO_DPIA_QUESTIONS);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setViewMode('assessment');
  };

  // Navigation
  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    if (viewMode === 'review') {
      setViewMode('assessment');
    }
  };

  // Answer handling
  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleInsertText = (text: string) => {
    if (currentQuestion) {
      const currentAnswer = answers[currentQuestion.id] || '';
      const newAnswer = currentAnswer ? `${currentAnswer}\n\n${text}` : text;
      updateAnswer(currentQuestion.id, newAnswer);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Export answers
  const exportAnswers = () => {
    const data = questions.map(q => ({
      id: q.id,
      category: q.category,
      question: q.question,
      answer: answers[q.id] || '',
      required: q.required
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DPIA_Assessment_Responses.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload View
  if (viewMode === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileSpreadsheet className="h-7 w-7 text-primary" />
                  Data Protection Impact Assessment
                </CardTitle>
                <CardDescription className="mt-2">
                  Upload your DPIA questionnaire or use our template to get started
                </CardDescription>
              </div>
              {onBack && (
                <Button variant="outline" onClick={onBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Triage
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {triageResult && (
              <div className={cn(
                "p-4 rounded-lg border-2 flex items-start gap-3",
                triageResult === 'high-risk'
                  ? "bg-orange-50 border-orange-200"
                  : "bg-blue-50 border-blue-200"
              )}>
                {triageResult === 'high-risk' ? (
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={cn(
                    "font-medium",
                    triageResult === 'high-risk' ? "text-orange-900" : "text-blue-900"
                  )}>
                    {triageResult === 'high-risk'
                      ? "High-Risk AI System - Full DPIA Required"
                      : "Technical Assessment - Comprehensive Documentation Recommended"
                    }
                  </p>
                  <p className={cn(
                    "text-sm mt-1",
                    triageResult === 'high-risk' ? "text-orange-800" : "text-blue-800"
                  )}>
                    {triageResult === 'high-risk'
                      ? "Based on your triage responses, a comprehensive DPIA is required for this AI system."
                      : "While not classified as high-risk, thorough documentation is recommended for compliance."
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-gray-400"
              )}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload DPIA Questions
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop an Excel file here, or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Choose Excel File
                  </span>
                </Button>
              </label>
            </div>

            {uploadError && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Upload Error</p>
                  <p className="text-sm mt-1">{uploadError}</p>
                </div>
              </div>
            )}

            {uploadWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="font-medium text-yellow-900 mb-2">Warnings</p>
                <ul className="text-sm text-yellow-800 list-disc list-inside">
                  {uploadWarnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={downloadTemplate}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Download Template</h4>
                    <p className="text-sm text-gray-600">Get a sample Excel template</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={useDemoQuestions}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Use Demo Questions</h4>
                    <p className="text-sm text-gray-600">Start with sample DPIA questions</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review View
  if (viewMode === 'review') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Review Your Responses</CardTitle>
                <CardDescription>
                  {progress.answered} of {progress.total} questions answered
                  ({progress.requiredAnswered} of {progress.required} required)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewMode('assessment')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Continue Editing
                </Button>
                <Button onClick={exportAnswers} className="gap-2">
                  <Save className="h-4 w-4" /> Export Responses
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {categories.map(category => (
              <div key={category} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{category}</span>
                    <span className="text-sm text-gray-500">
                      {questionsByCategory[category].filter(q => answers[q.id]?.trim()).length} / {questionsByCategory[category].length} answered
                    </span>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedCategories.has(category) && (
                  <div className="divide-y">
                    {questionsByCategory[category].map((question) => (
                      <div key={question.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-500">{question.id}</span>
                              {question.required && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                              )}
                              {!answers[question.id]?.trim() && question.required && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <p className="text-gray-900 mb-2">{question.question}</p>
                            <div className="bg-gray-50 rounded-lg p-3 mt-2">
                              {answers[question.id]?.trim() ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{answers[question.id]}</p>
                              ) : (
                                <p className="text-sm text-gray-400 italic">No response provided</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => goToQuestion(questions.findIndex(q => q.id === question.id))}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Assessment View
  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress.percentage}% Complete
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Question navigation sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Card className="sticky top-6">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Questions</CardTitle>
            </CardHeader>
            <CardContent className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {categories.map(category => (
                <div key={category} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded"
                  >
                    <span>{category}</span>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="ml-2 space-y-1 mt-1">
                      {questionsByCategory[category].map(q => {
                        const qIndex = questions.findIndex(question => question.id === q.id);
                        const isAnswered = !!answers[q.id]?.trim();
                        const isCurrent = qIndex === currentQuestionIndex;
                        return (
                          <button
                            key={q.id}
                            onClick={() => goToQuestion(qIndex)}
                            className={cn(
                              "w-full text-left px-2 py-1 text-xs rounded flex items-center gap-2 transition-colors",
                              isCurrent
                                ? "bg-primary text-primary-foreground"
                                : isAnswered
                                ? "text-gray-700 hover:bg-gray-100"
                                : "text-gray-400 hover:bg-gray-100"
                            )}
                          >
                            <span className={cn(
                              "h-4 w-4 rounded-full flex items-center justify-center text-[10px]",
                              isCurrent
                                ? "bg-primary-foreground/20"
                                : isAnswered
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100"
                            )}>
                              {isAnswered ? <CheckCircle2 className="h-3 w-3" /> : q.id.split('.')[1] || qIndex + 1}
                            </span>
                            <span className="truncate">{q.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main question area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-primary">{currentQuestion?.category}</span>
                    {currentQuestion?.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{currentQuestion?.id}. {currentQuestion?.question}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                    className={cn(isAssistantOpen && "bg-primary/10")}
                    title="Toggle AI Assistant"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {currentQuestion?.guidance && (
                <CardDescription className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
                  <strong>Guidance:</strong> {currentQuestion.guidance}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={answers[currentQuestion?.id] || ''}
                onChange={(e) => currentQuestion && updateAnswer(currentQuestion.id, e.target.value)}
                placeholder="Enter your response here..."
                className="w-full min-h-[200px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />

              {currentQuestion?.exampleResponse && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Example Response Format:</p>
                  <p className="text-sm text-gray-700">{currentQuestion.exampleResponse}</p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewMode('upload')}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" /> Start Over
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Button>
                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button onClick={() => setViewMode('review')} className="gap-2">
                      Review All <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={goToNext} className="gap-2">
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sources Card */}
          <div className="mt-4">
            <DataSources
              selectedSourceIds={selectedSourcesByQuestion[currentQuestion?.id] || []}
              onSelectionChange={handleDataSourceSelectionChange}
              currentQuestionId={currentQuestion?.id}
            />
          </div>
        </div>

        {/* LLM Assistant panel */}
        {isAssistantOpen && currentQuestion && (
          <div className="hidden xl:block w-96 flex-shrink-0">
            <div className="fixed top-0 right-0 h-screen w-96">
              <LLMAssistant
                currentQuestion={currentQuestion}
                previousAnswers={answers}
                currentAnswer={answers[currentQuestion.id] || ''}
                onInsertText={handleInsertText}
                isOpen={isAssistantOpen}
                onToggle={() => setIsAssistantOpen(false)}
                dataSources={selectedDataSourcesForLLM}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile assistant toggle */}
      {!isAssistantOpen && currentQuestion && (
        <div className="xl:hidden fixed bottom-6 right-6">
          <Button
            onClick={() => setIsAssistantOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg"
            size="icon"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Mobile assistant overlay */}
      {isAssistantOpen && currentQuestion && (
        <div className="xl:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background shadow-xl">
            <LLMAssistant
              currentQuestion={currentQuestion}
              previousAnswers={answers}
              currentAnswer={answers[currentQuestion.id] || ''}
              onInsertText={handleInsertText}
              isOpen={isAssistantOpen}
              onToggle={() => setIsAssistantOpen(false)}
              dataSources={selectedDataSourcesForLLM}
            />
          </div>
        </div>
      )}
    </div>
  );
}
