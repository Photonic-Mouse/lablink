"use client";

const features = [
  "Automatic project search with Gemini/mock fallback",
  "Catalogue search, filters, sorting, and responsive show-more",
  "Five department discovery and direct catalogue filtering",
  "Quantity-aware kit with training and maintenance warnings",
  "Faculty queue grouped by item or student",
  "Availability notifications and waitlist promotion",
  "My Orders status and confirmation view",
];

export default function DemoGate({ onClose }: { onClose: () => void }) {
  return (
    <div className="demo-gate" role="dialog" aria-modal="true" aria-labelledby="demo-gate-title">
      <div className="demo-gate-card">
        <button className="demo-gate-close" onClick={onClose} aria-label="Close demo overview">×</button>
        <div className="eyebrow"><b /> LABLINK // EVALUATOR DEMO</div>
        <h1 id="demo-gate-title">EXPLORE THE <em>LAB.</em></h1>
        <p className="demo-gate-intro">A cross-department equipment platform for discovering, allocating, and booking university lab resources.</p>
        <div className="demo-gate-features">
          {features.map((feature, index) => <div key={feature}><span>{String(index + 1).padStart(2, "0")}</span><strong>{feature}</strong></div>)}
        </div>
        <button className="btn btn-dark demo-gate-enter" onClick={onClose}>ENTER LABLINK ↗</button>
      </div>
    </div>
  );
}
