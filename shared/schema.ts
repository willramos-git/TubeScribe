import { z } from "zod";

export const transcriptRequestSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    { message: "Must be a valid YouTube URL" }
  ),
});

export const summarizeRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty"),
  style: z.enum(["detailed", "concise"]).default("detailed"),
});

export type TranscriptRequest = z.infer<typeof transcriptRequestSchema>;
export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
  timestamp: string;
}

export interface TranscriptResponse {
  items: TranscriptItem[];
  transcript: string;
  characterCount: number;
  tokenCount: number;
  videoTitle?: string;
  videoDuration?: string;
}

export interface SummaryResponse {
  summary: string;
  tldr: string;
  bulletPoints: string[];
  tokenCount: number;
}
