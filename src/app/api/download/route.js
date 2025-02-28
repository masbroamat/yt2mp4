// app/api/download/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { trackFileCreation, cleanupOldFiles } from "../../../lib/fileCleanup";
// import youtubeDlExec from "youtube-dl-exec";
import { execa } from "execa";
// import ffmpegStatic from "ffmpeg-static";
import { createRequire } from "module";
 

// Use createRequire to load CommonJS modules properly
const require = createRequire(import.meta.url);
const ffmpegStatic = require("ffmpeg-static"); // load ffmpeg-static using require

// Use createRequire to load the CommonJS module properly 
const youtubeDlExec = require("youtube-dl-exec");

const ffmpegPath = ffmpegStatic;

// Instead of using .create(), define a simple wrapper:
const youtubeDl = (url, options = {}) =>
  youtubeDlExec(url, { noCache: true, ...options });

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
    return NextResponse.json(
      { error: "YouTube URL is required" },
      { status: 400 }
    );
  }

  try {
    const filename = `${randomUUID()}.mp4`;
    const outputPath = path.join(downloadsDir, filename);
    const videoTempPath = path.join(downloadsDir, `${filename}.video.mp4`);
    const audioTempPath = path.join(downloadsDir, `${filename}.audio.m4a`);

    console.log("Downloading video...");
    await youtubeDl(url, {
      output: videoTempPath,
      format: formatId || "bestvideo[ext=mp4]",
    });

    console.log("Downloading audio...");
    await youtubeDl(url, {
      output: audioTempPath,
      extractAudio: true,
      audioFormat: "m4a",
      format: "bestaudio",
    });

    console.log("Combining video and audio...");
    const ffmpegProcess = execa(ffmpegPath, [
      "-i",
      videoTempPath,
      "-i",
      audioTempPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-strict",
      "experimental",
      outputPath,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log(data.toString());
    });

    await ffmpegProcess;

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
