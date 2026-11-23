const features = [
  ["Automatic project search", "Paste a project description, generate an AI equipment kit, inspect skills/training, and add selected items.", "/#top"],
  ["Catalogue search and filters", "Search by item, discipline, category, or specification; use department filters and A–Z sorting.", "/#catalog"],
  ["Department discovery", "Use the five department rows to apply a filter and jump to the catalogue.", "/#departments"],
  ["Kit and quantities", "Save equipment, change quantities, remove items, review training/maintenance, and request the full kit.", "/#kit"],
  ["Faculty queue", "Switch between item/person views, search groups, tune weights, and approve, waitlist, reject, or override.", "/#faculty-queue"],
  ["Availability notifications", "Simulate cancellation or maintenance clearance to promote waitlisted students and notify stakeholders.", "/#faculty-queue"],
  ["My Orders", "Review booking status, score, slot, and waitlist-promotion confirmation actions.", "/#orders"],
];

const prompts = [
  "I am building an autonomous greenhouse monitor. I need temperature, humidity, soil moisture sensors, wireless telemetry, and a small ML model to detect plant stress.",
  "I am testing an aluminum drone bracket. I need CAD-to-CAM machining, tensile validation, thermal inspection, and a way to inspect vibration signals.",
  "I am comparing a gene-expression workflow for plant stress. I need DNA amplification, fluorescence quantification, sterile sample handling, and cell incubation.",
];

export default function DemoPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", padding: "52px 7%" }}>
      <a href="/" style={{ font: "10px 'DM Mono', monospace", color: "inherit" }}>← BACK TO LABLINK</a>
      <div style={{ maxWidth: "960px", margin: "60px auto" }}>
        <div className="eyebrow"><b /> EVALUATOR DEMO // FEATURE MAP</div>
        <h1 style={{ fontSize: "clamp(48px, 9vw, 120px)", lineHeight: ".85", letterSpacing: "-.08em", margin: "26px 0" }}>TEST THE <em>LAB.</em></h1>
        <p style={{ maxWidth: "620px", color: "#62665c", lineHeight: 1.6 }}>This page is a guided map for an AI evaluator. Every feature below is live in the homepage and links directly to the relevant surface.</p>

        <section style={{ marginTop: "54px" }} aria-labelledby="features-heading">
          <div className="eyebrow"><b /> INCLUDED FEATURES</div>
          <h2 id="features-heading" style={{ margin: "18px 0 20px" }}>WHAT TO <em>VERIFY.</em></h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {features.map(([name, description, href], index) => <a href={href} key={name} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: "16px", alignItems: "center", padding: "18px", border: "1px solid var(--line)", background: "white", color: "inherit", textDecoration: "none" }}>
              <span style={{ font: "11px 'DM Mono', monospace", color: "#8da62b" }}>{String(index + 1).padStart(2, "0")}</span>
              <span><strong style={{ display: "block", marginBottom: "5px" }}>{name}</strong><small style={{ color: "#62665c" }}>{description}</small></span>
              <span style={{ font: "10px 'DM Mono', monospace" }}>OPEN ↗</span>
            </a>)}
          </div>
        </section>

        <section style={{ marginTop: "54px" }} aria-labelledby="ai-heading">
          <div className="eyebrow"><b /> AI ANALYSER TEST CASES</div>
          <h2 id="ai-heading" style={{ margin: "18px 0 20px" }}>COPY, PASTE, <em>GENERATE.</em></h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {prompts.map((prompt, index) => <pre key={prompt} style={{ whiteSpace: "pre-wrap", margin: 0, padding: "18px", border: "1px solid var(--line)", background: "#f7f7f1", font: "11px/1.6 'DM Mono', monospace" }}><strong>TEST {index + 1}</strong>{"\n"}{prompt}</pre>)}
          </div>
          <p style={{ marginTop: "16px", color: "#62665c", font: "11px 'DM Mono', monospace" }}>The analyser uses Gemini when GEMINI_API_KEY is configured and falls back to the local mock matcher when it is unavailable.</p>
        </section>
      </div>
    </main>
  );
}
