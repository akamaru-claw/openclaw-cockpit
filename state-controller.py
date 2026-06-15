#!/usr/bin/env python3
"""
OpenClaw Cockpit State Controller
Sets state based on explicit activity markers.
Usage:
  state-controller.py reading    # New message received
  state-controller.py thinking   # Processing request
  state-controller.py working    # Executing tools
  state-controller.py done       # Reply sent
  state-controller.py idle       # Waiting
  state-controller.py sleeping   # Long idle
"""
import sys
import subprocess
import time

COCKPIT_URL = "http://localhost:31337/set-state"

VALID_STATES = ['idle', 'reading', 'thinking', 'working', 'cron', 'done', 'error', 'sleeping']

def set_state(state):
    if state not in VALID_STATES:
        print(f"Invalid state: {state}")
        sys.exit(1)
    try:
        result = subprocess.run(
            ["curl", "-s", f"{COCKPIT_URL}?state={state}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        print(f"State set: {state}")
        return result.returncode == 0
    except Exception as e:
        print(f"Error setting state: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <{'|'.join(VALID_STATES)}>")
        sys.exit(1)
    set_state(sys.argv[1])
