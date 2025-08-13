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
      // Scroll to the AI Summary section
      const summarySection = document.querySelector('[data-testid="summary-panel"]');
      if (summarySection) {
        summarySection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
      
      // Generate the summary
      summaryMutation.mutate(transcriptData.transcript);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="home-page">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
