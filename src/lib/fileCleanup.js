// src/lib/fileCleanup.js
import fs from "fs";
import path from "path";

const downloadsDir = path.join(process.cwd(), "downloads");

// Create a function to track file creation time
export function trackFileCreation(filename) {
  const metadataPath = path.join(downloadsDir, ".metadata.json");

  // Load existing metadata
  let metadata = {};
  try {
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    }
  } catch (error) {
    console.error("Error reading metadata file:", error);
  }

  // Add new file with timestamp
  metadata[filename] = {
    createdAt: Date.now(),
    accessed: false,
  };

  // Save updated metadata
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error("Error writing metadata file:", error);
  }
}

// Function to mark a file as accessed
export function markFileAccessed(filename) {
  const metadataPath = path.join(downloadsDir, ".metadata.json");

  // Load existing metadata
  let metadata = {};
  try {
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    }
  } catch (error) {
    console.error("Error reading metadata file:", error);
    return;
  }

  // Update file access status if it exists in metadata
  if (metadata[filename]) {
    metadata[filename].accessed = true;

    // Save updated metadata
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error("Error writing metadata file:", error);
    }
  }
}

// Function to clean up old files
export function cleanupOldFiles() {
  const metadataPath = path.join(downloadsDir, ".metadata.json");

  // Check if metadata file exists
  if (!fs.existsSync(metadataPath)) {
    return;
  }

  // Load metadata
  let metadata = {};
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    console.error("Error reading metadata file:", error);
    return;
  }

  const now = Date.now();
  const DAY_IN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  let updatedMetadata = {};

  // Check each file in the metadata
  Object.keys(metadata).forEach((filename) => {
    const fileData = metadata[filename];
    const filePath = path.join(downloadsDir, filename);

    // If file is older than 24 hours, try to delete it
    if (now - fileData.createdAt > DAY_IN_MS) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted old file: ${filename}`);
        } catch (error) {
          console.error(`Error deleting file ${filename}:`, error);
          // Keep in metadata if deletion failed
          updatedMetadata[filename] = fileData;
        }
      }
    } else {
      // Keep files that are not yet 24 hours old
      updatedMetadata[filename] = fileData;
    }
  });

  // Save updated metadata
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
  } catch (error) {
    console.error("Error writing metadata file:", error);
  }
}
