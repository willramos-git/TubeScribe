import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Loader2, Info, AlertTriangle } from "lucide-react";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { apiRequest } from "@/lib/queryClient";
import { type TranscriptResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface UrlInputSectionProps {
  onTranscriptLoaded: (data: TranscriptResponse) => void;
}

export function UrlInputSection({ onTranscriptLoaded }: UrlInputSectionProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const transcriptMutation = useMutation({
    mutationFn: async (youtubeUrl: string) => {
      const response = await apiRequest("POST", "/api/transcript", { url: youtubeUrl });
      return response.json() as Promise<TranscriptResponse>;
    },
    onSuccess: (data) => {
      setError(null);
      onTranscriptLoaded(data);
      toast({
        title: "Success!",
        description: "Transcript extracted successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setError(null);
    transcriptMutation.mutate(url);
  };

  const isUrlInvalid = url.length > 0 && !isValidYouTubeUrl(url);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8" data-testid="url-input-section">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </Label>
          <Input
            type="url"
            id="youtube-url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
              isUrlInvalid ? 'border-red-300' : 'border-gray-300'
            }`}
            data-testid="input-youtube-url"
          />
          <p className="mt-2 text-xs text-gray-500 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            Supports youtube.com and youtu.be links
          </p>
        </div>
        <div className="sm:self-end">
          <Button
            type="submit"
            disabled={transcriptMutation.isPending || !url.trim() || isUrlInvalid}
            className="w-full sm:w-auto px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none pl-[25px] pr-[25px] mt-[24px] mb-[24px]"
            data-testid="button-get-transcript"
          >
            {transcriptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Get Transcript
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Loading State */}
      {transcriptMutation.isPending && (
        <Alert className="mt-4 bg-blue-50 border-blue-200" data-testid="loading-state">
          <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          <AlertDescription>
            <div>
              <p className="text-sm font-medium text-blue-900">Extracting transcript...</p>
              <p className="text-xs text-blue-700">This may take a few seconds</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert className="mt-4 bg-red-50 border-red-200" variant="destructive" data-testid="error-state">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="text-sm font-medium text-red-900">Unable to extract transcript</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
