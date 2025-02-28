// src/app/api/download/formats/route.js
import { NextResponse } from "next/server";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Set up __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const youtubeDlExec = require("youtube-dl-exec");

// Define default options without the "executable" property.
const defaultOptions = {
  noCache: true,
  dumpSingleJson: true,
  noCheckCertificates: true,
  preferFreeFormats: true,
  youtubeSkipDashManifest: true,
  cookies: path.join(process.cwd(), 'cookies.txt') // Add this line
};


// Set YTDL_EXECUTABLE to force usage of your binary.
process.env.YTDL_EXECUTABLE = path.join(
  process.cwd(),
  "bin",
  process.platform === "win32" ? "youtube-dl.exe" : "youtube-dl"
);

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Call youtube-dl-exec with default options
    const videoData = await youtubeDlExec(url, defaultOptions);

    // Process videoData to extract quality options...
    const bestAudioFormat = videoData.formats
      .filter(format => format.vcodec === 'none' && format.acodec !== 'none')
      .reduce((best, current) => {
        if (!best || (current.tbr && (!best.tbr || current.tbr > best.tbr))) {
          return current;
        }
        return best;
      }, null);

    const audioSize = bestAudioFormat?.filesize ||
      (bestAudioFormat?.tbr ? Math.round((bestAudioFormat.tbr * 1024 * videoData.duration) / 8) : 0);

    const formats = videoData.formats
      .filter(format => {
        if (format.vcodec === 'none') return false;
        if (!format.height) return false;
        if (format.resolution === 'audio only') return false;
        if (format.ext !== 'mp4') return false;
        const commonResolutions = [1080, 720, 480, 360];
        return commonResolutions.includes(format.height);
      })
      .sort((a, b) => b.height - a.height);

    const uniqueFormats = formats.reduce((acc, current) => {
      const existingFormat = acc.find(item => item.height === current.height);
      if (!existingFormat) {
        return acc.concat([current]);
      }
      if (current.ext === 'mp4' && (current.vcodec === 'avc1' || current.vcodec === 'h264')) {
        const index = acc.indexOf(existingFormat);
        acc[index] = current;
      }
      return acc;
    }, []);

    const qualityOptions = uniqueFormats.map((format) => {
      let totalSize;
      let isEstimated = false;
      if (format.filesize && format.filesize > 0) {
        totalSize = format.filesize + audioSize;
      } else if (format.tbr && videoData.duration) {
        isEstimated = true;
        const videoBitrate = format.tbr;
        const totalBitrate = videoBitrate + (bestAudioFormat?.tbr || 128);
        totalSize = Math.round((totalBitrate * 1024 * videoData.duration) / 8);
      } else {
        totalSize = null;
      }
      if (!totalSize) {
        isEstimated = true;
        const bitrateMap = {
          1080: 8000,
          720: 5000,
          480: 2500,
          360: 1000,
        };
        const estimatedBitrate = bitrateMap[format.height] || 1000;
        totalSize = Math.round(((estimatedBitrate + 128) * 1024 * videoData.duration) / 8);
      }
      return {
        format_id: format.format_id,
        resolution: `${format.height}p`,
        fps: format.fps || 30,
        filesize: totalSize,
        vcodec: format.vcodec,
        acodec: format.acodec,
        ext: format.ext,
        label: `${format.height}p${format.fps > 30 ? ` ${format.fps}fps` : ''} (${formatFileSize(totalSize, isEstimated)})`
      };
    });

    return NextResponse.json({ qualityOptions });
  } catch (error) {
    console.error("Detailed error:", error);
    return NextResponse.json(
      { error: "Error fetching formats: " + error.message },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes, isEstimated = false) {
  if (!bytes) return "Size unavailable";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${isEstimated ? "~" : ""}${size.toFixed(1)} ${units[unitIndex]}`;
}
