// src/app/api/download/formats/route.js
import { NextResponse } from "next/server";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fs from "fs";
import { spawn } from "child_process";
import { promisify } from "util";

// Set up __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
let youtubeDlExec;

try {
  youtubeDlExec = require("youtube-dl-exec");
} catch (error) {
  console.error("Error loading youtube-dl-exec:", error);
}

// Define default options without the "executable" property.
const defaultOptions = {
  noCache: true,
  dumpSingleJson: true,
  noCheckCertificates: true,
  preferFreeFormats: true,
  youtubeSkipDashManifest: true,
};

// Find the youtube-dl binary in Vercel environment
function findBinary() {
  console.log("Current working directory:", process.cwd());
  
  // Start with paths relative to current working directory for Vercel
  const possiblePaths = [
    "/var/task/bin/youtube-dl",
    "/var/task/node_modules/youtube-dl-exec/bin/youtube-dl",
    "/var/task/public/bin/youtube-dl",
    path.join(process.cwd(), "bin", "youtube-dl"),
    path.join(process.cwd(), "public", "bin", "youtube-dl"),
    path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "youtube-dl"),
    path.join(__dirname, "..", "..", "..", "..", "bin", "youtube-dl"),
    path.join(__dirname, "..", "..", "..", "bin", "youtube-dl"),
    path.join(__dirname, "..", "bin", "youtube-dl")
  ];
  
  // Log all paths we're checking
  console.log("Checking for youtube-dl in paths:", possiblePaths);
  
  // Find the first existing binary path
  for (const binPath of possiblePaths) {
    try {
      if (fs.existsSync(binPath)) {
        console.log(`Found youtube-dl binary at: ${binPath}`);
        
        // Check if executable
        try {
          fs.accessSync(binPath, fs.constants.X_OK);
          console.log(`Binary is executable: ${binPath}`);
        } catch (err) {
          console.log(`Binary exists but is not executable: ${binPath}`);
          try {
            // Try to make executable
            fs.chmodSync(binPath, 0o755);
            console.log(`Made binary executable: ${binPath}`);
          } catch (chmodErr) {
            console.log(`Failed to make binary executable: ${chmodErr}`);
          }
        }
        
        return binPath;
      }
    } catch (error) {
      console.log(`Path check error for ${binPath}:`, error.message);
    }
  }

  console.log("No youtube-dl binary found in any expected path");
  return null;
}

// Simple wrapper function to execute youtube-dl directly if needed
async function executeYoutubeDl(url, args = []) {
  const binaryPath = findBinary();
  
  if (!binaryPath) {
    throw new Error("Could not find youtube-dl binary");
  }
  
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${binaryPath} ${args.join(' ')} ${url}`);
    
    const childProcess = spawn(binaryPath, [...args, url], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log("stderr:", data.toString());
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse JSON output: ${e.message}`));
        }
      } else {
        reject(new Error(`youtube-dl process exited with code ${code}: ${stderr}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(new Error(`Failed to start youtube-dl process: ${err.message}`));
    });
  });
}

// Helper function to process video data and extract formats
async function processVideoRequest(url) {
  if (!url) {
    return NextResponse.json(
      { error: "YouTube URL is required" },
      { status: 400 }
    );
  }

  try {
    // Log environment
    console.log("Environment:", {
      cwd: process.cwd(),
      dirname: __dirname,
      binPath: findBinary(),
      platform: process.platform,
      env: process.env.NODE_ENV
    });

    let videoData;
    
    // Try using the direct execution approach first
    try {
      videoData = await executeYoutubeDl(url, [
        '--dump-json',
        '--no-cache-dir',
        '--no-check-certificate',
        '--prefer-free-formats',
        '--youtube-skip-dash-manifest'
      ]);
    } catch (directError) {
      console.error("Direct execution failed:", directError);
      
      // Fallback to youtube-dl-exec if available
      if (youtubeDlExec) {
        console.log("Falling back to youtube-dl-exec");
        const binPath = findBinary();
        if (!binPath) {
          throw new Error("No youtube-dl binary found");
        }
        
        // Force the binary path
        process.env.YTDL_EXECUTABLE = binPath;
        
        videoData = await youtubeDlExec(url, {
          ...defaultOptions,
          binaryPath: binPath
        });
      } else {
        throw directError;
      }
    }
    
    if (!videoData || !videoData.formats) {
      throw new Error("Invalid or empty response from youtube-dl");
    }

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
    console.error("Error processing video request:", error);
    return NextResponse.json(
      { 
        error: "Error fetching formats: " + error.message,
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
          errorPath: error.path,
          errorCode: error.code,
          errorSyscall: error.syscall,
          binPath: findBinary(),
          cwd: process.cwd(),
          dirname: __dirname
        }
      },
      { status: 500 }
    );
  }
}

// Handle GET requests
export async function GET(request) {
  try {
    // Extract URL from query parameters
    const url = new URL(request.url).searchParams.get('url');
    return await processVideoRequest(url);
  } catch (error) {
    console.error("Detailed error in GET handler:", error);
    return NextResponse.json(
      { 
        error: "Error fetching formats: " + error.message,
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
          binPath: findBinary(),
          method: "GET"
        }
      },
      { status: 500 }
    );
  }
}

// Handle POST requests
export async function POST(request) {
  try {
    const { url } = await request.json();
    return await processVideoRequest(url);
  } catch (error) {
    console.error("Detailed error in POST handler:", error);
    return NextResponse.json(
      { 
        error: "Error fetching formats: " + error.message,
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
          binPath: findBinary(),
          method: "POST"
        }
      },
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