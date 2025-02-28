// app/api/download/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { trackFileCreation, cleanupOldFiles } from "../../../lib/fileCleanup";
import youtubeDlExec from "youtube-dl-exec";
import { execa } from 'execa';
import ffmpegStatic from 'ffmpeg-static';

// Get FFmpeg path from ffmpeg-static
const ffmpegPath = ffmpegStatic;

// Create youtube-dl instance
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
  cleanupOldFiles();
  
  const { url, formatId } = await request.json();
  
  if (!url) {
    return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
  }

  try {
    const filename = `${randomUUID()}.mp4`;
    const outputPath = path.join(downloadsDir, filename);
    const videoTempPath = path.join(downloadsDir, `${filename}.video.mp4`);
    const audioTempPath = path.join(downloadsDir, `${filename}.audio.m4a`);

    // Download video
    console.log("Downloading video...");
    await youtubeDl(url, {
      output: videoTempPath,
      format: formatId || 'bestvideo[ext=mp4]',
    });

    // Download audio
    console.log("Downloading audio...");
    await youtubeDl(url, {
      output: audioTempPath,
      extractAudio: true,
      audioFormat: 'm4a',
      format: 'bestaudio',
    });

    // Combine with FFmpeg using execa
    console.log("Combining video and audio...");
    const ffmpegProcess = execa(ffmpegPath, [
      '-i', videoTempPath,
      '-i', audioTempPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      outputPath
    ]);

    // Real-time logging
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    await ffmpegProcess;

    // Cleanup temp files
    try {
      fs.unlinkSync(videoTempPath);
      fs.unlinkSync(audioTempPath);
    } catch (err) {
      console.error("Error cleaning up temp files:", err);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error("Downloaded file not found after processing");
    }

    trackFileCreation(filename);
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