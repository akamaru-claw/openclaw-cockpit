#!/bin/bash
# OpenClaw Cockpit State Setter
# Usage: ./state-setter.sh <state>
# States: idle, reading, thinking, working, cron, done, error, sleeping

STATE=${1:-idle}
curl -s "http://localhost:31337/set-state?state=$STATE" > /dev/null
echo "State set to: $STATE"
