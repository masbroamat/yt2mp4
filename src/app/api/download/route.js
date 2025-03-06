// app/api/download/route.js
import { exec } from "child_process";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { trackFileCreation, cleanupOldFiles } from "../../../lib/fileCleanup";

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(process.cwd(), "downloads");
try {
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }
} catch (error) {
  console.error("Error creating downloads directory:", error);
}

export async function POST(request) {
  // Run cleanup before processing new downloads
  cleanupOldFiles();

  const { url, formatId } = await request.json();

  if (!url) {
    return NextResponse.json(
      { error: "YouTube URL is required" },
      { status: 400 }
    );
  }

  try {
    // Generate a unique filename
    const filename = `${randomUUID()}.mp4`;
    const outputPath = path.join(downloadsDir, filename);

    await new Promise((resolve, reject) => {
      // Command to download video and audio separately, then combine with AAC audio
      const command = formatId
        ? `yt-dlp -f "${formatId}" "${url}" -o "${outputPath}.video.mp4" && yt-dlp -f "bestaudio" "${url}" -o "${outputPath}.audio.m4a" --extract-audio --audio-format m4a && ffmpeg -i "${outputPath}.video.mp4" -i "${outputPath}.audio.m4a" -c:v copy -c:a aac -strict experimental "${outputPath}" && del "${outputPath}.video.mp4" "${outputPath}.audio.m4a"`
        : `yt-dlp -f "bestvideo" "${url}" -o "${outputPath}.video.mp4" && yt-dlp -f "bestaudio" "${url}" -o "${outputPath}.audio.m4a" --extract-audio --audio-format m4a && ffmpeg -i "${outputPath}.video.mp4" -i "${outputPath}.audio.m4a" -c:v copy -c:a aac -strict experimental "${outputPath}" && del "${outputPath}.video.mp4" "${outputPath}.audio.m4a"`;

      console.log("Executing command:", command);

      const process = exec(command, { maxBuffer: 1024 * 1024 * 10 });

      // Collect stdout and stderr
      let stdoutData = "";
      let stderrData = "";

      process.stdout?.on("data", (data) => {
        stdoutData += data;
        console.log(data);
      });

      process.stderr?.on("data", (data) => {
        stderrData += data;
        console.error(data);
      });

      process.on("close", (code) => {
        console.log(`Child process exited with code ${code}`);

        // Only consider it an error if the code is non-zero
        if (code === 0) {
          resolve(stdoutData);
        } else {
          reject(
            new Error(
              `Download failed. Exit code: ${code}. Error: ${stderrData}`
            )
          );
        }
      });

      process.on("error", (error) => {
        console.error("Process error:", error);
        reject(error);
      });
    });

    // Verify the file exists after download is complete
    if (!fs.existsSync(outputPath)) {
      throw new Error("Downloaded file not found after successful download");
    }

    // Track the file creation with our new utility
    trackFileCreation(filename);

    // Create a route that serves the video file
    const downloadUrl = `/api/download/video/${filename}`;
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error processing video: " + error.message },
      { status: 500 }
    );
  }
}
