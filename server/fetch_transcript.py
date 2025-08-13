import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def main():
    if len(sys.argv) < 2:
        print('[]')
        return
    video_id = sys.argv[1]
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        segments = [
            {
                "text": t.text,
                "offset": int(t.start * 1000),
                "duration": int(t.duration * 1000),
            }
            for t in transcript
        ]
        print(json.dumps(segments))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
