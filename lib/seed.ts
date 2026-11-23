export type Role = "student" | "faculty" | "admin";

export type EquipmentStatus = "available" | "maintenance" | "reserved";

export type ProjectType = "thesis" | "course" | "research" | "club" | "hobby";

export type BookingStatus = "pending" | "approved" | "rejected" | "waitlisted";

export interface Equipment {
  id: string;
  name: string;
  dept: string;
  lab: string;
  building: string;
  category: string;
  description: string;
  specs: Record<string, string>;
  tags: string[];
  trainingRequired: string | null;
  status: EquipmentStatus;
  ownerFacultyId: string;
  imageEmoji: string;
  imageUrl?: string;
  hourlyRate?: string;
  maxBookingHours?: number;
}

export interface Student {
  id: string;
  name: string;
  dept: string;
  year: number;
  certs: string[];
  usageHoursLast30d: number;
  noShows: number;
  avatarUrl?: string;
}

export interface Factors {
  deadline: number;
  relevance: number;
  fairness: number;
  academic: number;
  waiting: number;
}

export interface Weights {
  deadline: number;
  relevance: number;
  fairness: number;
  academic: number;
  waiting: number;
}

export interface BookingRequest {
  id: string;
  studentId: string;
  studentName?: string;
  studentDept?: string;
  studentYear?: number;
  equipmentIds: string[];
  equipmentNames?: string[];
  slotStart: string;
  slotEnd: string;
  projectTitle: string;
  projectType: ProjectType;
  projectSummary: string;
  deadline: string;
  createdAt: string;
  status: BookingStatus;
  score?: number;
  factors?: Factors;
  explanation?: string;
  decidedBy?: string;
  overrideNote?: string;
}

export interface Notification {
  id: string;
  toUserId: string;
  text: string;
  at: string;
  read: boolean;
}

export const defaultWeights: Weights = {
  deadline: 0.25,
  relevance: 0.25,
  fairness: 0.20,
  academic: 0.20,
  waiting: 0.10,
};

