// For this YouTube transcript app, we don't need persistent storage
// Transcripts and summaries are generated on-demand and returned directly to the client
// This file exists to maintain the project structure but doesn't implement any actual storage

export interface IStorage {
  // Placeholder for future storage needs if required
}

export class MemStorage implements IStorage {
  constructor() {
    // No storage needed for this application
  }
}

export const storage = new MemStorage();
