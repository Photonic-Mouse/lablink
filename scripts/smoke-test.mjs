import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("app/page.tsx");
const extract = read("app/api/extract/route.ts");
const notifications = read("lib/notifications.ts");

assert.match(page, /SEARCH AUTOMATICALLY/);
assert.match(page, /MY ORDERS/);
assert.match(page, /REQUEST ALL/);
assert.match(extract, /GEMINI_API_KEY/);
assert.match(extract, /generateProjectRecommendations/);
assert.match(extract, /AbortSignal\.timeout/);
assert.match(notifications, /notifyAvailabilityFreed/);
console.log("Smoke tests passed: core AI, kit, orders, and availability flows are wired.");
