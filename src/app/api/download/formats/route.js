// src/app/api/download/formats/route.js
import { NextResponse } from "next/server";
import youtubeDlExec from "youtube-dl-exec";

// Create a youtube-dl instance with proper configuration
// const youtubeDl = youtubeDlExec.create({
//   cwd: process.cwd(),
//   noCache: true,
// });

const youtubeDl = (url, options) => youtubeDlExec(url, options);

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    // Use youtube-dl-exec to fetch video info
    const videoData = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });
    
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

        // Only include MP4 formats or formats that don't need transcoding
        if (format.ext !== 'mp4') return false;
        
        // Only include formats with common resolutions
        const commonResolutions = [1080, 720, 480, 360];
        return commonResolutions.includes(format.height);
      })
      .sort((a, b) => b.height - a.height); // Sort by height (resolution) descending

    // Remove duplicate resolutions, keeping the most compatible format for each resolution
    const uniqueFormats = formats.reduce((acc, current) => {
      const existingFormat = acc.find(item => item.height === current.height);
      if (!existingFormat) {
        return acc.concat([current]);
      }
      // If we already have this resolution, prefer the format with better compatibility
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

      // If format has filesize, use it
      if (format.filesize && format.filesize > 0) {
        totalSize = format.filesize + audioSize;
      }
      // If format has bitrate, estimate size
      else if (format.tbr && videoData.duration) {
        isEstimated = true;
        const videoBitrate = format.tbr;
        const totalBitrate = videoBitrate + (bestAudioFormat?.tbr || 128); // assume 128kbps for audio if not known
        totalSize = Math.round((totalBitrate * 1024 * videoData.duration) / 8);
      }
      // If no size info available
      else {
        totalSize = null;
      }

      // Estimate size based on resolution if still no size available
      if (!totalSize) {
        isEstimated = true;
        const bitrateMap = {
          1080: 8000, // ~8Mbps for 1080p
          720: 5000,  // ~5Mbps for 720p
          480: 2500,  // ~2.5Mbps for 480p
          360: 1000   // ~1Mbps for 360p
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
        // Add a user-friendly label with estimated tag if necessary
        label: `${format.height}p${format.fps > 30 ? ` ${format.fps}fps` : ''} (${formatFileSize(totalSize, isEstimated)})`
      };
    });

    return NextResponse.json({ qualityOptions });
  } catch (error) {
    console.error(error);
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