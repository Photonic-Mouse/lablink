import { NextRequest, NextResponse } from "next/server";
import { equipment } from "@/lib/seed";
import { EquipmentRecommendation, generateProjectRecommendations, ProjectExtractionResult } from "@/lib/mockLLM";

const emptyResult: ProjectExtractionResult = { recommendations: [], skills: [], trainingRequired: [] };

async function extractWithGemini(description: string): Promise<ProjectExtractionResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const catalogue = equipment.map((item) => ({
    id: item.id,
    name: item.name,
    department: item.dept,
    category: item.category,
    tags: item.tags,
    trainingRequired: item.trainingRequired,
  }));
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `You are a university lab equipment planner. Return only equipment from this catalogue. Analyze the project and recommend the smallest useful kit. Project:\n${description}\n\nCatalogue:\n${JSON.stringify(catalogue)}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            recommendations: { type: "array", items: { type: "object", properties: { equipmentId: { type: "string" }, reason: { type: "string" }, estimatedHours: { type: "integer" }, quantity: { type: "integer" } }, required: ["equipmentId", "reason", "estimatedHours", "quantity"] } },
            skills: { type: "array", items: { type: "string" } },
            trainingRequired: { type: "array", items: { type: "string" } },
          },
          required: ["recommendations", "skills", "trainingRequired"],
        },
      },
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = JSON.parse(text) as { recommendations?: Array<{ equipmentId: string; reason: string; estimatedHours: number; quantity: number }>; skills?: string[]; trainingRequired?: string[] };
  const recommendations: EquipmentRecommendation[] = (parsed.recommendations || []).flatMap((recommendation) => {
    const item = equipment.find((entry) => entry.id === recommendation.equipmentId);
    return item ? [{ equipment: item, reason: recommendation.reason, estimatedHours: Math.max(1, recommendation.estimatedHours || 4), quantity: Math.max(1, recommendation.quantity || 1) }] : [];
  });
  return { recommendations, skills: parsed.skills || [], trainingRequired: parsed.trainingRequired || [] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) return NextResponse.json(emptyResult);
    try {
      const aiResult = await extractWithGemini(description);
      if (aiResult) return NextResponse.json(aiResult);
    } catch (error) {
      console.error("Gemini extraction failed; using local fallback", error instanceof Error ? error.message : "unknown error");
    }
    return NextResponse.json(generateProjectRecommendations(description));
  } catch {
    return NextResponse.json(emptyResult, { status: 400 });
  }
}
