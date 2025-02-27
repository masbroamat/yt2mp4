// app/api/cleanup/route.js
import { NextResponse } from "next/server";
import { cleanupOldFiles } from "../../../lib/fileCleanup";

// This route can be called by a cron job scheduler like Vercel Cron
export async function GET() {
  try {
    cleanupOldFiles();
    return NextResponse.json({ status: "Cleanup completed successfully" });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: "Error during cleanup: " + error.message },
      { status: 500 }
    );
  }
}