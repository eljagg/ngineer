import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "package.json",
  ".env.example",
  "src/app/page.tsx",
  "src/app/network/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/api/neo4j/health/route.ts",
  "src/app/api/neo4j/keepalive/route.ts",
  "src/components/NetworkCanvas.tsx",
  "src/lib/network-seed.ts",
  "src/lib/neo4j.ts",
  ".github/workflows/neo4j-keepalive.yml"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error("Missing required files:", missing.join(", "));
  process.exit(1);
}

const envExample = readFileSync(".env.example", "utf8");
for (const key of ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "AUTH_SECRET", "NEO4J_KEEPALIVE_TOKEN"]) {
  if (!envExample.includes(key)) {
    console.error(`.env.example is missing ${key}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.name !== "ngineer" || packageJson.version !== "0.1.5") {
  console.error("Unexpected package metadata", packageJson.name, packageJson.version);
  process.exit(1);
}

const networkCanvas = readFileSync("src/components/NetworkCanvas.tsx", "utf8");
for (const marker of ["curvedConnectionPath", "SelectionInspector", "canvas-control-strip", "onPointerDown"]) {
  if (!networkCanvas.includes(marker)) {
    console.error(`NetworkCanvas is missing expected interactive marker: ${marker}`);
    process.exit(1);
  }
}

console.log("Smoke test passed: NGINEER v0.1.5 interactive professional topology canvas files are present.");
