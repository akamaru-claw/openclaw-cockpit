#!/usr/bin/env python3
"""
OpenClaw Cockpit Chat Sender
Sends conversation messages to the Cockpit dashboard.
Usage:
  chat-send.py "text" [user|assistant]
"""
import sys
import subprocess
import json

COCKPIT_URL = "http://localhost:31337/chat"

def send_chat(text, sender='assistant'):
    if not text:
        print("No text provided")
        sys.exit(1)
    try:
        json_data = json.dumps({"text": text, "sender": sender})
        result = subprocess.run(
            [
                "curl", "-s", "-X", "POST",
                "-H", "Content-Type: application/json",
                "-d", json_data,
                COCKPIT_URL
            ],
            capture_output=True,
            text=True,
            timeout=5
        )
        print(f"Chat sent: {sender} // {text[:60]}...")
        return result.returncode == 0
    except Exception as e:
        print(f"Error sending chat: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} \"text\" [user|assistant]")
        sys.exit(1)
    text = sys.argv[1]
    sender = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] in ['user', 'assistant'] else 'assistant'
    send_chat(text, sender)
