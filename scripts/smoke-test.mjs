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
  "src/components/NetworkFlowCanvas.tsx",
  "src/lib/network-seed.ts",
  "src/lib/neo4j.ts",
  "src/types/elkjs.d.ts",
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
if (packageJson.name !== "ngineer" || packageJson.version !== "0.1.6") {
  console.error("Unexpected package metadata", packageJson.name, packageJson.version);
  process.exit(1);
}

for (const dependency of ["@xyflow/react", "elkjs"]) {
  if (!packageJson.dependencies?.[dependency]) {
    console.error(`Missing topology dependency: ${dependency}`);
    process.exit(1);
  }
}

const networkFlowCanvas = readFileSync("src/components/NetworkFlowCanvas.tsx", "utf8");
for (const marker of ["ReactFlow", "ELK", "getLayoutedNodes", "NetworkDeviceNode", "NetworkLinkEdge", "Auto layout", "Add draft device"]) {
  if (!networkFlowCanvas.includes(marker)) {
    console.error(`NetworkFlowCanvas is missing expected interactive marker: ${marker}`);
    process.exit(1);
  }
}

const layout = readFileSync("src/app/layout.tsx", "utf8");
if (!layout.includes("@xyflow/react/dist/style.css")) {
  console.error("Root layout is missing React Flow stylesheet import");
  process.exit(1);
}

const networkPage = readFileSync("src/app/network/page.tsx", "utf8");
if (!networkPage.includes("NetworkFlowCanvas")) {
  console.error("Network page is not using the React Flow topology canvas");
  process.exit(1);
}

console.log("Smoke test passed: NGINEER v0.1.6 React Flow + ELK topology engine files are present.");
