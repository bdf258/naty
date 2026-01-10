import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  sendMessage,
  getQuickHelpSuggestions,
  generateDraftResponse,
  type Message,
  type DPIAQuestion,
  type ChatContext
} from '@/services/geminiService';
import {
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LLMAssistantProps {
  currentQuestion: DPIAQuestion;
  previousAnswers: Record<string, string>;
  currentAnswer: string;
  onInsertText?: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function LLMAssistant({
  currentQuestion,
  previousAnswers,
  currentAnswer,
  onInsertText,
  isOpen,
  onToggle
}: LLMAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickHelp, setShowQuickHelp] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickHelpSuggestions = getQuickHelpSuggestions(currentQuestion);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Reset chat when question changes
  useEffect(() => {
    setMessages([]);
    setShowQuickHelp(true);
    setError(null);
  }, [currentQuestion.id]);

  const getContext = (): ChatContext => ({
    currentQuestion,
    previousAnswers,
    organizationContext: currentAnswer ? `Current draft answer: "${currentAnswer}"` : undefined
  });

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setShowQuickHelp(false);

    try {
      const response = await sendMessage([...messages, userMessage], getContext());
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const draft = await generateDraftResponse(
        currentQuestion,
        getContext(),
        currentAnswer || undefined
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: `Here's a draft response for this question:\n\n---\n\n${draft}\n\n---\n\nFeel free to modify this draft to better reflect your specific situation. Would you like me to help refine any part of it?`
      };
      setMessages(prev => [...prev, assistantMessage]);
      setShowQuickHelp(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const extractCodeBlock = (text: string): string | null => {
    // Look for content between --- markers or in code blocks
    const codeBlockMatch = text.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```/g, '').trim();
    }

    const draftMatch = text.match(/---\n([\s\S]*?)\n---/);
    if (draftMatch) {
      return draftMatch[1].trim();
    }

    return null;
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="h-full flex flex-col border-l-4 border-l-primary">
      <CardHeader className="flex-shrink-0 py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Assistant</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Get help answering DPIA questions
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick help suggestions */}
          {showQuickHelp && messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                <span>Quick help for this question:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickHelpSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-left text-sm px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGenerateDraft}
                  disabled={isLoading}
                >
                  <FileText className="h-4 w-4" />
                  Generate Draft Response
                </Button>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[90%] rounded-lg px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                {/* Insert text button for assistant messages */}
                {message.role === 'assistant' && onInsertText && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    {extractCodeBlock(message.content) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const extracted = extractCodeBlock(message.content);
                          if (extracted) onInsertText(extracted);
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        Insert Draft
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => onInsertText(message.content)}
                      >
                        <FileText className="h-3 w-3" />
                        Use This Response
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setError(null)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Collapsible context panel */}
        <div className="border-t">
          <button
            onClick={() => setShowQuickHelp(!showQuickHelp)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50"
          >
            <span>Current Question Context</span>
            {showQuickHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showQuickHelp && (
            <div className="px-4 pb-2 text-xs text-muted-foreground bg-muted/30">
              <p className="font-medium text-foreground">{currentQuestion.category}</p>
              <p className="line-clamp-2 mt-1">{currentQuestion.question}</p>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for help with this question..."
              className="flex-1 min-h-[60px] max-h-[120px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-[60px] w-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
