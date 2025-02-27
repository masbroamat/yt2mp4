// src/app/success/page.js
"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Squares } from "@/components/ui/squares-background";

const affiliateLinks = [
  "https://s.shopee.com.my/6pmBySHJHe",
  "https://s.shopee.com.my/3Astbhs9W6",
  "https://s.shopee.com.my/7fLIy3KdM2",
  "https://s.shopee.com.my/6AWVBJPwLy",
  "https://s.shopee.com.my/1qNW1MYOzg",
  "https://s.shopee.com.my/7KiSZTytlq",
  "https://s.shopee.com.my/9Umx9TiPRB",
  "https://s.shopee.com.my/1VkfcmurUe",
  "https://s.shopee.com.my/7V1slp6Be5",
  "https://s.shopee.com.my/vrq380O3",
];

export default function SuccessPage() {
  const router = useRouter();

  const resetAffiliateCycle = () => {
    const randomLink = affiliateLinks[Math.floor(Math.random() * affiliateLinks.length)];
    localStorage.setItem("affiliateLink", randomLink);   
  };

  const handleConvertAnotherVideo = () => {
    resetAffiliateCycle();
    router.push("/");
  };

  return (
    <div className="min-h-screen relative bg-[#060606]">
      {/* Background squares */}
      <div className="fixed inset-0 z-0">
        <Squares 
          direction="diagonal"
          speed={0.5}
          squareSize={40}
          borderColor="#333" 
          hoverFillColor="#222"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-6 max-w-xl mx-auto">
          <div className="bg-green-500/10 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-green-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Download Successful!</h1>
          <p className="text-white/70 text-lg">
            Your video has been downloaded successfully. Would you like to convert another video?
          </p>
          <button
            onClick={handleConvertAnotherVideo}
            className="flex items-center justify-center h-12 px-6 bg-white hover:bg-white/90 text-neutral-950 rounded-lg transition-colors mt-6 font-medium mx-auto"
          >
            <RefreshCw size={20} className="mr-2" />
            Convert Another Video
          </button>
        </div>
      </div>
    </div>
  );
}
