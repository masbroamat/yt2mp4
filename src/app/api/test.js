// pages/api/test.js (for Pages Router)
export default function handler(req, res) {
  res.status(200).json({ message: "API route is working" });
}

// OR

// app/api/test/route.js (for App Router)
// import { NextResponse } from "next/server";

// export async function GET() {
//   return NextResponse.json({ message: "API route is working" });
// }
