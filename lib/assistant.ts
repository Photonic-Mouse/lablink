import { BookingRequest, Equipment, Factors, Weights } from "./seed";
import { db } from "./db";
import { calculateScore, defaultWeights } from "./seed";
import { explainBooking } from "./mockLLM";

export interface AssistantExplanation {
  summary: string;
  keyDrivers: string[];
  recommendation: "approve" | "waitlist" | "review";
  score: number;
}

export async function generateBookingExplanation(
  request: BookingRequest,
  weights: Weights = defaultWeights
): Promise<AssistantExplanation> {
  const factors: Factors = request.factors || {
    deadline: 75,
    relevance: 80,
    fairness: 80,
    academic: request.projectType === "thesis" ? 95 : 75,
    waiting: 70,
  };

  const calculated = calculateScore(factors, weights);
  const drivers: string[] = [];

  if (factors.deadline >= 90) {
    drivers.push("Urgent impending deadline within 5 days.");
  }
  if (factors.academic >= 90) {
    drivers.push("High priority senior capstone / graduation thesis.");
  }
  if (factors.fairness >= 85) {
    drivers.push("Low recent equipment usage (fairness bonus granted).");
  } else if (factors.fairness <= 70) {
    drivers.push("High recent usage this month slightly moderates score.");
  }
  if (factors.relevance >= 90) {
    drivers.push("Direct alignment with faculty-sponsored research grant.");
  }

  let recommendation: "approve" | "waitlist" | "review" = "review";
  if (calculated >= 88) {
    recommendation = "approve";
  } else if (calculated < 70) {
    recommendation = "waitlist";
  }

  const mock = await explainBooking();

  return {
    summary:
      drivers.length > 0
        ? `Automated evaluation: ${drivers.join(" ")} Overall priority index: ${calculated}/100.`
        : mock.explanation,
    keyDrivers: drivers,
    recommendation,
    score: calculated,
  };
}

export function findAlternativeEquipment(targetEquipmentId: string): Equipment[] {
  const target = db.equipment.find((e) => e.id === targetEquipmentId);
  if (!target) return [];

  return db.equipment.filter(
    (e) =>
      e.id !== target.id &&
      (e.category === target.category || e.dept === target.dept) &&
      e.status === "available"
  );
}

export function suggestAlternativeSlots(equipmentId: string, preferredDate: string): string[] {
  return [
    `${preferredDate} 09:00 - 12:00 (Morning Slot - Low Demand)`,
    `${preferredDate} 13:00 - 16:00 (Afternoon Slot)`,
    `${preferredDate} 17:00 - 20:00 (Evening Slot - High Bandwidth)`,
  ];
}
