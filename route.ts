import { NextResponse } from "next/server";
import { processChunk } from "../../../agents/pipeline";

export const maxDuration = 60; // Vercel Hobby limit -> client sends 3 scenes per call
export async function POST(req: Request) {
  const { scenes } = await req.json();
  return NextResponse.json({ scenes: await processChunk(scenes) });
}
