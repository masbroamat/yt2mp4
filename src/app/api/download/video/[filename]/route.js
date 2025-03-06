// app/api/download/video/[filename]/route.js
import path from "path";
import fs from "fs";
import {
  markFileAccessed,
  cleanupOldFiles,
} from "../../../../../lib/fileCleanup";

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(process.cwd(), "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

export async function GET(request, { params }) {
  // Run cleanup check on each request
  cleanupOldFiles();

  try {
    // Await params as required by Next.js
    const { filename } = await params;
    const filePath = path.join(downloadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return new Response("File not found", { status: 404 });
    }

    // Mark file as accessed
    markFileAccessed(filename);

    // Read the file into a buffer
    const fileBuffer = await fs.promises.readFile(filePath);

    // Create the response
    const response = new Response(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="video.mp4"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    // We no longer delete the file immediately after serving
    // It will be automatically deleted by the cleanup process after 24 hours

    return response;
  } catch (error) {
    console.error("Error serving video:", error);
    return new Response("Error serving video", { status: 500 });
  }
}
