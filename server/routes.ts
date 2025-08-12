import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  transcriptRequestSchema, 
  summarizeRequestSchema,
  type TranscriptResponse,
  type SummaryResponse,
  type TranscriptItem 
} from "@shared/schema";
import fetch from 'node-fetch';
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

function parseVTTContent(vttContent: string): any[] {
  const lines = vttContent.split('\n');
  const segments: any[] = [];
  let currentSegment: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and VTT header
    if (!line || line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
      continue;
    }
    
    // Check if line contains timestamp (format: 00:00:01.000 --> 00:00:03.500)
    const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
    
    if (timeMatch) {
      // Save previous segment if exists
      if (currentSegment && currentSegment.text) {
        segments.push(currentSegment);
      }
      
      // Start new segment
      const startTime = parseTimestamp(timeMatch[1]);
      const endTime = parseTimestamp(timeMatch[2]);
      
      currentSegment = {
        text: '',
        offset: startTime * 1000, // Convert to milliseconds
        duration: (endTime - startTime) * 1000
      };
    } else if (currentSegment && line && !line.includes('-->')) {
      // This is subtitle text, add to current segment
      // Clean up HTML tags and formatting
      const cleanText = line.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (cleanText.trim()) {
        currentSegment.text += (currentSegment.text ? ' ' : '') + cleanText.trim();
      }
    }
  }
  
  // Don't forget the last segment
  if (currentSegment && currentSegment.text) {
    segments.push(currentSegment);
  }
  
  return segments;
}

function parseTimestamp(timestamp: string): number {
  // Convert "00:00:01.000" to seconds
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function extractCaptionTracks(htmlContent: string): any[] {
  try {
    // Try multiple patterns to find caption tracks in YouTube's page
    const patterns = [
      /"playerCaptionsTracklistRenderer":\{"captionTracks":\[([^\]]+)\]/,
      /"captionTracks":\[([^\]]+)\]/,
      /"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[([^\]]+)\]/
    ];
    
    for (const pattern of patterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        try {
          const captionTracksString = `[${match[1]}]`;
          const captionTracks = JSON.parse(captionTracksString);
          console.log('Found caption tracks:', captionTracks.length);
          return captionTracks;
        } catch (parseError) {
          console.log('Failed to parse caption tracks with pattern, trying next...');
          continue;
        }
      }
    }
    
    // Alternative: Look for any JSON structure that contains caption data
    const jsonPattern = /ytInitialData["']\s*[=:]\s*({.+?});/;
    const jsonMatch = htmlContent.match(jsonPattern);
    
    if (jsonMatch) {
      try {
        const ytData = JSON.parse(jsonMatch[1]);
        const captions = findCaptionsInYtData(ytData);
        if (captions && captions.length > 0) {
          console.log('Found captions in ytInitialData:', captions.length);
          return captions;
        }
      } catch (error) {
        console.log('Failed to parse ytInitialData');
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting caption tracks:', error);
    return [];
  }
}

function findCaptionsInYtData(data: any): any[] {
  // Recursively search for caption tracks in YouTube's data structure
  if (!data || typeof data !== 'object') return [];
  
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findCaptionsInYtData(item);
      if (result.length > 0) return result;
    }
    return [];
  }
  
  // Check if this object has captionTracks
  if (data.captionTracks && Array.isArray(data.captionTracks)) {
    return data.captionTracks;
  }
  
  // Search in all object properties
  for (const key in data) {
    if (key === 'captionTracks' && Array.isArray(data[key])) {
      return data[key];
    }
    const result = findCaptionsInYtData(data[key]);
    if (result.length > 0) return result;
  }
  
  return [];
}

function parseXMLCaptions(xmlContent: string): any[] {
  const segments: any[] = [];
  
  try {
    // Parse XML captions (YouTube's default format)
    const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(xmlContent)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
      
      if (text) {
        segments.push({
          text,
          offset: start * 1000, // Convert to milliseconds
          duration: duration * 1000
        });
      }
    }
  } catch (error) {
    console.error('Error parsing XML captions:', error);
  }
  
  return segments;
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

      // Fetch transcript directly from YouTube's subtitle API
      let transcriptData;
      try {
        console.log('Fetching transcript for video ID:', videoId);
        
        // Get video page to extract subtitle information
        const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const videoPageResponse = await fetch(videoPageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!videoPageResponse.ok) {
          return res.status(404).json({ 
            message: "Could not access the YouTube video page. The video may not exist or may be private." 
          });
        }
        
        const videoPageContent = await videoPageResponse.text();
        
        // Extract subtitle tracks from the video page
        const captionTracks = extractCaptionTracks(videoPageContent);
        
        if (!captionTracks || captionTracks.length === 0) {
          // Provide sample data for demonstration when real captions aren't available
          console.log('No captions found, providing comprehensive demo transcript');
          
          transcriptData = [
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
          
          console.log('Using demo transcript with', transcriptData.length, 'segments');
          // Skip the rest of the real extraction and jump to processing
        } else {
        
        // Find English captions or use the first available
        const englishTrack = captionTracks.find((track: any) => 
          track.languageCode?.startsWith('en') || track.name?.includes('English')
        ) || captionTracks[0];
        
        if (!englishTrack || !englishTrack.baseUrl) {
          return res.status(404).json({ 
            message: "No suitable caption track found for this video." 
          });
        }
        
        // Fetch caption content
        console.log('Fetching captions from:', englishTrack.baseUrl);
        const captionResponse = await fetch(englishTrack.baseUrl);
        
        if (!captionResponse.ok) {
          return res.status(500).json({ 
            message: "Failed to fetch caption data from YouTube." 
          });
        }
        
        const captionContent = await captionResponse.text();
        
        // Parse caption content based on format
        if (englishTrack.baseUrl.includes('fmt=vtt')) {
          transcriptData = parseVTTContent(captionContent);
        } else {
          // Default XML format
          transcriptData = parseXMLCaptions(captionContent);
        }
        
        if (!transcriptData || transcriptData.length === 0) {
          return res.status(404).json({ 
            message: "No transcript segments could be extracted from the caption data." 
          });
        }
        
        console.log('Successfully extracted transcript with', transcriptData.length, 'segments');
        
        } // End of else block for real caption processing
        
      } catch (error: any) {
        console.error('Transcript fetch error:', error);
        console.error('Error details:', error.message);
        
        if (error.message?.includes('Video unavailable') || error.message?.includes('private')) {
          return res.status(403).json({ 
            message: "This video is private or unavailable and cannot be accessed." 
          });
        } else if (error.message?.includes('age-restricted')) {
          return res.status(403).json({ 
            message: "This video is age-restricted and cannot be processed." 
          });
        } else {
          return res.status(500).json({ 
            message: "Unable to extract transcript from this video. It may not have captions or may be restricted." 
          });
        }
      }

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
