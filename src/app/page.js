// src/app/page.js
"use client";

import { useState, useRef, useEffect } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Input } from "@/components/ui/input";
import { CircleX, Search, Loader2, Download } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const affiliateLinks = [
  "https://s.shopee.com.my/w2z6n6HR",
  "https://s.shopee.com.my/VsJa1lCGY",
  "https://s.shopee.com.my/LYtNilpbX",
  "https://s.shopee.com.my/qV9ydjvae",
  "https://s.shopee.com.my/gBjmKkYvd",
  "https://s.shopee.com.my/5faPjdTNIY",
  "https://s.shopee.com.my/5ptpvwSjxb",
  "https://s.shopee.com.my/60DG8FS6ce",
  "https://s.shopee.com.my/6AWgKYRTHh",
  "https://s.shopee.com.my/6Kq6WrQpwk",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [qualityOptions, setQualityOptions] = useState([]);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const inputRef = useRef(null);
  const lastProcessedUrl = useRef("");
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [selectedQualityLabel, setSelectedQualityLabel] = useState("");
  const [noOptionsAvailable, setNoOptionsAvailable] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [globalConversionCount, setGlobalConversionCount] = useState(0);

  const AFFILIATE_RESET_MINUTES = 1440; // Set the cycle time in minutes
  const AFFILIATE_RESET_TIME = AFFILIATE_RESET_MINUTES * 60000; // Convert minutes to milliseconds

  // Fetch the global conversion count from the backend
  useEffect(() => {
    async function fetchGlobalConversionCount() {
      try {
        const res = await fetch("/api/convertedCount");
        const data = await res.json();
        setGlobalConversionCount(data.count);
      } catch (error) {
        console.error("Failed to fetch global conversion count", error);
      }
    }
    fetchGlobalConversionCount();
  }, []);

  // Check the download cycle based on time and stored count
  useEffect(() => {
    const lastClickTime = localStorage.getItem("lastClickTime");
    const now = Date.now();

    if (
      !lastClickTime ||
      now - parseInt(lastClickTime) > AFFILIATE_RESET_TIME
    ) {
      resetAffiliateCycle();
    } else {
      const storedCount = parseInt(
        localStorage.getItem("downloadCount") || "0",
        10
      );
      setDownloadCount(storedCount);
      // Update affiliate link randomly for consistency
      const randomLink =
        affiliateLinks[Math.floor(Math.random() * affiliateLinks.length)];
      localStorage.setItem("affiliateLink", randomLink);
    }
  }, []);

  const resetAffiliateCycle = () => {
    const randomLink =
      affiliateLinks[Math.floor(Math.random() * affiliateLinks.length)];
    localStorage.setItem("affiliateLink", randomLink);
    localStorage.setItem("lastClickTime", Date.now().toString());
    localStorage.setItem("downloadCount", "0");
    setDownloadCount(0);
  };

  // Helper function to increment the global conversion count on the backend
  const incrementGlobalConversionCount = async () => {
    try {
      await fetch("/api/incrementConversion", { method: "POST" });
      // Re-fetch the updated count
      const res = await fetch("/api/convertedCount");
      const data = await res.json();
      setGlobalConversionCount(data.count);
    } catch (error) {
      console.error("Error incrementing global conversion count", error);
    }
  };

  // Clear quality options when URL changes
  useEffect(() => {
    if (url !== lastProcessedUrl.current) {
      setQualityOptions([]);
      setShowQualityOptions(false);
      setSelectedQuality(null);
      setDownloadLink("");
      setError("");
      setNoOptionsAvailable(false);
    }
  }, [url]);

  const handleClearInput = () => {
    setUrl("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleGetFormats = async () => {
    if (!url) return alert("Please enter a YouTube URL");
    setProcessing(true);
    setError("");
    setDownloadLink("");
    setQualityOptions([]);
    setShowQualityOptions(false);
    setSelectedQuality(null);
    setNoOptionsAvailable(false);
    lastProcessedUrl.current = url;

    try {
      const res = await fetch("/api/download/formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        // Add proper error handling
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Add validation for the response format
      if (!data?.qualityOptions) {
        throw new Error("Invalid response format from server");
      }

      if (data.error) {
        setError(data.error);
      } else if (data.qualityOptions && data.qualityOptions.length > 0) {
        setQualityOptions(data.qualityOptions);
        setShowQualityOptions(true);
      } else {
        // Handle the case when no quality options are available
        setNoOptionsAvailable(true);
      }
    } catch (error) {
      console.error("Full error:", error);
      setError(`Error: ${error.message}`);
    }
    setProcessing(false);
  };

  const handleDownload = async (formatId) => {
    setSelectedQuality(formatId);
    setProcessing(true);
    setError("");
    setDownloadLink("");
    setIsDownloadReady(false);

    // Store the selected quality label
    const selectedOption = qualityOptions.find(
      (opt) => opt.format_id === formatId
    );
    setSelectedQualityLabel(selectedOption?.label || "");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, formatId }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.downloadUrl) {
        setDownloadLink(data.downloadUrl);
        setIsDownloadReady(true); // Ready immediately when URL is received
      } else {
        setError("No download URL returned");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(`Error: ${error.message}`);
    }
    setProcessing(false);
  };

  // Modified download click handler using a download count:
  // - First attempt (downloadCount === 0): Free download (no affiliate)
  // - Second attempt (downloadCount === 1): Affiliate redirect activates, then resets.
  // In both cases, we increment the global conversion count.
  const handleDownloadClick = async (e) => {
    e.preventDefault();
    if (downloadCount === 0) {
      // Free download on first attempt
      const link = document.createElement("a");
      link.href = downloadLink;
      link.download = "video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      localStorage.setItem("downloadCount", "1");
      setDownloadCount(1);

      await incrementGlobalConversionCount();

      window.location.href = "/success";
    } else {
      // Affiliate redirect on second (or subsequent) attempt
      const affiliateLink = localStorage.getItem("affiliateLink");
      window.open(affiliateLink, "_blank");

      localStorage.setItem("downloadCount", "0");
      setDownloadCount(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && url && !processing) {
      handleGetFormats();
    }
  };

  return (
    <div className={`min-h-screen relative bg-neutral-950 ${inter.className}`}>
      {/* Background with darker overlay */}
      <div className="absolute inset-0">
        <BackgroundPaths title="" />
        <div className="absolute inset-0 bg-black/80" /> {/* Darker overlay */}
      </div>

      {/* Content */}
      <div className="relative z-20 flex flex-col min-h-screen pt-20">
        {/* Main Container */}
        <div className="w-full max-w-3xl mx-auto px-8">
          {/* Announcement Header */}
          <div className="fixed top-0 left-0 w-full bg-white text-black py-2 z-50 opacity-[70%]">
            <p className="text-center text-xs font-medium">
              Announcement: Scheduled maintenance daily from 6:00 AM to 7:00 AM.
              Downloads may be temporarily unavailable.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-12 mb-8">
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-white">
              YouTube Downloader
            </h1>
            {/* Global Conversion Counter */}
            <p className="text-center text-white mt-4">
              Total Converted Videos: {globalConversionCount}
            </p>

            {/* Input Section */}
            <div className="relative w-full">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter YouTube URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 pe-24"
              />
              {url && (
                <button
                  className="absolute inset-y-0 end-12 flex h-full w-9 items-center justify-center text-white/80 hover:text-white"
                  onClick={handleClearInput}
                  aria-label="Clear input"
                >
                  <CircleX size={18} />
                </button>
              )}
              <button
                onClick={handleGetFormats}
                disabled={processing || !url}
                className="absolute inset-y-0 end-0 flex h-full w-12 items-center justify-center bg-white hover:bg-white/90 disabled:opacity-50 disabled:hover:bg-white rounded-r-lg transition-colors"
              >
                {processing ? (
                  <Loader2
                    size={20}
                    className="animate-spin text-neutral-950"
                  />
                ) : (
                  <Search size={20} className="text-neutral-950" />
                )}
              </button>
            </div>
          </div>

          {/* Results Container */}
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* New "Fetching video quality" message */}
            {processing && !selectedQuality && !error && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400">
                Fetching video quality, please wait a minute...
              </div>
            )}

            {/* No Options Available Message */}
            {noOptionsAvailable && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                This video currently does not have a download link. Please try
                again tomorrow.
              </div>
            )}

            {showQualityOptions && qualityOptions.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Available Quality Options:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {qualityOptions.map((option) => {
                    const isSelected = selectedQuality === option.format_id;
                    const isProcessing = processing && isSelected;

                    return (
                      <button
                        key={option.format_id}
                        onClick={() => handleDownload(option.format_id)}
                        disabled={processing}
                        className={`p-4 border rounded-lg text-white transition-all ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span className="text-sm font-medium flex items-center justify-between">
                          {option.label}
                          {isProcessing && (
                            <Loader2 size={16} className="animate-spin ml-2" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Processing Message */}
            {processing && selectedQuality && (
              <div className="p-4 border rounded-lg text-white bg-red-500/20 border-red-500/50 transition-all">
                <span className="text-sm font-medium flex items-center justify-center gap-3">
                  <Loader2 size={16} className="animate-spin" />
                  Processing your video, please wait a few minutes...
                </span>
              </div>
            )}

            {downloadLink && isDownloadReady && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white mb-4">
                  Your video is ready to download{" "}
                  {selectedQualityLabel ? `(${selectedQualityLabel})` : ""}:
                </p>
                <button
                  onClick={handleDownloadClick}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600/90 hover:bg-emerald-600 
                  text-white rounded-lg transition-all gap-2 font-medium border border-emerald-500/50 
                  shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:scale-[1.02]"
                >
                  <Download size={18} className="animate-bounce" />
                  Download Video
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
