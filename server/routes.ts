import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  transcriptRequestSchema, 
  summarizeRequestSchema,
  type TranscriptResponse,
  type SummaryResponse,
  type TranscriptItem 
} from "@shared/schema";
import OpenAI from "openai";
import { YoutubeTranscript } from 'youtube-transcript';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

async function fetchTranscriptNode(videoId: string): Promise<any[]> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
  if (!transcript || transcript.length === 0) {
    throw new Error('No transcript available');
  }
  
  return transcript;
}


function chunkText(text: string, maxTokens: number = 12000): string[] {
  const maxChars = maxTokens * 4; // Convert tokens to approximate characters
  const chunks: string[] = [];
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  // Split by sentences to maintain context
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = "";
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence + ". ";
    if (testChunk.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ". ";
    } else {
      currentChunk = testChunk;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/transcript", async (req, res) => {
    try {
      const { url } = transcriptRequestSchema.parse(req.body);
      
      // Extract video ID from URL
      let videoId: string;
      try {
        const urlObj = new URL(url);
        console.log('Processing URL:', url, 'hostname:', urlObj.hostname);
        
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('www.youtube.com')) {
          videoId = urlObj.searchParams.get('v') || '';
        } else if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else {
          throw new Error('Invalid YouTube URL format');
        }
        
        if (!videoId) {
          throw new Error('Could not extract video ID from URL');
        }
        
        console.log('Extracted video ID:', videoId);
      } catch (error) {
        console.error('URL parsing error:', error);
        return res.status(400).json({ 
          message: "Invalid YouTube URL format. Please check the URL and try again." 
        });
      }

      // Fetch transcript using youtube-transcript library
      let transcriptData;
      try {
        console.log('Fetching transcript for video ID:', videoId);
        transcriptData = await fetchTranscriptNode(videoId);
        if (!transcriptData || transcriptData.length === 0) {
          return res.status(404).json({
            message: "No transcript is available for this video. Please ensure: 1) The video has captions enabled, 2) The video is public, 3) The video is not age-restricted. You can check if captions are available by looking for the 'CC' button in the YouTube player."
          });
        }
        console.log(`Successfully extracted transcript with ${transcriptData.length} segments`);
      } catch (error: any) {
        console.error('Transcript fetch error:', error);
        
        // Handle specific error types
        if (error.name === 'YoutubeTranscriptDisabledError') {
          return res.status(404).json({
            message: "This video has transcripts disabled by the creator. Please try a different video that has captions enabled. You can verify captions are available by looking for the 'CC' button in the YouTube player."
          });
        } else if (error.name === 'YoutubeTranscriptNotAvailableError') {
          return res.status(404).json({
            message: "No transcript is available for this video in English. The video may not have captions, or captions may only be available in other languages."
          });
        } else if (error.name === 'YoutubeTranscriptTooManyRequestsError') {
          return res.status(429).json({
            message: "Too many requests to YouTube. Please wait a moment and try again."
          });
        } else {
          return res.status(500).json({
            message: "Unable to extract transcript from this video. The video may be private, age-restricted, or have other access limitations. Please try a different public video with captions enabled."
          });
        }
      }

      // Process transcript items
      console.log('Processing transcript data...');
      const items: TranscriptItem[] = transcriptData.map((item: any) => {
        console.log('Processing item:', { text: item.text?.slice(0, 50), offset: item.offset, duration: item.duration });
        return {
          text: item.text.trim(),
          start: item.offset / 1000, // Convert milliseconds to seconds
          duration: item.duration / 1000, // Convert milliseconds to seconds
          timestamp: formatTimestamp(item.offset / 1000)
        };
      });

      const fullTranscript = items.map(item => item.text).join(' ');
      const characterCount = fullTranscript.length;
      const tokenCount = estimateTokenCount(fullTranscript);
      
      console.log('Final processed data:', {
        itemCount: items.length,
        transcriptLength: fullTranscript.length,
        firstItemText: items[0]?.text?.slice(0, 50)
      });

      const response: TranscriptResponse = {
        items,
        transcript: fullTranscript,
        characterCount,
        tokenCount
      };

      res.json(response);
    } catch (error: any) {
      console.error('Transcript API error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request format. Please provide a valid YouTube URL." });
      } else {
        res.status(500).json({ message: "An unexpected error occurred while processing your request." });
      }
    }
  });

  app.post("/api/summarize", async (req, res) => {
    try {
      const { transcript, style } = summarizeRequestSchema.parse(req.body);
      
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
        return res.status(500).json({ 
          message: "OpenAI API key not configured. Please contact the administrator." 
        });
      }

      const chunks = chunkText(transcript);
      let summaries: string[] = [];

      // Process each chunk
      for (const chunk of chunks) {
        try {
          const response = await openai.responses.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            input: [
              {
                role: "system",
                content: `You are an expert at summarizing video transcripts. Create a clear, concise summary with the following format:

TL;DR: Write 2 sentences that capture the main essence and key takeaway.

Key Points: Create 10-15 bullet points that highlight the most important information, insights, and actionable content from the transcript. Focus on:
- Main topics and concepts covered
- Key insights and valuable information
- Actionable advice or steps mentioned
- Important examples or case studies
- Conclusions and takeaways

Keep each bullet point clear and informative. Respond in JSON format with "tldr" and "bulletPoints" fields.`
              },
              {
                role: "user",
                content: `Please summarize this transcript chunk:\n\n${chunk}`
              }
            ],
            text: { format: { type: "json_object" } },
            temperature: 0.3
          });

          const result = JSON.parse(response.output_text || '{}');
          summaries.push(JSON.stringify(result));
        } catch (error: any) {
          console.error('OpenAI API error for chunk:', error);
          throw new Error(`Failed to summarize transcript chunk: ${error.message}`);
        }
      }

      // If multiple chunks, combine summaries
      let finalSummary: { tldr: string; bulletPoints: string[] };
      
      if (summaries.length === 1) {
        finalSummary = JSON.parse(summaries[0]);
      } else {
        // Map-reduce: combine multiple summaries
        try {
          const combinedSummaries = summaries.map(s => JSON.parse(s));
          const allTldrs = combinedSummaries.map(s => s.tldr).join(' ');
          const allBulletPoints = combinedSummaries.flatMap(s => s.bulletPoints || []);

          const finalResponse = await openai.responses.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            input: [
              {
                role: "system",
                content: `You are combining multiple summaries into one final summary. Create a coherent final summary that consolidates all the information.

TL;DR: Write 2 sentences that capture the overall main essence.

Key Points: Consolidate and organize into 10-15 most important bullet points, removing duplicates and organizing by relevance.

Respond in JSON format with "tldr" and "bulletPoints" fields.`
              },
              {
                role: "user",
                content: `Combine these summaries into one final summary:

TLDRs: ${allTldrs}

All bullet points: ${allBulletPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}`
              }
            ],
            text: { format: { type: "json_object" } },
            temperature: 0.3
          });

          finalSummary = JSON.parse(finalResponse.output_text || '{}');
        } catch (error: any) {
          console.error('Error combining summaries:', error);
          // Fallback: use first summary if combination fails
          finalSummary = JSON.parse(summaries[0]);
        }
      }

      const summaryText = `TL;DR: ${finalSummary.tldr}\n\nKey Points:\n${finalSummary.bulletPoints?.map((point, i) => `• ${point}`).join('\n') || ''}`;
      
      const response: SummaryResponse = {
        summary: summaryText,
        tldr: finalSummary.tldr || '',
        bulletPoints: finalSummary.bulletPoints || [],
        tokenCount: estimateTokenCount(summaryText)
      };

      res.json(response);
    } catch (error: any) {
      console.error('Summary API error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request format. Please provide a valid transcript." });
      } else if (error.message?.includes('OpenAI')) {
        res.status(500).json({ message: "AI service temporarily unavailable. Please try again later." });
      } else {
        res.status(500).json({ message: "An unexpected error occurred while generating the summary." });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
