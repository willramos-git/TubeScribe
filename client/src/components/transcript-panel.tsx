import { FileText, Video } from "lucide-react";
import { type TranscriptItem } from "@shared/schema";

interface TranscriptPanelProps {
  items: TranscriptItem[] | null;
  isLoading?: boolean;
}

export function TranscriptPanel({ items, isLoading }: TranscriptPanelProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-testid="transcript-panel">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Transcript
        </h2>
      </div>
      <div className="p-6">
        {!items && !isLoading && (
          <div className="text-center py-12" data-testid="transcript-empty-state">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transcript loaded</h3>
            <p className="text-sm text-gray-500">Enter a YouTube URL above to extract the transcript</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12" data-testid="transcript-loading-state">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-full flex items-center justify-center">
              <Video className="h-8 w-8 text-primary-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading transcript...</h3>
            <p className="text-sm text-gray-500">Please wait while we extract the transcript</p>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" data-testid="transcript-content">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start space-x-3 mb-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`transcript-item-${index}`}
              >
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded">
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed select-text">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <div className="text-center py-12" data-testid="transcript-no-items">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transcript items found</h3>
            <p className="text-sm text-gray-500">This video may not have captions available</p>
          </div>
        )}
      </div>
    </section>
  );
}
