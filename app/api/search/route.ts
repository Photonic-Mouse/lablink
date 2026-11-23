import { NextRequest, NextResponse } from "next/server";
import { equipment, Equipment } from "@/lib/seed";

interface SearchMatch {
  equipment: Equipment;
  score: number;
  matchReason: string;
}

// Synonyms and semantic intent mappings for lab equipment
const INTENT_MAPPINGS: Record<string, { keywords: string[]; reason: string }> = {
  oscilloscope: {
    keywords: ["oscilloscope", "waveform", "signal", "frequency", "analog", "probe", "mhz", "gsa/s", "voltage", "circuit"],
    reason: "Matched high-bandwidth waveform observation and electronic signal debugging.",
  },
  "3d printing": {
    keywords: ["3d", "printer", "print", "printing", "fdm", "resin", "sla", "prototyping", "casing", "chassis", "enclosure", "pla", "petg"],
    reason: "Matched additive manufacturing and rapid prototyping for physical enclosures.",
  },
  gpu: {
    keywords: ["gpu", "compute", "cuda", "deep learning", "machine learning", "ml", "ai", "rtx", "training", "neural", "vision"],
    reason: "Matched high-performance GPU workstation with CUDA acceleration and large NVMe storage.",
  },
  robotics: {
    keywords: ["robot", "robotics", "rover", "lidar", "ros", "ros2", "slam", "autonomous", "sensors", "motors", "navigation"],
    reason: "Matched autonomous mobile robotics platform with onboard sensor arrays and ROS 2.",
  },
  fpga: {
    keywords: ["fpga", "verilog", "vhdl", "xilinx", "artix", "logic cells", "hardware acceleration", "digital design"],
    reason: "Matched FPGA digital logic synthesis and hardware acceleration platform.",
  },
  iot: {
    keywords: ["iot", "esp32", "wifi", "bluetooth", "microcontroller", "wireless", "telemetry", "embedded"],
    reason: "Matched IoT embedded prototyping bundle with wireless sensor networking.",
  },
  laser: {
    keywords: ["laser", "cutter", "cutting", "acrylic", "wood", "plywood", "co2", "engraving"],
    reason: "Matched precision CO2 laser cutter for sheet stock and prototype enclosures.",
  },
  cnc: {
    keywords: ["cnc", "mill", "milling", "router", "machining", "aluminum", "spindle", "subtractive"],
    reason: "Matched high-precision CNC subtractive machining and milling center.",
  },
  genomics: {
    keywords: ["dna", "rna", "pcr", "qpcr", "amplification", "genomics", "sequencing", "single-cell", "crispr", "primers"],
    reason: "Matched molecular genomics workstation for DNA amplification and fluorescence detection.",
  },
  cells: {
    keywords: ["cell", "cells", "tissue", "culture", "incubator", "sterile", "aseptic", "biosafety", "mammalian", "microbiology"],
    reason: "Matched sterile containment and controlled atmosphere incubation for biological specimens.",
  },
  chemistry: {
    keywords: ["chemistry", "fume hood", "solvent", "reaction", "synthesis", "centrifuge", "rotavap", "spectroscopy", "uv-vis", "mass spec", "gc-ms", "hplc", "chromatography"],
    reason: "Matched analytical instrumentation for chemical separation, synthesis, and molecular identification.",
  },
  materials: {
    keywords: ["tensile", "compression", "stress", "strain", "materials", "strength", "extensometer", "load cell", "utm"],
    reason: "Matched mechanical materials testing frame for stress-strain characterization.",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  return handleSearch(q);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const q = body.query || body.q || "";
    return handleSearch(q);
  } catch {
    return handleSearch("");
  }
}

function handleSearch(rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    const defaultMatches: SearchMatch[] = equipment.slice(0, 10).map((item) => ({
      equipment: item,
      score: 100,
      matchReason: `Available in ${item.dept} (${item.category}).`,
    }));
    return NextResponse.json({ query: "", total: equipment.length, results: defaultMatches });
  }

  const queryTerms = query.split(/\s+/).filter((t) => t.length > 2);
  const matches: SearchMatch[] = [];

  for (const item of equipment) {
    let score = 0;
    const reasons: string[] = [];

    const nameLower = item.name.toLowerCase();
    const deptLower = item.dept.toLowerCase();
    const catLower = item.category.toLowerCase();
    const descLower = item.description.toLowerCase();
    const tagsLower = item.tags.map((t) => t.toLowerCase());
    const specsLower = Object.entries(item.specs)
      .map(([k, v]) => `${k} ${v}`.toLowerCase())
      .join(" ");

    // 1. Direct name match
    if (nameLower.includes(query)) {
      score += 60;
      reasons.push(`Direct title match for '${query}'`);
    }

    // 2. Department or Category match
    if (deptLower.includes(query)) {
      score += 35;
      reasons.push(`Located in ${item.dept} Department`);
    }
    if (catLower.includes(query)) {
      score += 30;
      reasons.push(`Specialized in ${item.category}`);
    }

    // 3. Multi-word query term matching
    for (const term of queryTerms) {
      if (nameLower.includes(term)) {
        score += 25;
        if (!reasons.some((r) => r.includes(term))) {
          reasons.push(`Matches keyword '${term}' in instrument title`);
        }
      } else if (tagsLower.some((t) => t.includes(term))) {
        score += 20;
        if (!reasons.some((r) => r.includes("tag"))) {
          reasons.push(`Tagged for ${term} research`);
        }
      } else if (specsLower.includes(term)) {
        score += 18;
        if (!reasons.some((r) => r.includes("spec"))) {
          reasons.push(`Specifies capability for '${term}'`);
        }
      } else if (descLower.includes(term)) {
        score += 12;
      }
    }

    // 4. Semantic / Natural-Language Intent Check
    for (const [, mapping] of Object.entries(INTENT_MAPPINGS)) {
      const queryMatchesIntent = mapping.keywords.some((kw) => query.includes(kw));
      if (queryMatchesIntent) {
        const itemMatchesIntent =
          mapping.keywords.some((kw) => nameLower.includes(kw) || tagsLower.includes(kw) || catLower.includes(kw) || descLower.includes(kw));

        if (itemMatchesIntent) {
          score += 40;
          if (!reasons.includes(mapping.reason)) {
            reasons.push(mapping.reason);
          }
        }
      }
    }

    if (score > 0) {
      matches.push({
        equipment: item,
        score,
        matchReason: reasons.slice(0, 2).join(" · ") || `Relevant ${item.dept} research equipment.`,
      });
    }
  }

  // Sort descending by match score
  matches.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    query: rawQuery,
    total: matches.length,
    results: matches,
  });
}
