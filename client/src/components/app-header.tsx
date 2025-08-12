import { Video, Github } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-500 p-2 rounded-lg">
              <Video className="text-white text-xl h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="app-title">
                YouTube Transcript Extractor
              </h1>
              <p className="text-sm text-gray-500">
                Extract and summarize video transcripts with AI
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span data-testid="app-version">v1.2.0</span>
            <a 
              href="https://github.com/user/youtube-transcript-extractor" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
              data-testid="github-link"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
