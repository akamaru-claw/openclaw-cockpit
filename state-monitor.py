#!/usr/bin/env python3
"""
OpenClaw Cockpit State Monitor
Monitors assistant activity and reports state to the Cockpit dashboard.
"""
import subprocess
import time
import re
import os
from datetime import datetime, timedelta

COCKPIT_URL = "http://localhost:31337/set-state"
LAST_MESSAGE_LOG = "/tmp/openclaw_last_message"
LAST_TOOL_LOG = "/tmp/openclaw_last_tool"
LAST_REPLY_LOG = "/tmp/openclaw_last_reply"

def set_state(state):
    try:
        subprocess.run(["curl", "-s", f"{COCKPIT_URL}?state={state}"], timeout=5)
    except Exception:
        pass

def get_idle_time(log_path):
    if not os.path.exists(log_path):
        return 9999
    try:
        mtime = os.path.getmtime(log_path)
        return time.time() - mtime
    except Exception:
        return 9999

def touch(path):
    with open(path, "w") as f:
        f.write(str(time.time()))

def check_incoming_message():
    """Detect if a new message just arrived (placeholder for future hook)."""
    return get_idle_time(LAST_MESSAGE_LOG) < 2.0

def check_tool_execution():
    """Detect if a tool is currently running."""
    try:
        result = subprocess.run(
            ["ps", "aux"],
            capture_output=True,
            text=True,
            timeout=2
        )
        lines = result.stdout.split("\n")
        tool_count = 0
        for line in lines:
            if "openclaw" in line.lower() and ("tool" in line.lower() or "exec" in line.lower()):
                tool_count += 1
        return tool_count > 0
    except Exception:
        return False

def main():
    current_state = "idle"
    set_state("idle")

    while True:
        now = time.time()
        last_message = get_idle_time(LAST_MESSAGE_LOG)
        last_tool = get_idle_time(LAST_TOOL_LOG)
        last_reply = get_idle_time(LAST_REPLY_LOG)

        is_tool_running = check_tool_execution()
        is_reading = last_message < 3.0
        is_working = is_tool_running or last_tool < 3.0
        is_done = last_reply < 2.0
        is_idle = not (is_reading or is_working or is_done)

        if is_working:
            new_state = "working"
        elif is_reading:
            new_state = "reading"
        elif is_done:
            new_state = "done"
        elif is_idle:
            # Fade to idle, then sleeping after 5 minutes
            if last_message > 300 and last_tool > 300 and last_reply > 300:
                new_state = "sleeping"
            else:
                new_state = "idle"
        else:
            new_state = "idle"

        if new_state != current_state:
            set_state(new_state)
            current_state = new_state

        time.sleep(1)

if __name__ == "__main__":
    main()
