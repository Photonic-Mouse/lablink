import { BookingRequest, Notification } from "./seed";
import { db } from "./db";

export type AvailabilityEvent = "cancelled" | "rejected" | "finished" | "maintenance-cleared";

export function createNotification(toUserId: string, text: string, details: Partial<Notification> = {}): Notification {
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toUserId,
    text,
    at: new Date().toISOString(),
    read: false,
    ...details,
  };
  db.notifications = [notification, ...db.notifications];
  return notification;
}

export function notifyBookingSubmitted(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Booking submitted for ${booking.projectTitle}. Automated priority score: ${booking.score ?? "pending"}. Placed in faculty queue.`,
    { type: "booking", link: "/#orders" }
  );
}

export function notifyBookingApproved(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Slot approved! Your booking for ${booking.equipmentNames?.[0] || booking.equipmentIds[0]} on ${booking.slotStart} was approved by ${booking.decidedBy || "Faculty Chair"}.`,
    { type: "booking", link: "/#orders" }
  );
}

export function notifyBookingRejected(booking: BookingRequest, reason?: string): Notification {
  return createNotification(
    booking.studentId,
    `Booking request rejected for ${booking.projectTitle}. ${reason || booking.overrideNote || "Faculty prioritized impending thesis capstones."}`,
    { type: "booking", link: "/#orders" }
  );
}

export function notifyWaitlistPromoted(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Oscilloscope is now available for your requested slot, confirm within 24 hours.`,
    { type: "availability", link: "/#orders", actionLabel: "CONFIRM", actionBookingId: booking.id }
  );
}

export function notifyTrainingReminder(studentId: string, trainingName: string): Notification {
  return createNotification(
    studentId,
    `Action required: Safety certification "${trainingName}" is required before your scheduled lab booking.`
  );
}

export function notifyAvailabilityFreed(
  equipmentId: string,
  event: AvailabilityEvent,
  savedStudentIds: string[] = []
): { promoted: BookingRequest | null; notifications: Notification[] } {
  const item = db.equipment.find((equipment) => equipment.id === equipmentId);
  if (!item) return { promoted: null, notifications: [] };
  const slotSource = db.bookings.find((booking) => booking.equipmentIds.includes(equipmentId) && booking.slotStart);
  const candidate = db.bookings
    .filter((booking) => booking.equipmentIds.includes(equipmentId) && booking.status === "waitlisted")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] || null;
  const created: Notification[] = [];
  if (candidate) {
    candidate.status = "approved";
    candidate.decidedBy = "Availability Queue Balancer";
    if (slotSource) { candidate.slotStart = slotSource.slotStart; candidate.slotEnd = slotSource.slotEnd; }
    created.push(notifyWaitlistPromoted(candidate));
  }
  const nextName = candidate?.studentName || "no one";
  created.push(createNotification(item.ownerFacultyId, `Slot freed on ${item.name}, next in line is ${nextName}.`, { type: "availability", link: "/#faculty-queue" }));
  created.push(createNotification("admin-001", `Slot freed on ${item.name}, next in line is ${nextName}.`, { type: "availability", link: "/#faculty-queue" }));
  savedStudentIds.filter((id) => id !== candidate?.studentId).forEach((studentId) => {
    created.push(createNotification(studentId, `${item.name} is available again and is saved in your kit.`, { type: "availability", link: "/#kit" }));
  });
  if (!candidate && event === "maintenance-cleared") {
    created.push(createNotification("admin-001", `${item.name} is back from maintenance and available to reserve.`, { type: "availability", link: "/#catalog" }));
  }
  return { promoted: candidate, notifications: created };
}

export function getUserNotifications(userId: string): Notification[] {
  return db.notifications.filter((n) => n.toUserId === userId);
}

export function markNotificationAsRead(id: string): void {
  db.notifications = db.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
}

export function clearUserNotifications(userId: string): void {
  db.notifications = db.notifications.filter((n) => n.toUserId !== userId);
}
