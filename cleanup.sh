#!/bin/bash

# cleanup.sh - Image maintenance and monitoring script
# This script performs:
# 1. Cleanup of orphaned images
# 2. Monitoring of image errors
# 3. Database-filesystem synchronization

echo "=== FabSnippets Image Maintenance Tool ==="
echo "Starting maintenance process at $(date)"
echo ""

# Function to display script usage
show_usage() {
  echo "Usage: ./cleanup.sh [options]"
  echo "Options:"
  echo "  --cleanup    Run orphaned image cleanup only"
  echo "  --monitor    Run image error monitoring only"
  echo "  --fix        Run image validation and fix process"
  echo "  --all        Run all maintenance tasks (default)"
  echo "  --help       Display this help message"
}

# Process command-line arguments
RUN_CLEANUP=0
RUN_MONITOR=0
RUN_FIX=0

if [ $# -eq 0 ]; then
  # Default behavior if no arguments: run everything
  RUN_CLEANUP=1
  RUN_MONITOR=1
  RUN_FIX=1
else
  # Process specific arguments
  for arg in "$@"; do
    case "$arg" in
      --cleanup)
        RUN_CLEANUP=1
        ;;
      --monitor)
        RUN_MONITOR=1
        ;;
      --fix)
        RUN_FIX=1
        ;;
      --all)
        RUN_CLEANUP=1
        RUN_MONITOR=1
        RUN_FIX=1
        ;;
      --help)
        show_usage
        exit 0
        ;;
      *)
        echo "Error: Unknown option $arg"
        show_usage
        exit 1
        ;;
    esac
  done
fi

# Ensure uploads directories exist
echo "=== Checking upload directories ==="
mkdir -p ./uploads
mkdir -p ./public/uploads
echo "Upload directories verified"
echo ""

# Run cleanup if requested
if [ $RUN_CLEANUP -eq 1 ]; then
  echo "=== Running Orphaned Image Cleanup ==="
  echo "This process will remove image files that aren't referenced in the database"
  echo "Starting cleanup..."
  
  # Run the cleanup script
  echo "Executing cleanup script..."
  npx tsx scripts/cleanupOrphanedImages.ts
  
  if [ $? -eq 0 ]; then
    echo "Cleanup completed successfully"
  else
    echo "Error: Cleanup process failed"
  fi
  echo ""
fi

# Run monitoring if requested
if [ $RUN_MONITOR -eq 1 ]; then
  echo "=== Running Image Error Monitoring ==="
  echo "This process will identify issues with images in the database"
  echo "Starting monitoring..."
  
  # Run the monitoring script
  echo "Executing monitoring script..."
  npx tsx scripts/monitorImageErrors.ts
  
  if [ $? -eq 0 ]; then
    echo "Monitoring completed successfully"
  else
    echo "Error: Monitoring process failed"
  fi
  echo ""
fi

# Run image validation and fix if requested
if [ $RUN_FIX -eq 1 ]; then
  echo "=== Running Image Validation and Fix Process ==="
  echo "This process will automatically fix any detected image issues"
  echo "Starting image validation and fix..."
  
  # Run the scheduleImageCheck script
  echo "Executing image validation and fix script..."
  npx tsx scripts/scheduleImageCheck.ts
  
  if [ $? -eq 0 ]; then
    echo "Image validation and fix completed successfully"
  else
    echo "Error: Image validation and fix process failed"
  fi
  echo ""
fi

echo "=== Maintenance Completed at $(date) ==="
echo "For more detailed logs, check the console output above."