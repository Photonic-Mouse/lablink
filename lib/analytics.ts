import { BookingRequest, Equipment, Student } from "./seed";
import { db } from "./db";

export interface LabAnalyticsSummary {
  totalEquipment: number;
  availableEquipment: number;
  maintenanceEquipment: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  waitlistedBookings: number;
  approvalRate: number;
  averageScore: number;
}

export interface DepartmentUtilization {
  dept: string;
  equipmentCount: number;
  bookingCount: number;
  totalHours: number;
}

export interface ProjectTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export function getSummaryAnalytics(): LabAnalyticsSummary {
  const { equipment, bookings } = db;
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter((e) => e.status === "available").length;
  const maintenanceEquipment = equipment.filter((e) => e.status === "maintenance").length;

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const approvedBookings = bookings.filter((b) => b.status === "approved").length;
  const rejectedBookings = bookings.filter((b) => b.status === "rejected").length;
  const waitlistedBookings = bookings.filter((b) => b.status === "waitlisted").length;

  const decidedBookings = approvedBookings + rejectedBookings;
  const approvalRate = decidedBookings > 0 ? Math.round((approvedBookings / decidedBookings) * 100) : 0;

  const scores = bookings.map((b) => b.score).filter((s): s is number => typeof s === "number");
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    totalEquipment,
    availableEquipment,
    maintenanceEquipment,
    totalBookings,
    pendingBookings,
    approvedBookings,
    rejectedBookings,
    waitlistedBookings,
    approvalRate,
    averageScore,
  };
}

export function getDepartmentUtilization(): DepartmentUtilization[] {
  const { equipment, bookings } = db;
  const depts = Array.from(new Set(equipment.map((e) => e.dept)));

  return depts.map((dept) => {
    const deptEquipment = equipment.filter((e) => e.dept === dept);
    const eqIds = new Set(deptEquipment.map((e) => e.id));
    const deptBookings = bookings.filter((b) => b.equipmentIds.some((id) => eqIds.has(id)));
    const totalHours = deptBookings.length * 3;

    return {
      dept,
      equipmentCount: deptEquipment.length,
      bookingCount: deptBookings.length,
      totalHours,
    };
  });
}

export function getProjectTypeBreakdown(): ProjectTypeBreakdown[] {
  const { bookings } = db;
  const total = bookings.length;
  if (total === 0) return [];

  const types: Record<string, number> = {};
  bookings.forEach((b) => {
    types[b.projectType] = (types[b.projectType] || 0) + 1;
  });

  return Object.entries(types).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

export function getFairnessIndex(): { averageMonthlyUsage: number; lowUsageBonusEligible: number } {
  const { students } = db;
  if (students.length === 0) return { averageMonthlyUsage: 0, lowUsageBonusEligible: 0 };

  const totalUsage = students.reduce((acc, s) => acc + s.usageHoursLast30d, 0);
  const avg = Math.round(totalUsage / students.length);
  const eligible = students.filter((s) => s.usageHoursLast30d < avg).length;

  return {
    averageMonthlyUsage: avg,
    lowUsageBonusEligible: eligible,
  };
}
