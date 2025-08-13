#!/usr/bin/env python3

import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

def fetch_transcript(video_id):
    try:
        # Create API instance and fetch transcript in English
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
        
        # Convert to the format expected by the Node.js application
        formatted_transcript = []
        for snippet in transcript:
            formatted_transcript.append({
                'text': snippet.text,
                'offset': int(snippet.start * 1000),  # Convert to milliseconds
                'duration': int(snippet.duration * 1000)  # Convert to milliseconds
            })
        
        return formatted_transcript
        
    except TranscriptsDisabled:
        raise Exception("Transcript is disabled for this video")
    except NoTranscriptFound:
        raise Exception("No English transcript found for this video")
    except VideoUnavailable:
        raise Exception("Video is unavailable or private")
    except Exception as e:
        raise Exception(f"Failed to fetch transcript: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fetch_transcript.py <video_id>", file=sys.stderr)
        sys.exit(1)
    
    video_id = sys.argv[1]
    
    try:
        transcript = fetch_transcript(video_id)
        print(json.dumps(transcript))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)