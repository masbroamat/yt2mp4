// app/api/download/video/[filename]/route.js
import path from "path";
import fs from "fs";
import {
  markFileAccessed,
  cleanupOldFiles,
} from "../../../../../lib/fileCleanup";

// Ensure the downloads directory exists
const downloadsDir = path.join(process.cwd(), "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

export async function GET(request, { params }) {
  // Run cleanup on each request
  cleanupOldFiles();

  try {
    // Get the filename from the route params
    const { filename } = await params;
    const filePath = path.join(downloadsDir, filename);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return new Response("File not found", { status: 404 });
    }

    // Mark the file as accessed (for your cleanup logic)
    markFileAccessed(filename);

    // Read the file into memory
    const fileBuffer = await fs.promises.readFile(filePath);

    // Prepare the response with proper headers for video download
    const response = new Response(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="video.mp4"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    // Delete the video file after reading it
    fs.promises
      .unlink(filePath)
      .catch((err) => console.error("Error deleting video file:", err));

    // Update metadata.json: remove the key matching the downloaded filename
    const metadataPath = path.join(downloadsDir, ".metadata.json");
    try {
      const metadataContent = await fs.promises.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);

      // Remove the entry corresponding to the file
      if (metadata.hasOwnProperty(filename)) {
        delete metadata[filename];
        await fs.promises.writeFile(
          metadataPath,
          JSON.stringify(metadata, null, 2)
        );
      }
    } catch (metaErr) {
      console.error("Error updating .metadata.json:", metaErr);
    }

    return response;
  } catch (error) {
    console.error("Error serving video:", error);
    return new Response("Error serving video", { status: 500 });
  }
}
