import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Copy, Zap, List, Loader2 } from "lucide-react";
import { copyToClipboard } from "@/lib/youtube";
import { apiRequest } from "@/lib/queryClient";
import { type SummaryResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SummaryPanelProps {
  transcript: string | null;
  summary: SummaryResponse | null;
  onSummaryGenerated: (summary: SummaryResponse) => void;
  isGenerating: boolean;
}

export function SummaryPanel({ transcript, summary, onSummaryGenerated, isGenerating }: SummaryPanelProps) {
  const { toast } = useToast();

  const summaryMutation = useMutation({
    mutationFn: async (transcriptText: string) => {
      const response = await apiRequest("POST", "/api/summarize", { 
        transcript: transcriptText,
        style: "detailed" 
      });
      return response.json() as Promise<SummaryResponse>;
    },
    onSuccess: (data) => {
      onSummaryGenerated(data);
      toast({
        title: "Summary Generated!",
        description: "AI summary has been created successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to generate summary";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSummarize = () => {
    if (!transcript) return;
    summaryMutation.mutate(transcript);
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    
    try {
      const formattedSummary = `TL;DR: ${summary.tldr}\n\nKey Points:\n${summary.bulletPoints.map(point => `• ${point}`).join('\n')}`;
      await copyToClipboard(formattedSummary);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard with formatting",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy summary",
        variant: "destructive",
      });
    }
  };

  const isLoading = isGenerating || summaryMutation.isPending;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-testid="summary-panel">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary-500" />
          AI Summary
        </h2>
      </div>
      <div className="p-6">
        {!summary && !isLoading && (
          <div className="text-center py-12" data-testid="summary-empty-state">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No summary generated</h3>
            <p className="text-sm text-gray-500 mb-4">Click "Summarize" to generate an AI-powered summary</p>
            {transcript && (
              <Button
                onClick={handleSummarize}
                className="bg-primary-500 hover:bg-primary-600 text-white"
                data-testid="button-generate-summary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12" data-testid="summary-loading-state">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating summary...</h3>
            <p className="text-sm text-gray-500">AI is analyzing the transcript</p>
          </div>
        )}

        {summary && (
          <div data-testid="summary-content">
            {/* TL;DR Section */}
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h3 className="text-sm font-semibold text-primary-900 uppercase tracking-wide mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                TL;DR
              </h3>
              <p className="text-sm text-primary-800 leading-relaxed" data-testid="summary-tldr">
                {summary.tldr}
              </p>
            </div>

            {/* Key Points */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center">
                <List className="h-4 w-4 mr-2" />
                Key Points
              </h3>
              <ul className="space-y-3" data-testid="summary-bullet-points">
                {summary.bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3" data-testid={`bullet-point-${index}`}>
                    <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Copy Summary Button */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={handleCopySummary}
                variant="secondary"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                data-testid="button-copy-summary"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
