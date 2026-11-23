import { BookingRequest, Weights } from "./seed";
import { calculateScore, defaultWeights } from "./seed";
import { db } from "./db";
import { notifyWaitlistPromoted } from "./notifications";

export function getWaitlistForEquipment(equipmentId: string): BookingRequest[] {
  return db.bookings
    .filter((b) => b.equipmentIds.includes(equipmentId) && b.status === "waitlisted")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function getWaitlistPosition(bookingId: string, equipmentId: string): number {
  const list = getWaitlistForEquipment(equipmentId);
  const index = list.findIndex((b) => b.id === bookingId);
  return index >= 0 ? index + 1 : -1;
}

export function addToWaitlist(booking: BookingRequest): BookingRequest {
  const updatedBooking: BookingRequest = {
    ...booking,
    status: "waitlisted",
  };
  
  const existingIndex = db.bookings.findIndex((b) => b.id === booking.id);
  if (existingIndex >= 0) {
    db.bookings[existingIndex] = updatedBooking;
  } else {
    db.bookings.push(updatedBooking);
  }
  return updatedBooking;
}

export function promoteNextInWaitlist(
  equipmentId: string,
  slotStart: string,
  slotEnd: string
): BookingRequest | null {
  const waitlist = getWaitlistForEquipment(equipmentId);
  if (waitlist.length === 0) return null;

  const candidate = waitlist.find(
    (b) => b.slotStart === slotStart || !b.slotStart
  ) || waitlist[0];

  candidate.status = "approved";
  candidate.slotStart = slotStart;
  candidate.slotEnd = slotEnd;
  candidate.decidedBy = "Autonomous Queue Balancer";

  notifyWaitlistPromoted(candidate);
  return candidate;
}

export function reorderWaitlist(equipmentId: string, customWeights?: Weights): BookingRequest[] {
  const weights = customWeights || defaultWeights;
  const list = getWaitlistForEquipment(equipmentId);

  list.forEach((b) => {
    if (b.factors) {
      b.score = calculateScore(b.factors, weights);
    }
  });

  return list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
