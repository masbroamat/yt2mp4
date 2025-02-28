// app/api/download/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { trackFileCreation, cleanupOldFiles } from "../../../lib/fileCleanup";
import youtubeDlExec from "youtube-dl-exec";
import { spawn } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Create a youtube-dl instance with proper configuration
const youtubeDl = youtubeDlExec.create({
  cwd: process.cwd(),
  noCache: true,
});

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
    return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
  }

  try {
    // Generate a unique filename
    const filename = `${randomUUID()}.mp4`;
    const outputPath = path.join(downloadsDir, filename);
    const videoTempPath = path.join(downloadsDir, `${filename}.video.mp4`);
    const audioTempPath = path.join(downloadsDir, `${filename}.audio.m4a`);

    // Download video with specific format or best video
    console.log("Downloading video...");
    await youtubeDl(url, {
      output: videoTempPath,
      format: formatId || 'bestvideo[ext=mp4]',
    });

    // Download audio separately
    console.log("Downloading audio...");
    await youtubeDl(url, {
      output: audioTempPath,
      extractAudio: true,
      audioFormat: 'm4a',
      format: 'bestaudio',
    });

    // Combine with ffmpeg
    console.log("Combining video and audio...");
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegInstaller.path, [
        '-i', videoTempPath,
        '-i', audioTempPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(data.toString());
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });

    // Clean up temp files
    try {
      fs.unlinkSync(videoTempPath);
      fs.unlinkSync(audioTempPath);
    } catch (err) {
      console.error("Error cleaning up temp files:", err);
    }

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
    return NextResponse.json({ error: "Error processing video: " + error.message }, { status: 500 });
  }
}