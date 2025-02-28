// src/app/api/download/formats/route.js
import { NextResponse } from "next/server";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Set up __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use createRequire to load the CommonJS module properly
const require = createRequire(import.meta.url);
const youtubeDlExec = require("youtube-dl-exec");

// Define default options without "cwd" and force the executable to "youtube-dl"
// Define default options without the "executable" flag.
const defaultOptions = {
  noCache: true,
  dumpSingleJson: true,
  noCheckCertificates: true,
  preferFreeFormats: true,
  youtubeSkipDashManifest: true,
  // Remove the "executable" property so that no unsupported flag is passed.
};


export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Call youtube-dl-exec with the default options merged in
    const videoData = await youtubeDlExec(url, defaultOptions);


    // Find best audio format and its properties
    const bestAudioFormat = videoData.formats
      .filter(format => format.vcodec === 'none' && format.acodec !== 'none')
      .reduce((best, current) => {
        if (!best || (current.tbr && (!best.tbr || current.tbr > best.tbr))) {
          return current;
        }
        return best;
      }, null);

    // Calculate audio size based on bitrate if filesize is not available
    const audioSize = bestAudioFormat?.filesize ||
      (bestAudioFormat?.tbr ? Math.round((bestAudioFormat.tbr * 1024 * videoData.duration) / 8) : 0);

    // Filter and sort formats to get reliable quality options
    const formats = videoData.formats
      .filter(format => {
        // Only include formats with video
        if (format.vcodec === 'none') return false;
        // Must have height information
        if (!format.height) return false;
        // Exclude audio-only formats
        if (format.resolution === 'audio only') return false;
        // Only include MP4 formats
        if (format.ext !== 'mp4') return false;
        // Only include formats with common resolutions
        const commonResolutions = [1080, 720, 480, 360];
        return commonResolutions.includes(format.height);
      })
      .sort((a, b) => b.height - a.height);

    // Remove duplicate resolutions, keeping the most compatible format for each resolution
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

    // Extract and format quality options with more details
    const qualityOptions = uniqueFormats.map((format) => {
      let totalSize;
      let isEstimated = false;

      if (format.filesize && format.filesize > 0) {
        totalSize = format.filesize + audioSize;
      } else if (format.tbr && videoData.duration) {
        isEstimated = true;
        const videoBitrate = format.tbr;
        const totalBitrate = videoBitrate + (bestAudioFormat?.tbr || 128); // assume 128kbps for audio if not known
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

// Helper function to format file size
function formatFileSize(bytes, isEstimated = false) {
  if (!bytes) return 'Size unavailable';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${isEstimated ? '~' : ''}${size.toFixed(1)} ${units[unitIndex]}`;
}
