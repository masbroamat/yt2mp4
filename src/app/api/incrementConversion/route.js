// app/api/incrementConversion/route.js
import { NextResponse } from "next/server";
import { incrementGlobalCount } from "../countStore";

export async function POST(request) {
  const newCount = incrementGlobalCount();
  return NextResponse.json({ count: newCount });
}
