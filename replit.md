# YouTube Transcript Extractor

## Overview

This is a full-stack web application that extracts transcripts from YouTube videos and generates AI-powered summaries. The application allows users to input YouTube URLs, fetch video transcripts, and create detailed summaries using OpenAI's GPT models. Built with a modern React frontend and Express.js backend, it provides a clean, user-friendly interface for transcript analysis and summarization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API with structured error handling and logging middleware
- **Development Tools**: TSX for TypeScript execution in development, ESBuild for production builds

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL for cloud-native database hosting
- **Schema Management**: Drizzle Kit for database migrations and schema evolution
- **Session Storage**: In-memory storage for development (can be extended to persistent storage)

### Authentication and Authorization
- **Current Implementation**: Basic user management with in-memory storage
- **User Model**: Simple user schema with ID and username fields
- **Session Management**: Express sessions with configurable storage backends

### External Service Integrations
- **YouTube Transcript API**: Custom integration using youtube-transcript library for extracting video transcripts
- **OpenAI Integration**: GPT models for generating summaries and bullet points from transcripts
- **Text Processing**: Custom chunking algorithms to handle large transcripts within token limits
- **Error Handling**: Comprehensive error management for external API failures

### Key Architectural Decisions

**Frontend-Backend Separation**: Chose a decoupled architecture where the React frontend communicates with the Express backend through a REST API. This provides flexibility for future scaling and allows independent deployment of frontend and backend components.

**Type Safety**: Implemented end-to-end TypeScript with shared schemas between frontend and backend using Zod. This ensures data consistency and catches errors at compile time rather than runtime.

**Component-Based UI**: Utilized shadcn/ui and Radix primitives to create a modular, accessible component system. This approach provides consistency across the application while maintaining flexibility for customization.

**Serverless-Ready Database**: Chose Neon PostgreSQL and Drizzle ORM to support serverless deployment patterns while maintaining relational data integrity.

**Optimistic Performance**: Implemented React Query for intelligent caching and background updates, reducing unnecessary API calls and improving user experience.

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for database connectivity
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **express**: Web application framework for building the REST API
- **openai**: Official OpenAI SDK for GPT integration and text generation
- **youtube-transcript**: Library for extracting transcripts from YouTube videos

### Frontend Dependencies
- **react**: Core React library for building user interfaces
- **@tanstack/react-query**: Server state management and caching solution
- **wouter**: Lightweight routing library for single-page application navigation
- **@radix-ui/**: Collection of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework for styling
- **zod**: TypeScript-first schema validation library

### Development Dependencies
- **vite**: Fast build tool and development server for frontend applications
- **tsx**: TypeScript execution engine for Node.js development
- **esbuild**: Fast JavaScript bundler for production builds
- **drizzle-kit**: CLI tool for database schema management and migrations

### Third-Party Services
- **OpenAI API**: GPT models for natural language processing and summarization
- **YouTube**: Video platform for transcript extraction (via unofficial API)
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Replit**: Development environment and deployment platform

## Recent Changes

### UI/UX Improvements and Bug Fixes (August 13, 2025)
- **Removed Fake Data Banner**: Eliminated the amber status banner that mentioned "demo data provided" to maintain complete data integrity.
- **Fixed Top Summarize Button**: Implemented shared state between top toolbar and bottom panel summarize buttons - both now work identically.
- **Added Smooth Scroll Functionality**: Top "Summarize" button now smoothly scrolls to AI Summary section before generating summary.
- **Unified Summary State Management**: Created single source of truth for summary data across components to prevent inconsistent behavior.
- **Auto-Clear Previous Summaries**: New transcript loads now automatically clear previous summary data for clean user experience.
- **User Confirmation**: User tested and confirmed both top and bottom summarize buttons work correctly with proper scroll behavior.

### Transcript Extraction Fully Working (August 13, 2025)
- **Successfully Implemented Python youtube-transcript-api**: Switched to the robust Python youtube-transcript-api library as requested by the user, resolving all previous extraction issues.
- **Created Python Integration Bridge**: Built a working Python script (`server/fetch_transcript.py`) that properly interfaces with Node.js backend via subprocess communication.
- **Installed Required Dependencies**: Set up Python 3.11 and youtube-transcript-api package with proper virtual environment configuration.
- **Real Transcript Extraction Confirmed**: App now successfully extracts authentic captions from YouTube videos, tested and working with real data.
- **Comprehensive Error Handling**: Added detailed error messages for disabled transcripts, unavailable videos, and other edge cases with appropriate HTTP status codes.
- **User Feedback**: User confirmed the application "looks and works great" with real YouTube transcript extraction functionality.

### Bug Fixes (August 12, 2025)
- **Duplicate Function Issue Resolved**: Fixed duplicate `parseVTTContent` function declarations in `server/routes.ts` that were causing compilation errors. Removed the second implementation that used an undefined `parseTimeToSeconds` function, keeping the correct version that uses the existing `parseTimestamp` helper function.