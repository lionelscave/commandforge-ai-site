#!/usr/bin/env node
/**
 * Build-time content guardrail for the CommandForge AI public site.
 * Runs after `vite build`. FAILS the build (exit 1) if:
 *   1. any internal-origin marker (guardrail/denylist.json) appears in the compiled dist/ bundle,
 *   2. any internal marker appears in tracked source under src/,
 *   3. the SPA router registers a route not present in guardrail/allowlist.json,
 *   4. source contains a fetch() to a server API surface (this is a static site).
 * The allowlist's content basis is the ONLY approved content source.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const denylist = JSON.parse(fs.readFileSync(path.join(ROOT, "guardrail/denylist.json"), "utf8")).patterns;
const allowlist = JSON.parse(fs.readFileSync(path.join(ROOT, "guardrail/allowlist.json"), "utf8"));

const violations = [];

function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

function scan(files, label) {
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const { re, note } of denylist) {
      const m = text.match(new RegExp(re, "i"));
      if (m) violations.push(`[${label}] ${path.relative(ROOT, file)} — internal marker /${re}/ matched "${m[0]}" (${note})`);
    }
  }
}

// 1 + 2: denylist scan of compiled bundle and source
const distFiles = walk(path.join(ROOT, "dist"), [".js", ".css", ".html"]);
if (!distFiles.length) { console.error("guardrail: dist/ is empty — run vite build first."); process.exit(1); }
scan(distFiles, "dist");
scan(walk(path.join(ROOT, "src"), [".tsx", ".ts"]), "src");

// 3: route allowlist — extract route literals from source and validate
const srcText = walk(path.join(ROOT, "src"), [".tsx", ".ts"]).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const allowed = allowlist.routes;
const isAllowed = (r) => allowed.some((a) => (a.prefix ? r.startsWith(a.path) : r === a.path));
const found = new Set();
const collect = (regex, i = 1) => { let m; while ((m = regex.exec(srcText))) { let r = m[i]; if (r.includes("${")) r = r.slice(0, r.indexOf("${")); if (r.startsWith("/") && !r.startsWith("//")) found.add(r); } };
collect(/path\s*===\s*['"](\/[^'"]*)['"]/g);
collect(/path\.startsWith\(\s*['"](\/[^'"]*)['"]/g);
collect(/\bto=["'`](\/[^"'`]*)["'`]/g);
collect(/\bto=\{`(\/[^`]*)`\}/g);
for (const r of found) {
  const base = r.endsWith("/") ? r : r; // normalized above via ${ trim
  if (!isAllowed(base)) violations.push(`[route] "${r}" is not in guardrail/allowlist.json — every public route must be explicitly allowlisted`);
}

// 4: no server API calls in a static site
let m; const apiFetch = /fetch\(\s*['"`]\/api\//g;
while ((m = apiFetch.exec(srcText))) violations.push(`[api] source calls a server API (fetch('/api/...')) — this is a static marketing site with no backend`);

// report
if (violations.length) {
  console.error("\n✗ CONTENT GUARDRAIL FAILED — build blocked:\n");
  for (const v of violations) console.error("  • " + v);
  console.error(`\n${violations.length} violation(s). Content must come only from ${allowlist.contentBasis}.` +
    (allowlist.pricingApproved ? "" : " Pricing stays gated behind intake until it is explicitly approved.") + "\n");
  process.exit(1);
}
console.log(`✓ content guardrail passed — ${distFiles.length} bundle file(s) clean, routes ${[...found].sort().join(", ")} all allowlisted, no API surface.`);
