import { BookingRequest, Notification } from "./seed";
import { db } from "./db";

export function createNotification(toUserId: string, text: string): Notification {
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    toUserId,
    text,
    at: new Date().toISOString(),
    read: false,
  };
  db.notifications = [notification, ...db.notifications];
  return notification;
}

export function notifyBookingSubmitted(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Booking submitted for ${booking.projectTitle}. Automated priority score: ${booking.score ?? "pending"}. Placed in faculty queue.`
  );
}

export function notifyBookingApproved(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Slot approved! Your booking for ${booking.equipmentNames?.[0] || booking.equipmentIds[0]} on ${booking.slotStart} was approved by ${booking.decidedBy || "Faculty Chair"}.`
  );
}

export function notifyBookingRejected(booking: BookingRequest, reason?: string): Notification {
  return createNotification(
    booking.studentId,
    `Booking request rejected for ${booking.projectTitle}. ${reason || booking.overrideNote || "Faculty prioritized impending thesis capstones."}`
  );
}

export function notifyWaitlistPromoted(booking: BookingRequest): Notification {
  return createNotification(
    booking.studentId,
    `Good news! A slot opened up and your booking for ${booking.equipmentNames?.[0] || booking.equipmentIds[0]} has been promoted from the waitlist.`
  );
}

export function notifyTrainingReminder(studentId: string, trainingName: string): Notification {
  return createNotification(
    studentId,
    `Action required: Safety certification "${trainingName}" is required before your scheduled lab booking.`
  );
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