export function calculateScore(factors: Factors, weights: Weights = defaultWeights): number {
  const raw =
    factors.deadline * weights.deadline +
    factors.relevance * weights.relevance +
    factors.fairness * weights.fairness +
    factors.academic * weights.academic +
    factors.waiting * weights.waiting;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

const e = (
  id: string,
  name: string,
  dept: string,
  lab: string,
  building: string,
  category: string,
  description: string,
  specs: Record<string, string>,
  tags: string[],
  trainingRequired: string | null,
  status: "available" | "maintenance",
  ownerFacultyId: string,
  imageEmoji: string,
  imageUrl: string = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
  hourlyRate: string = "Free (Academic)",
  maxBookingHours: number = 4
): Equipment => ({
  id,
  name,
  dept,
  lab,
  building,
  category,
  description,
  specs,
  tags,
  trainingRequired,
  status,
  ownerFacultyId,
  imageEmoji,
  imageUrl,
  hourlyRate,
  maxBookingHours,
});

export const equipment: Equipment[] = [
  e("eq-001", "Digital Oscilloscope 200MHz", "Electronics", "Embedded Systems Lab", "Engineering Block A", "Test & Measurement", "Four-channel mixed-signal oscilloscope for debugging analog and digital circuits.", { bandwidth: "200 MHz", channels: "4", sampleRate: "2.5 GS/s", memory: "20 Mpts" }, ["oscilloscope", "electronics", "signals", "debugging", "embedded", "mixed-signal", "benchtop"], "oscilloscope-basics", "available", "fac-001", "📈", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-002", "Arbitrary Waveform Generator", "Electronics", "Embedded Systems Lab", "Engineering Block A", "Signal Generation", "Dual-channel generator for repeatable sine, square, pulse, and arbitrary waveforms.", { frequencyRange: "1 µHz–25 MHz", channels: "2", amplitude: "10 Vpp", memory: "16 Mpts" }, ["waveform", "function-generator", "electronics", "signals", "testing", "frequency"], null, "available", "fac-001", "〰️", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-003", "PCB Rework Station", "Electronics", "Prototyping Studio", "Engineering Block A", "Fabrication", "Hot-air and soldering station for fine-pitch component assembly and board repair.", { temperature: "100–480 °C", airFlow: "120 L/min", tipType: "JBC-compatible", power: "150 W" }, ["soldering", "pcb", "rework", "prototyping", "electronics", "repair"], "soldering-safety", "available", "fac-001", "🔧", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-004", "Logic Analyzer", "Electronics", "Embedded Systems Lab", "Engineering Block A", "Protocol Analysis", "Protocol analyzer for timing relationships and serial-bus troubleshooting.", { channels: "16", sampleRate: "500 MS/s", input: "±10 V", protocols: "I2C, SPI, UART, CAN" }, ["logic-analyzer", "digital", "i2c", "spi", "uart", "embedded"], null, "available", "fac-001", "🔌", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-005", "Industrial 3D Rapid Prototyper", "Mechanical", "Digital Manufacturing Lab", "Engineering Block B", "Additive Fabrication", "FDM printer for rapid prototyping in carbon-fiber nylon, PETG, ABS, and flexible TPU.", { buildVolume: "300 × 300 × 400 mm", nozzle: "0.4 mm", layerHeight: "0.1–0.4 mm", materials: "CF-Nylon, PLA, PETG, TPU" }, ["3d-printing", "fdm", "prototype", "cad", "additive"], "3d-printer-safety", "available", "fac-002", "🖨️", "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80", "Material cost only", 6),
  e("eq-006", "Precision 3-Axis CNC Milling Center", "Mechanical", "Digital Manufacturing Lab", "Engineering Block B", "Subtractive Machining", "Three-axis CNC mill for precision machining of aerospace aluminum, brass, and plastics.", { axes: "3", travel: "X 500 / Y 300 / Z 300 mm", spindle: "10,000 rpm", tolerance: "±0.01 mm" }, ["cnc", "milling", "machining", "aluminum", "cad-cam", "precision"], "machine-shop", "available", "fac-002", "⚙️", "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", "$15/hr (Tooling fee)", 4),
  e("eq-007", "Universal Testing Machine", "Mechanical", "Materials Testing Lab", "Engineering Block B", "Materials Testing", "Electromechanical frame for tensile, compression, and flexural testing of specimens.", { capacity: "100 kN", speed: "0.001–500 mm/min", accuracy: "±0.5%", software: "Bluehill Universal" }, ["tensile", "compression", "materials", "stress-strain", "mechanical"], "materials-testing", "available", "fac-002", "📏", "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-008", "CO2 Laser Cutter", "Mechanical", "Digital Manufacturing Lab", "Engineering Block B", "Fabrication", "CO₂ laser cutter for acrylic enclosures, plywood, cardboard, and flat-pattern prototypes.", { power: "80 W CO₂", bed: "900 × 600 mm", maxSpeed: "600 mm/s", materials: "acrylic, plywood, delrin" }, ["laser", "cutting", "fabrication", "acrylic", "prototype"], "laser-safety", "maintenance", "fac-002", "🔥", "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80", "$10/hr", 3),
  e("eq-009", "Optical Micrometer", "Mechanical", "Metrology Lab", "Engineering Block B", "Metrology", "Non-contact dimensional measurement system for small machined features and profiles.", { range: "0–25 mm", resolution: "0.001 mm", accuracy: "±0.003 mm", illumination: "LED telecentric" }, ["metrology", "measurement", "micrometer", "optical", "precision"], null, "available", "fac-002", "🔍", "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 2),
  e("eq-010", "High-Speed Centrifuge", "Chemistry", "Analytical Chemistry Lab", "Science Block", "Sample Prep", "Benchtop centrifuge for phase separation, cell pelleting, and sample clarification.", { maxSpeed: "15,000 rpm", maxRCF: "21,130 × g", capacity: "24 × 1.5/2 mL", timer: "1–99 min" }, ["centrifuge", "separation", "sample-prep", "analytical", "chemistry"], "centrifuge-safety", "available", "fac-003", "🌀", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-011", "UV-Vis Spectrophotometer", "Chemistry", "Analytical Chemistry Lab", "Science Block", "Spectroscopy", "Single-beam spectrophotometer for absorbance and chemical concentration measurements.", { wavelength: "190–1100 nm", bandwidth: "2 nm", range: "0–200%T", cuvette: "10 mm" }, ["spectroscopy", "uv-vis", "absorbance", "chemistry", "quantification"], null, "available", "fac-003", "🌈", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-012", "Analytical Micro-Balance", "Chemistry", "Analytical Chemistry Lab", "Science Block", "Measurement", "Draft-shielded balance for high-precision reagent and analytical sample weighing.", { capacity: "220 g", readability: "0.1 mg", repeatability: "0.1 mg", calibration: "internal" }, ["balance", "weighing", "precision", "reagents", "analytical"], null, "available", "fac-003", "⚖️", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 2),
  e("eq-013", "VAV Chemical Fume Hood", "Chemistry", "Synthetic Chemistry Lab", "Science Block", "Containment", "Variable-air-volume hood for safe handling of volatile and corrosive chemicals.", { width: "1.5 m", faceVelocity: "0.5 m/s", sash: "vertical, 800 mm", certification: "annual" }, ["fume-hood", "chemical-safety", "synthesis", "ventilation"], "chemical-safety", "available", "fac-003", "🧪", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 6),
  e("eq-014", "Rotary Evaporator", "Chemistry", "Synthetic Chemistry Lab", "Science Block", "Purification", "Vacuum-assisted solvent removal with controlled flask rotation and water bath.", { flask: "5 L", bath: "20–180 °C", rotation: "20–280 rpm", vacuum: "0–1000 mbar" }, ["rotavap", "solvent", "evaporation", "vacuum", "synthesis"], "chemical-safety", "maintenance", "fac-003", "⚗️", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-015", "Gas Chromatograph-Mass Spectrometer", "Chemistry", "Instrumental Analysis Lab", "Science Block", "Analytical Chemistry", "Capillary GC coupled with quadrupole mass detector for organic compound identification.", { oven: "35–450 °C", detector: "Single Quad MS", carrierGas: "Helium", injector: "Split/Splitless" }, ["gc", "mass-spec", "chromatography", "organic", "analysis"], "chemical-safety", "available", "fac-003", "🧫", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Solvent surcharge", 4),
  e("eq-016", "NVIDIA RTX 4090 GPU Workstation", "Computer Science", "AI & Systems Lab", "Innovation Center", "High-Performance Computing", "High-memory workstation for machine learning experiments, vision, and 3D simulation.", { gpu: "2x NVIDIA RTX 4090 24 GB", cpu: "24-core AMD Ryzen 9", memory: "128 GB DDR5", storage: "4 TB NVMe" }, ["gpu", "machine-learning", "python", "cuda", "ai", "simulation"], null, "available", "fac-001", "🖥️", "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 8),
  e("eq-017", "Network Protocol Analyzer", "Computer Science", "Networks Lab", "Innovation Center", "Networking", "Managed appliance for line-rate packet capture, traffic replay, and deep protocol inspection.", { ports: "4 × 10 GbE", capture: "40 Gbps", storage: "4 TB", protocols: "TCP/IP, Wi-Fi 6E, P4" }, ["networking", "packets", "wireshark", "security", "traffic"], null, "available", "fac-001", "🌐", "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-018", "Raspberry Pi 5 Cluster", "Computer Science", "Distributed Systems Lab", "Innovation Center", "Distributed Systems", "Sixteen-node ARM cluster for distributed computing and edge kubernetes orchestration.", { nodes: "16 Raspberry Pi 5", memory: "8 GB per node", network: "1 GbE switched", os: "k3s Kubernetes" }, ["raspberry-pi", "cluster", "distributed", "kubernetes", "edge"], null, "available", "fac-001", "🍓", "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 6),
  e("eq-019", "Room-Scale VR Development Kit", "Computer Science", "HCI Lab", "Innovation Center", "Spatial Computing", "Headset, haptic controllers, and lighthouse trackers for spatial interface prototyping.", { resolution: "2160 × 2160 per eye", refreshRate: "120 Hz", tracking: "Sub-millimeter lighthouse", platform: "OpenXR / Unity" }, ["vr", "xr", "unity", "interaction", "immersive"], null, "available", "fac-001", "🥽", "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-020", "Autonomous Mobile Robotics Workcell", "Computer Science", "Autonomous Systems Lab", "Innovation Center", "Robotics & Autonomy", "Collaborative mobile-robot platform with 3D LiDAR, RGB-D vision, and onboard ROS 2.", { sensors: "32-beam LiDAR, RealSense D435", runtime: "6 hours", payload: "20 kg", os: "ROS 2 Humble" }, ["robotics", "ros2", "lidar", "navigation", "autonomy"], "robotics-safety", "available", "fac-001", "🤖", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-021", "Class II Biosafety Cabinet", "Biotech", "Cell Culture Lab", "Life Sciences Building", "Cell Culture", "Sterile containment cabinet for mammalian cell culture and low-risk biological research.", { class: "II Type A2", width: "1.5 m", airflow: "70% recirculated HEPA", cert: "NSF 49" }, ["biosafety", "cell-culture", "sterile", "tissue-culture"], "biosafety-cabinet", "available", "fac-003", "🧬", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-022", "CO2 Incubator", "Biotech", "Cell Culture Lab", "Life Sciences Building", "Incubation", "Temperature- and CO₂-controlled incubator for adherent and suspension cell cultures.", { capacity: "170 L", tempRange: "ambient +5–60 °C", co2Control: "0–20%", sensor: "IR Sensor" }, ["incubator", "cell-culture", "co2", "mammalian"], "biosafety-cabinet", "available", "fac-003", "🌡️", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 24),
  e("eq-023", "PCR Thermal Cycler", "Biotech", "Molecular Biology Lab", "Life Sciences Building", "Molecular Biology", "96-well thermal cycler for endpoint PCR and DNA amplification workflows.", { wells: "96", temperature: "4–100 °C", rampRate: "5 °C/s", uniformity: "±0.4 °C" }, ["pcr", "dna", "amplification", "genetics"], "molecular-biology", "available", "fac-003", "🧬", "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-024", "Real-Time Multiplex PCR System", "Biotech", "Molecular Biology Lab", "Life Sciences Building", "Genomics", "Quantitative qPCR system with 5-color multiplex fluorescence detection.", { wells: "96", channels: "5-color", dynamicRange: "10 logs", chemistry: "SYBR, TaqMan" }, ["qpcr", "rt-pcr", "gene-expression", "genomics"], "molecular-biology", "available", "fac-003", "📊", "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80", "Reagent surcharge", 3),
  e("eq-025", "Multimode Microplate Reader", "Biotech", "Bioprocess Lab", "Life Sciences Building", "Assays", "Multimode reader for absorbance, fluorescence intensity, and luminescence microplate assays.", { formats: "6–384 well", range: "200–1000 nm", shaking: "linear/orbital", modes: "Abs/FI/Lum" }, ["microplate", "assay", "fluorescence", "absorbance"], null, "available", "fac-003", "🧫", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-026", "Inverted Fluorescence Microscope", "Biotech", "Imaging Core Lab", "Life Sciences Building", "Optical Imaging", "Inverted microscope for live-cell imaging and multi-channel DAPI/FITC/TRITC staining.", { objectives: "4×, 10×, 20×, 40×, 100×", channels: "DAPI, FITC, TRITC", camera: "16 MP sCMOS" }, ["microscopy", "fluorescence", "imaging", "live-cell"], "molecular-biology", "available", "fac-003", "🔬", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-027", "Four-Laser Flow Cytometer", "Biotech", "Immunology Lab", "Life Sciences Building", "Cell Analysis", "Four-laser cytometer for cell counting, immunophenotyping, and sorting analysis.", { lasers: "405, 488, 561, 640 nm", parameters: "16-color", rate: "10,000 events/s" }, ["flow-cytometry", "immunology", "phenotyping", "cells"], "flow-cytometry", "available", "fac-003", "🔵", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-028", "Ultracold -80°C Biobank Freezer", "Biotech", "Biobank", "Life Sciences Building", "Cold Storage", "Ultra-low temperature freezer for long-term preservation of biological samples and enzymes.", { tempRange: "-50 to -86 °C", capacity: "570 L", backup: "CO2 injection backup" }, ["freezer", "biobank", "cold-storage", "dna"], null, "available", "fac-003", "❄️", "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 24),
  e("eq-029", "Programmable DC Electronic Load", "Electronics", "Power Electronics Lab", "Engineering Block A", "Power Systems", "High-power DC electronic load for battery discharge, converter, and PSU testing.", { maxPower: "400 W", voltageRange: "0–120 V", currentRange: "0–30 A", modes: "CC, CV, CR, CP" }, ["dc-load", "power", "battery", "testing"], "high-voltage", "available", "fac-001", "🔋", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-030", "Calibrated Thermal Imaging Camera", "Mechanical", "Thermal Systems Lab", "Engineering Block B", "Thermal Dynamics", "Long-wave infrared camera for heat transfer studies and electronic hotspot characterization.", { tempRange: "-20 to 650 °C", resolution: "320 × 240", accuracy: "±2 °C", framerate: "60 Hz" }, ["thermal", "infrared", "heat-transfer", "inspection"], null, "available", "fac-002", "🌡️", "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-031", "Heated Vacuum Drying Oven", "Chemistry", "Materials Chemistry Lab", "Science Block", "Thermal Processing", "Vacuum chamber for drying heat- and moisture-sensitive powders and polymer matrices.", { maxTemp: "200 °C", volume: "53 L", vacuumLimit: "10 mbar", shelves: "2 Aluminum" }, ["vacuum", "oven", "drying", "polymers", "materials"], "chemical-safety", "available", "fac-003", "♨️", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 6),
  e("eq-032", "Extrusion 3D Bioprinter", "Biotech", "Tissue Engineering Lab", "Life Sciences Building", "Tissue Engineering", "Three-head extrusion bioprinter for cell-laden hydrogel scaffolds and tissue constructs.", { printheads: "3 pneumatic", precision: "10 µm", bioinks: "GelMA, Alginate, Collagen" }, ["bioprinting", "hydrogel", "tissue-engineering", "cells"], "biosafety-cabinet", "available", "fac-003", "🧫", "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80", "Bioink cost only", 4),
  e("eq-033", "Subsonic Aerodynamic Wind Tunnel", "Mechanical", "Fluid Mechanics Lab", "Engineering Block B", "Aerodynamics", "Low-speed closed-circuit tunnel for airfoil drag, lift, and flow visualization.", { testSection: "300 × 300 × 600 mm", speedRange: "5–35 m/s", balance: "6-axis balance" }, ["wind-tunnel", "aerodynamics", "fluid", "drag", "lift"], "machine-shop", "available", "fac-002", "🌬️", "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-034", "FTIR Spectrometer with ATR", "Chemistry", "Instrumental Analysis Lab", "Science Block", "Spectroscopy", "FTIR spectrometer with diamond ATR crystal for polymer and organic bond identification.", { spectralRange: "4000–400 cm⁻¹", resolution: "0.4 cm⁻¹", crystal: "Single-reflection Diamond" }, ["ftir", "infrared", "spectroscopy", "polymers"], "chemical-safety", "available", "fac-003", "🌈", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-035", "500MHz RF Digital Scope", "Electronics", "Communications Lab", "Engineering Block A", "RF & Wireless", "High-speed digital oscilloscope for RF signal characterization, eye diagrams, and serial buses.", { bandwidth: "500 MHz", sampleRate: "5 GS/s", channels: "4", memory: "100 Mpts" }, ["oscilloscope", "rf", "communications", "signals"], "oscilloscope-basics", "available", "fac-001", "📡", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 4),
  e("eq-036", "Precision SLA Resin 3D Printer", "Mechanical", "Digital Manufacturing Lab", "Engineering Block B", "Additive Fabrication", "Stereolithography printer for high-precision microfluidic molds and smooth surface finish parts.", { buildVolume: "192 × 120 × 200 mm", xyResolution: "50 µm", wavelength: "405 nm UV" }, ["sla", "resin", "3d-printing", "precision"], "3d-printer-safety", "available", "fac-002", "🧱", "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80", "Resin cost billed", 4),
  e("eq-037", "Quaternary HPLC System", "Chemistry", "Pharmaceutical Lab", "Science Block", "Chromatography", "High-performance liquid chromatograph with diode array detector for purity validation.", { maxPressure: "600 bar", flowRate: "0.001–10 mL/min", detector: "DAD 190–800 nm" }, ["hplc", "chromatography", "pharmaceutical", "separation"], "chemical-safety", "available", "fac-003", "💧", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80", "Solvent cost billed", 4),
  e("eq-038", "Single-Cell Microfluidic Sequencer", "Biotech", "Genomics Core Lab", "Life Sciences Building", "Genomics", "Microfluidic barcoding station for single-cell RNA-seq library preparation.", { throughput: "8,000 cells/run", captureEfficiency: ">65%", inputCells: "500–10,000" }, ["single-cell", "rna-seq", "genomics", "transcriptomics"], "molecular-biology", "available", "fac-003", "🧬", "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80", "Cartridge cost billed", 4),
  e("eq-039", "True-RMS Benchtop Digital Multimeter", "Electronics", "Circuits Teaching Lab", "Engineering Block A", "Measurement", "6.5-digit precision benchtop multimeter with data logging and four-wire resistance sensing.", { dcVoltage: "1000 V", currentRange: "10 A", accuracy: "0.0035%", digits: "6.5 Digits" }, ["multimeter", "voltage", "resistance", "calibration"], null, "available", "fac-001", "🔢", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
  e("eq-040", "Desktop 3-Axis CNC Router", "Mechanical", "Student Fabrication Lab", "Engineering Block B", "Subtractive Machining", "Compact CNC router for soft aluminum, wood, foam, and PCB isolation milling.", { workArea: "600 × 400 × 80 mm", spindlePower: "800 W", maxRpm: "24,000 rpm" }, ["cnc", "router", "prototyping", "wood", "aluminum"], "machine-shop", "available", "fac-002", "🛠️", "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", "Free (Academic)", 3),
];

export const equipmentList: Equipment[] = equipment;

export const students: Student[] = [
  { id: "stu-001", name: "Maya Lin", dept: "Computer Science", year: 4, certs: ["robotics-safety"], usageHoursLast30d: 6, noShows: 0 },
  { id: "stu-004", name: "Devon Chen", dept: "Electronics", year: 3, certs: ["oscilloscope-basics", "soldering-safety"], usageHoursLast30d: 12, noShows: 0 },
  { id: "stu-009", name: "Amira Patel", dept: "Biotech", year: 4, certs: ["biosafety-cabinet", "molecular-biology"], usageHoursLast30d: 8, noShows: 0 },
  { id: "stu-012", name: "Marcus Vance", dept: "Mechanical", year: 2, certs: ["3d-printer-safety", "machine-shop"], usageHoursLast30d: 18, noShows: 1 },
  { id: "stu-015", name: "Elena Rostova", dept: "Computer Science", year: 3, certs: ["robotics-safety"], usageHoursLast30d: 14, noShows: 0 },
  { id: "stu-019", name: "Kai Tanaka", dept: "Chemistry", year: 4, certs: ["chemical-safety", "centrifuge-safety"], usageHoursLast30d: 5, noShows: 0 },
];

export const initialBookings: BookingRequest[] = [
  {
    id: "req-101",
    studentId: "stu-001",
    studentName: "Maya Lin",
    studentDept: "Computer Science",
    studentYear: 4,
    equipmentIds: ["eq-016"],
    equipmentNames: ["NVIDIA RTX 4090 GPU Workstation"],
    slotStart: "2026-11-24 14:00",
    slotEnd: "2026-11-24 18:00",
    projectTitle: "Autonomous Drone Visual Odometry under Low-Light",
    projectType: "thesis",
    projectSummary: "Senior capstone thesis benchmarking sparse optical flow against neural odometry on embedded edge hardware.",
    deadline: "2026-11-28 (4 days)",
    createdAt: "2026-11-22 09:30",
    status: "pending",
    score: 93,
    factors: { deadline: 96, relevance: 95, fairness: 88, academic: 98, waiting: 82 },
    explanation: "Graduating senior with impending thesis defense deadline. Low prior GPU usage this month (6h). Highest academic weighting.",
  },
  {
    id: "req-102",
    studentId: "stu-004",
    studentName: "Devon Chen",
    studentDept: "Electronics",
    studentYear: 3,
    equipmentIds: ["eq-001"],
    equipmentNames: ["Digital Oscilloscope 200MHz"],
    slotStart: "2026-11-24 10:00",
    slotEnd: "2026-11-24 13:00",
    projectTitle: "Low-Noise Biosensor Front-End Preamp Validation",
    projectType: "research",
    projectSummary: "Undergraduate research project validating sub-microvolt signal integrity for non-invasive glucose monitor.",
    deadline: "2026-12-05 (12 days)",
    createdAt: "2026-11-21 16:15",
    status: "pending",
    score: 84,
    factors: { deadline: 75, relevance: 90, fairness: 92, academic: 85, waiting: 85 },
    explanation: "High alignment with faculty research grant. Zero past no-shows. High fairness score with certified prerequisite.",
  },
  {
    id: "req-103",
    studentId: "stu-009",
    studentName: "Amira Patel",
    studentDept: "Biotech",
    studentYear: 4,
    equipmentIds: ["eq-026"],
    equipmentNames: ["Inverted Fluorescence Microscope"],
    slotStart: "2026-11-25 09:00",
    slotEnd: "2026-11-25 12:00",
    projectTitle: "CRISPR-Edited HeLa Cell Viability Assay",
    projectType: "thesis",
    projectSummary: "Live-cell stained fluorescence time-lapse imaging of membrane permeability post electroporation.",
    deadline: "2026-11-29 (5 days)",
    createdAt: "2026-11-22 11:00",
    status: "pending",
    score: 89,
    factors: { deadline: 92, relevance: 94, fairness: 78, academic: 95, waiting: 80 },
    explanation: "Urgent cell viability window (live cultures expire within 48h). High priority senior capstone with safety clearance.",
  },
  {
    id: "req-104",
    studentId: "stu-012",
    studentName: "Marcus Vance",
    studentDept: "Mechanical",
    studentYear: 2,
    equipmentIds: ["eq-005", "eq-006"],
    equipmentNames: ["Industrial 3D Rapid Prototyper", "Precision 3-Axis CNC Milling Center"],
    slotStart: "2026-11-26 13:00",
    slotEnd: "2026-11-26 17:00",
    projectTitle: "Formula Student Aero Wing Mount Uprights",
    projectType: "club",
    projectSummary: "Machining 6061-T6 aluminum suspension uprights for collegiate Formula SAE vehicle static tech inspection.",
    deadline: "2026-12-15 (22 days)",
    createdAt: "2026-11-23 08:20",
    status: "waitlisted",
    score: 68,
    factors: { deadline: 55, relevance: 82, fairness: 65, academic: 70, waiting: 60 },
    explanation: "Club project competition date is 3 weeks out. Higher-priority thesis and course work takes precedence during peak afternoon hours.",
  },
  {
    id: "req-105",
    studentId: "stu-015",
    studentName: "Elena Rostova",
    studentDept: "Computer Science",
    studentYear: 3,
    equipmentIds: ["eq-020"],
    equipmentNames: ["Autonomous Mobile Robotics Workcell"],
    slotStart: "2026-11-25 15:00",
    slotEnd: "2026-11-25 19:00",
    projectTitle: "Cooperative Multi-Agent SLAM in Cluttered Environments",
    projectType: "research",
    projectSummary: "Testing decentralized Cartographer graph SLAM using dual LiDAR robots in the atrium.",
    deadline: "2026-12-02 (9 days)",
    createdAt: "2026-11-22 14:40",
    status: "pending",
    score: 79,
    factors: { deadline: 80, relevance: 88, fairness: 72, academic: 82, waiting: 74 },
    explanation: "Solid grant-funded research project. Student had 14 hours of equipment time last week, which lightly moderates the fairness factor.",
  },
  {
    id: "req-106",
    studentId: "stu-019",
    studentName: "Kai Tanaka",
    studentDept: "Chemistry",
    studentYear: 4,
    equipmentIds: ["eq-015"],
    equipmentNames: ["Gas Chromatograph-Mass Spectrometer"],
    slotStart: "2026-11-24 13:00",
    slotEnd: "2026-11-24 16:30",
    projectTitle: "Catalytic Pyrolysis of Ocean Microplastics",
    projectType: "thesis",
    projectSummary: "Quantification of aromatic hydrocarbon fractions from zeolite cracking reactions.",
    deadline: "2026-11-30 (6 days)",
    createdAt: "2026-11-21 18:00",
    status: "approved",
    score: 91,
    factors: { deadline: 91, relevance: 96, fairness: 86, academic: 94, waiting: 88 },
    explanation: "Faculty pre-approved. High publication potential and stringent reaction sample shelf-life.",
    decidedBy: "Dr. Sterling",
  },
];

export const initialQueue: BookingRequest[] = initialBookings;

export const initialNotifications: Notification[] = [
  {
    id: "ntf-1",
    toUserId: "stu-001",
    text: "Automated scoring complete for Autonomous Drone Odometry: Priority Score 93/100.",
    at: "2026-11-22T09:35:00.000Z",
    read: false,
  },
  {
    id: "ntf-2",
    toUserId: "stu-019",
    text: "Slot approved! Your booking for GC-MS on 2026-11-24 was approved by Dr. Sterling.",
    at: "2026-11-21T18:15:00.000Z",
    read: true,
  },
  {
    id: "ntf-3",
    toUserId: "stu-012",
    text: "Position update: Your Formula Student CNC milling booking is #1 on the waitlist.",
    at: "2026-11-23T08:25:00.000Z",
    read: false,
  },
];
