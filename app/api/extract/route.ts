import { NextRequest, NextResponse } from "next/server";
import { generateProjectRecommendations } from "@/lib/mockLLM";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    return NextResponse.json(description ? generateProjectRecommendations(description) : { recommendations: [], skills: [], trainingRequired: [] });
  } catch {
    return NextResponse.json({ recommendations: [], skills: [], trainingRequired: [] }, { status: 400 });
  }
}
