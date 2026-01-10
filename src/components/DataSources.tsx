import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  addDataSource,
  getAllDataSources,
  deleteDataSource,
  extractTextFromFile,
  fileToBase64,
  type DataSource
} from '@/services/dataSourcesDb';
import {
  Link,
  FileUp,
  Trash2,
  ExternalLink,
  FileText,
  CheckSquare,
  Square,
  Plus,
  X,
  Database,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourcesProps {
  selectedSourceIds: string[];
  onSelectionChange: (ids: string[]) => void;
  currentQuestionId?: string;
}

export function DataSources({
  selectedSourceIds,
  onSelectionChange,
  currentQuestionId
}: DataSourcesProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data sources from IndexedDB
  const loadDataSources = useCallback(async () => {
    try {
      const sources = await getAllDataSources();
      setDataSources(sources);
    } catch (err) {
      console.error('Failed to load data sources:', err);
      setError('Failed to load data sources');
    }
  }, []);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const extractedText = await extractTextFromFile(file);
        const base64Content = await fileToBase64(file);

        await addDataSource({
          type: 'file',
          name: file.name,
          content: base64Content,
          extractedText,
          mimeType: file.type,
          size: file.size
        });
      }
      await loadDataSources();
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError('Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle link addition
  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Basic URL validation
      const url = new URL(linkUrl.trim());
      const name = linkName.trim() || url.hostname + url.pathname;

      await addDataSource({
        type: 'link',
        name,
        content: url.toString(),
        extractedText: `Reference Link: ${name}\nURL: ${url.toString()}`
      });

      setLinkUrl('');
      setLinkName('');
      setIsAddingLink(false);
      await loadDataSources();
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Please enter a valid URL');
      } else {
        console.error('Failed to add link:', err);
        setError('Failed to add link');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deletion
  const handleDelete = async (id: string) => {
    try {
      await deleteDataSource(id);
      // Also remove from selection if selected
      if (selectedSourceIds.includes(id)) {
        onSelectionChange(selectedSourceIds.filter(sid => sid !== id));
      }
      await loadDataSources();
    } catch (err) {
      console.error('Failed to delete data source:', err);
      setError('Failed to delete data source');
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    if (selectedSourceIds.includes(id)) {
      onSelectionChange(selectedSourceIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedSourceIds, id]);
    }
  };

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Sources
          </CardTitle>
          {selectedSourceIds.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {selectedSourceIds.length} selected for Q{currentQuestionId}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <input
            type="file"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="data-source-upload"
            disabled={isLoading}
          />
          <label
            htmlFor="data-source-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <FileUp className={cn(
              "h-8 w-8",
              isDragging ? "text-primary" : "text-gray-400"
            )} />
            <div className="text-sm">
              <span className="text-primary font-medium">Upload files</span>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400">
              PDF, Word, Text, or other documents
            </p>
          </label>
        </div>

        {/* Add link section */}
        {isAddingLink ? (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/document"
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Link name (optional)"
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingLink(false);
                  setLinkUrl('');
                  setLinkName('');
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingLink(true)}
            className="w-full gap-2"
          >
            <Link className="h-4 w-4" />
            Add Link
          </Button>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        {/* Data sources list */}
        {dataSources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Available Sources ({dataSources.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {dataSources.map((source) => {
                const isSelected = selectedSourceIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                      isSelected
                        ? "bg-primary/5 border-primary/20"
                        : "bg-white border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <button
                      onClick={() => toggleSelection(source.id)}
                      className="flex-shrink-0 text-primary"
                      title={isSelected ? "Deselect" : "Select for current question"}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                    <div className="flex-shrink-0">
                      {source.type === 'file' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {source.type === 'file'
                          ? formatFileSize(source.size)
                          : source.content}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-destructive rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {dataSources.length === 0 && !isLoading && (
          <div className="text-center text-sm text-gray-500 py-2">
            No data sources added yet.
            <br />
            <span className="text-xs">
              Upload files or add links to provide context to the AI assistant.
            </span>
          </div>
        )}

        {/* Selection hint */}
        {dataSources.length > 0 && selectedSourceIds.length === 0 && (
          <p className="text-xs text-gray-400 text-center">
            Select sources to include them in the AI context for this question
          </p>
        )}
      </CardContent>
    </Card>
  );
}
