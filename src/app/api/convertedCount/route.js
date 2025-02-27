// app/api/convertedCount/route.js
import { NextResponse } from "next/server";
import { getGlobalCount } from "../countStore";

export async function GET(request) {
  const count = getGlobalCount();
  return NextResponse.json({ count });
}
