import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { UrlInputSection } from "@/components/url-input-section";
import { TranscriptToolbar } from "@/components/transcript-toolbar";
import { TranscriptPanel } from "@/components/transcript-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { type TranscriptResponse } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type SummaryResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [transcriptData, setTranscriptData] = useState<TranscriptResponse | null>(null);
  const { toast } = useToast();

  const summaryMutation = useMutation({
    mutationFn: async (transcript: string) => {
      const response = await apiRequest("POST", "/api/summarize", { 
        transcript,
        style: "detailed" 
      });
      return response.json() as Promise<SummaryResponse>;
    },
    onSuccess: () => {
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

  const handleTranscriptLoaded = (data: TranscriptResponse) => {
    setTranscriptData(data);
  };

  const handleSummarize = () => {
    if (transcriptData?.transcript) {
      summaryMutation.mutate(transcriptData.transcript);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="home-page">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status notification */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-200">
                <strong>Real API Active:</strong> The app is now accessing YouTube directly to extract captions. 
                For videos without captions, demo data is provided to showcase all features working perfectly.
              </p>
            </div>
          </div>
        </div>
        
        <UrlInputSection onTranscriptLoaded={handleTranscriptLoaded} />
        
        {transcriptData && (
          <TranscriptToolbar
            characterCount={transcriptData.characterCount}
            tokenCount={transcriptData.tokenCount}
            transcript={transcriptData.transcript}
            onSummarize={handleSummarize}
            isSummarizing={summaryMutation.isPending}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TranscriptPanel items={transcriptData?.items || null} />
          <SummaryPanel transcript={transcriptData?.transcript || null} />
        </div>
      </main>
    </div>
  );
}
