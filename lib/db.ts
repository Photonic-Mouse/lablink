import { BookingRequest, Equipment, Notification, Student } from "./seed";
import { equipment, students, initialBookings, initialNotifications } from "./seed";

export interface LabDatabase {
  equipment: Equipment[];
  students: Student[];
  bookings: BookingRequest[];
  notifications: Notification[];
}

export const db: LabDatabase = {
  equipment: equipment.map((item) => ({
    ...item,
    specs: { ...item.specs },
    tags: [...item.tags],
  })),
  students: [...students],
  bookings: [...initialBookings],
  notifications: [...initialNotifications],
};

export function resetDb(): LabDatabase {
  db.equipment = equipment.map((item) => ({
    ...item,
    specs: { ...item.specs },
    tags: [...item.tags],
  }));
  db.students = [];
  db.bookings = [];
  db.notifications = [];
  return db;
}

export function resetDemo(): LabDatabase {
  db.equipment = equipment.map((item) => ({
    ...item,
    specs: { ...item.specs },
    tags: [...item.tags],
  }));
  db.students = students.map((s: Student) => ({ ...s, certs: [...s.certs] }));
  db.bookings = initialBookings.map((b: BookingRequest) => ({
    ...b,
    equipmentIds: [...b.equipmentIds],
    equipmentNames: b.equipmentNames ? [...b.equipmentNames] : undefined,
    factors: b.factors ? { ...b.factors } : undefined,
  }));
  db.notifications = initialNotifications.map((n: Notification) => ({ ...n }));
  return db;
}

export function addNotification(toUserId: string, text: string): Notification {
  const notification: Notification = {
    id: `ntf-${db.notifications.length + 1}`,
    toUserId,
    text,
    at: new Date().toISOString(),
    read: false,
  };
  db.notifications = [notification, ...db.notifications];
  return notification;
}
