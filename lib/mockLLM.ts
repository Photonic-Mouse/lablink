import { equipment, Equipment } from "@/lib/seed";

export interface MockLlmResult {
  explanation: string;
  score: number;
}

export interface EquipmentRecommendation {
  equipment: Equipment;
  reason: string;
  estimatedHours: number;
  quantity: number;
}

export interface ProjectExtractionResult {
  recommendations: EquipmentRecommendation[];
  skills: string[];
  trainingRequired: string[];
}

export async function explainBooking(): Promise<MockLlmResult> {
  return {
    explanation:
      "Mock LLM fallback: deterministic explanation generated without a provider.",
    score: 0,
  };
}

export function generateProjectRecommendations(description: string): ProjectExtractionResult {
  const query = description.toLowerCase();
  const terms = query.split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const scored = equipment.map((item) => {
    const haystack = [item.name, item.dept, item.category, item.description, ...item.tags, ...Object.values(item.specs)].join(" ").toLowerCase();
    return { item, score: terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) };
  });
  const matches = scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const recommendations = matches.map(({ item }) => ({ equipment: item, reason: `Useful for ${item.category.toLowerCase()} work: ${item.description.toLowerCase()}`, estimatedHours: item.category.toLowerCase().includes("testing") ? 6 : 4, quantity: 1 }));
  const skills = ["experimental planning", ...["electronics", "programming", "data analysis", "fabrication", "cell culture"].filter((skill) => query.includes(skill.split(" ")[0]))];
  const trainingRequired = Array.from(new Set(recommendations.map(({ equipment: item }) => item.trainingRequired).filter((value): value is string => Boolean(value))));
  return { recommendations, skills: Array.from(new Set(skills)), trainingRequired };
}
