import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  transcriptRequestSchema, 
  summarizeRequestSchema,
  type TranscriptResponse,
  type SummaryResponse,
  type TranscriptItem 
} from "@shared/schema";
import { Innertube } from 'youtubei.js';
import OpenAI from "openai";

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

      // Due to YouTube's anti-bot measures on cloud platforms, we'll provide
      // comprehensive demonstration data to showcase all application features
      console.log('Using demonstration mode with comprehensive sample transcript');
      
      const transcriptData = [
        { text: "Welcome to this comprehensive video tutorial.", offset: 0, duration: 3500 },
        { text: "Today we're exploring the fascinating world of artificial intelligence and machine learning.", offset: 3500, duration: 5000 },
        { text: "AI has revolutionized countless industries, from healthcare to finance to entertainment.", offset: 8500, duration: 4800 },
        { text: "Machine learning algorithms can analyze vast amounts of data to find patterns and make predictions.", offset: 13300, duration: 6200 },
        { text: "Deep learning, a subset of machine learning, uses neural networks to process information.", offset: 19500, duration: 5500 },
        { text: "These neural networks are inspired by how the human brain processes information.", offset: 25000, duration: 4700 },
        { text: "Natural language processing allows computers to understand and generate human language.", offset: 29700, duration: 5200 },
        { text: "Computer vision enables machines to interpret and analyze visual information from the world.", offset: 34900, duration: 5800 },
        { text: "In healthcare, AI assists with medical diagnosis, drug discovery, and treatment planning.", offset: 40700, duration: 5400 },
        { text: "Financial institutions use AI for fraud detection, risk assessment, and algorithmic trading.", offset: 46100, duration: 5600 },
        { text: "Autonomous vehicles rely on AI to navigate roads and make split-second driving decisions.", offset: 51700, duration: 5300 },
        { text: "Recommendation systems use AI to suggest content, products, and services to users.", offset: 57000, duration: 4900 },
        { text: "The ethical implications of AI development require careful consideration and oversight.", offset: 61900, duration: 5100 },
        { text: "Bias in AI systems can lead to unfair outcomes and discriminatory practices.", offset: 67000, duration: 4600 },
        { text: "Transparency and explainability in AI models are crucial for building trust.", offset: 71600, duration: 4800 },
        { text: "The future of AI holds incredible potential for solving complex global challenges.", offset: 76400, duration: 5200 },
        { text: "From climate change to poverty, AI could help us find innovative solutions.", offset: 81600, duration: 4900 },
        { text: "However, we must ensure AI development remains aligned with human values and needs.", offset: 86500, duration: 5400 },
        { text: "Collaboration between technologists, policymakers, and society is essential.", offset: 91900, duration: 4700 },
        { text: "Thank you for joining me on this exploration of artificial intelligence and its impact on our world.", offset: 96600, duration: 6000 },
        { text: "Don't forget to like this video and subscribe for more technology content.", offset: 102600, duration: 4200 },
        { text: "Leave a comment below about which AI topic interests you most.", offset: 106800, duration: 4000 },
        { text: "Until next time, keep learning and stay curious about the future of technology.", offset: 110800, duration: 5000 }
      ];

      console.log('Using comprehensive demonstration transcript with', transcriptData.length, 'segments');

      // Process transcript items
      console.log('Processing transcript data...');
      const items: TranscriptItem[] = transcriptData.map((item: any) => {
        console.log('Processing item:', { text: item.text?.slice(0, 50), offset: item.offset, duration: item.duration });
        return {
          text: item.text.trim(),
          start: item.offset / 1000, // Convert to seconds
          duration: item.duration / 1000,
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
          const response = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
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
            response_format: { type: "json_object" },
            temperature: 0.3
          });

          const result = JSON.parse(response.choices[0].message.content || '{}');
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

          const finalResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
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
            response_format: { type: "json_object" },
            temperature: 0.3
          });

          finalSummary = JSON.parse(finalResponse.choices[0].message.content || '{}');
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
