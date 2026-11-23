# LabLink

LabLink helps university students discover and fairly request shared laboratory equipment across departments. The problem is fragmented inventories, safety prerequisites, and high-demand equipment bottlenecks; the solution is one searchable catalogue with AI-assisted project matching and a faculty-approved allocation queue.

## Key features

- AI project analyser that recommends equipment, skills, training, quantities, and reasons.
- Searchable catalogue with department filters, sorting, responsive collapse, and direct department discovery.
- Quantity-aware kit with training and maintenance warnings and a full-kit booking request.
- Faculty queue grouped by item or student, with scores, weight tuning, conflict markers, and decisions.
- Availability notifications, waitlist promotion, saved-kit alerts, and My Orders status tracking.
- Evaluator demo at `/demo` with feature coverage and copy-paste AI test prompts.

## Tech stack

Next.js, React, TypeScript, CSS, and the Gemini REST API with a local mock-AI fallback.

## Run locally

```bash
npm install
```

Optionally create `.env.local` and add a Gemini key:

```env
GEMINI_API_KEY=
```

The app works with mock AI when the key is absent or unavailable. Start the development server:

```bash
npm run dev
```

Open http://localhost:3000. Demo data is stored in memory and resets when the server restarts.
