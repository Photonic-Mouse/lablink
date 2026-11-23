import { Equipment, Student } from "./seed";

export interface TrainingModule {
  id: string;
  name: string;
  dept: string;
  durationMinutes: number;
  description: string;
  passingScore: number;
  validityMonths: number;
}

export const trainingModules: TrainingModule[] = [
  {
    id: "oscilloscope-basics",
    name: "Oscilloscope Safety & Probing Basics",
    dept: "Electronics",
    durationMinutes: 30,
    description: "Proper grounding, 10x attenuation probe compensation, and high-voltage safety limits.",
    passingScore: 80,
    validityMonths: 24,
  },
  {
    id: "soldering-safety",
    name: "PCB Soldering & Hot-Air Rework Safety",
    dept: "Electronics",
    durationMinutes: 45,
    description: "Fume extraction, lead-free soldering temperatures, ESD protection, and thermal profiling.",
    passingScore: 85,
    validityMonths: 12,
  },
  {
    id: "3d-printer-safety",
    name: "FDM & Resin 3D Printer Operation",
    dept: "Mechanical",
    durationMinutes: 40,
    description: "Heated bed thermal runaway prevention, filament loading, resin IPA wash and UV curing PPE.",
    passingScore: 85,
    validityMonths: 12,
  },
  {
    id: "machine-shop",
    name: "Machine Shop Safety & CNC Mill Protocol",
    dept: "Mechanical",
    durationMinutes: 90,
    description: "Spindle safety, emergency stop procedures, feed/speed calculations, eye and ear protection.",
    passingScore: 90,
    validityMonths: 12,
  },
  {
    id: "materials-testing",
    name: "Universal Testing Machine & Extensometer Rigging",
    dept: "Mechanical",
    durationMinutes: 60,
    description: "Load cell safety calibration, crosshead travel limits, specimen shattering containment.",
    passingScore: 85,
    validityMonths: 24,
  },
  {
    id: "laser-safety",
    name: "CO2 Laser Cutter Certification",
    dept: "Mechanical",
    durationMinutes: 60,
    description: "Class 4 laser hazard zones, forbidden materials (PVC, vinyl), honeycomb bed fire suppression.",
    passingScore: 95,
    validityMonths: 12,
  },
  {
    id: "chemical-safety",
    name: "General Chemical Safety & Fume Hood Protocol",
    dept: "Chemistry",
    durationMinutes: 60,
    description: "MSDS/SDS interpretation, secondary containment, solvent disposal, sash height velocity monitoring.",
    passingScore: 90,
    validityMonths: 12,
  },
  {
    id: "centrifuge-safety",
    name: "High-Speed Centrifuge Rotor Balancing",
    dept: "Chemistry",
    durationMinutes: 30,
    description: "Mass-matched tube counterbalancing, vacuum seal inspection, rotor fatigue limits.",
    passingScore: 90,
    validityMonths: 24,
  },
  {
    id: "biosafety-cabinet",
    name: "Class II Biosafety & Aseptic Technique",
    dept: "Biotech",
    durationMinutes: 60,
    description: "Laminar airflow patterns, HEPA filter integrity, BSL-2 biological containment, waste autoclaving.",
    passingScore: 95,
    validityMonths: 12,
  },
  {
    id: "molecular-biology",
    name: "Molecular Biology & Thermal Cycler Operation",
    dept: "Biotech",
    durationMinutes: 45,
    description: "Nuclease-free workflows, fluorescent dye handling, sample plate sealing.",
    passingScore: 85,
    validityMonths: 24,
  },
  {
    id: "flow-cytometry",
    name: "Laser Flow Cytometer Alignment & Fluidics",
    dept: "Biotech",
    durationMinutes: 75,
    description: "Laser safety, sheath fluid replenishment, clog prevention, calibration bead runs.",
    passingScore: 90,
    validityMonths: 12,
  },
  {
    id: "robotics-safety",
    name: "Autonomous Mobile Robot Cell Boundary Safety",
    dept: "Computer Science",
    durationMinutes: 45,
    description: "E-stop boundary configuration, LiDAR blinding avoidance, high-torque collaborative limits.",
    passingScore: 85,
    validityMonths: 24,
  },
  {
    id: "high-voltage",
    name: "High-Voltage & Power Electronics Safety",
    dept: "Electronics",
    durationMinutes: 60,
    description: "DC bus capacitor discharge verification, isolation transformers, current limit interlocks.",
    passingScore: 95,
    validityMonths: 12,
  },
];

export function hasRequiredTraining(student: Student, equipment: Equipment): boolean {
  if (!equipment.trainingRequired) return true;
  return student.certs.includes(equipment.trainingRequired);
}

export function getRequiredTrainingModule(equipment: Equipment): TrainingModule | undefined {
  if (!equipment.trainingRequired) return undefined;
  return trainingModules.find((m) => m.id === equipment.trainingRequired);
}

export function grantTrainingCertification(student: Student, moduleId: string): Student {
  if (student.certs.includes(moduleId)) return student;
  return {
    ...student,
    certs: [...student.certs, moduleId],
  };
}
