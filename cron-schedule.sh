#!/bin/bash

# cron-schedule.sh
# This script is designed to be run by a cron job to automate image maintenance
# Recommended cron schedule: 0 2 * * * /path/to/cron-schedule.sh

# Change to the project directory
cd "$(dirname "$0")"

# Get the current date and time
CURRENT_DATE=$(date +"%Y-%m-%d_%H-%M-%S")

# Create logs directory if it doesn't exist
mkdir -p logs

# Log file for this run
LOG_FILE="logs/cron-maintenance-${CURRENT_DATE}.log"

# Run the maintenance script and redirect output to the log file
echo "=== Starting automated maintenance at $(date) ===" > "$LOG_FILE"
./cleanup.sh --all >> "$LOG_FILE" 2>&1
CLEANUP_EXIT_CODE=$?
echo "=== Completed automated maintenance at $(date) with exit code: $CLEANUP_EXIT_CODE ===" >> "$LOG_FILE"

# Create a symlink to the latest log for easy access
LOGFILE_BASENAME=$(basename "$LOG_FILE")
echo "Creating symlink from $LOGFILE_BASENAME to latest-maintenance.log..." >> "$LOG_FILE"
cd logs
ln -sf "$LOGFILE_BASENAME" latest-maintenance.log
cd ..
echo "Symlink created successfully" >> "$LOG_FILE"

# Rotate logs - keep only the latest 10 log files
find logs -name "cron-maintenance-*.log" -type f | sort -r | tail -n +11 | xargs -r rm

echo "Maintenance completed. Log saved to $LOG_FILE"

# Exit with success
exit 0