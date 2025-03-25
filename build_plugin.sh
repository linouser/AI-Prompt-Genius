#!/bin/bash

# Directories to be zipped
PLUGIN_DIR=plugin
DIST_DIR=dist

# Destination directory
DEST_DIR=~/Downloads

# Name of the zip file
ZIP_FILE=AI_Prompt-Genius_v4_2_0.zip

# Zip the directories
zip -r "$ZIP_FILE" $(basename "$PLUGIN_DIR") $(basename "$DIST_DIR")

# Move the zip file to the destination directory
mv "$ZIP_FILE" "$DEST_DIR"
