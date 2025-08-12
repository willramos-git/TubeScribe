import { Button } from "@/components/ui/button";
import { Copy, Download, ExternalLink, Sparkles, AlignLeft, Coins } from "lucide-react";
import { copyToClipboard, downloadTextFile, openChatGPT } from "@/lib/youtube";
import { useToast } from "@/hooks/use-toast";

interface TranscriptToolbarProps {
  characterCount: number;
  tokenCount: number;
  transcript: string;
  onSummarize: () => void;
  isSummarizing: boolean;
}

export function TranscriptToolbar({ 
  characterCount, 
  tokenCount, 
  transcript, 
  onSummarize,
  isSummarizing 
}: TranscriptToolbarProps) {
  const { toast } = useToast();

  const handleCopyAll = async () => {
    try {
      await copyToClipboard(transcript);
      toast({
        title: "Copied!",
        description: "Transcript copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transcript",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    try {
      downloadTextFile(transcript, 'youtube-transcript.txt');
      toast({
        title: "Downloaded!",
        description: "Transcript saved as .txt file",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download transcript",
        variant: "destructive",
      });
    }
  };

  const handleOpenChatGPT = async () => {
    try {
      await copyToClipboard(transcript);
      openChatGPT();
      toast({
        title: "Success!",
        description: "Transcript copied! Opening ChatGPT...",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transcript",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6" data-testid="transcript-toolbar">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2" data-testid="character-count">
            <AlignLeft className="h-4 w-4" />
            <span>Characters: <span className="font-mono font-medium text-gray-900">{characterCount.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center space-x-2" data-testid="token-count">
            <Coins className="h-4 w-4" />
            <span>Tokens: <span className="font-mono font-medium text-gray-900">~{tokenCount.toLocaleString()}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyAll}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            data-testid="button-copy-all"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            data-testid="button-download"
          >
            <Download className="h-4 w-4 mr-2" />
            Download .txt
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenChatGPT}
            className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors duration-200"
            data-testid="button-open-chatgpt"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open ChatGPT
          </Button>
          <Button
            onClick={onSummarize}
            disabled={isSummarizing}
            className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:transform-none"
            data-testid="button-summarize"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Summarize
          </Button>
        </div>
      </div>
    </section>
  );
}
