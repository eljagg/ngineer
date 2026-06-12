import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "package.json",
  ".env.example",
  "src/app/page.tsx",
  "src/app/network/page.tsx",
  "src/app/health/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/api/neo4j/health/route.ts",
  "src/app/api/neo4j/keepalive/route.ts",
  "src/components/NetworkCanvas.tsx",
  "src/components/NetworkFlowCanvas.tsx",
  "src/lib/network-seed.ts",
  "src/lib/neo4j.ts",
  "src/types/elkjs.d.ts",
  "src/components/IpamWorkspace.tsx",
  "src/lib/ipam-model.ts",
  "src/lib/api-auth.ts",
  "src/app/api/ipam/commit/route.ts",
  "src/app/api/ipam/snapshot/route.ts",
  ".github/workflows/neo4j-keepalive.yml"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error("Missing required files:", missing.join(", "));
  process.exit(1);
}

const envExample = readFileSync(".env.example", "utf8");
for (const key of ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "AUTH_SECRET", "NEO4J_KEEPALIVE_TOKEN", "IPAM_API_TOKEN"]) {
  if (!envExample.includes(key)) {
    console.error(`.env.example is missing ${key}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.name !== "ngineer" || packageJson.version !== "0.1.10.2") {
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
for (const marker of ["ReactFlow", "ELK", "getLayoutedNodes", "NetworkDeviceNode", "NetworkLinkEdge", "Auto layout", "Add draft device", "portAnchors", "rf-port-aware-node"]) {
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


const apiAuth = readFileSync("src/lib/api-auth.ts", "utf8");
for (const marker of ["timingSafeEqual", "requireIpamApiToken", "apiErrorResponse"]) {
  if (!apiAuth.includes(marker)) {
    console.error(`api-auth.ts is missing expected security marker: ${marker}`);
    process.exit(1);
  }
}

const commitRoute = readFileSync("src/app/api/ipam/commit/route.ts", "utf8");
for (const marker of ["requireIpamApiToken", "MAX_BODY_BYTES", "dropDemoRows"]) {
  if (!commitRoute.includes(marker)) {
    console.error(`IPAM commit route is missing expected hardening marker: ${marker}`);
    process.exit(1);
  }
}

const keepaliveRoute = readFileSync("src/app/api/neo4j/keepalive/route.ts", "utf8");
if (keepaliveRoute.includes("searchParams.get(\"token\")")) {
  console.error("Keep-alive route must not accept query-string tokens");
  process.exit(1);
}
if (!keepaliveRoute.includes("safeTokenEqual")) {
  console.error("Keep-alive route must use constant-time token comparison");
  process.exit(1);
}

const nextConfig = readFileSync("next.config.mjs", "utf8");
for (const marker of ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security"]) {
  if (!nextConfig.includes(marker)) {
    console.error(`next.config.mjs is missing security header: ${marker}`);
    process.exit(1);
  }
}

const ipamModel = readFileSync("src/lib/ipam-model.ts", "utf8");
for (const marker of ["redacted-pem-block", "message-digest-key", "isakmp", "psksecret", "key-string"]) {
  if (!ipamModel.includes(marker)) {
    console.error(`ipam-model.ts is missing redaction pattern marker: ${marker}`);
    process.exit(1);
  }
}

const ipamWorkspaceV2 = readFileSync("src/components/IpamWorkspace.tsx", "utf8");
for (const marker of ["Refresh graph snapshot", "WORKSPACE_STORAGE_KEY", "MAX_IMPORT_FILE_BYTES", "IPAM API token"]) {
  if (!ipamWorkspaceV2.includes(marker)) {
    console.error(`IpamWorkspace is missing expected v0.1.10.2 marker: ${marker}`);
    process.exit(1);
  }
}

const networkPage = readFileSync("src/app/network/page.tsx", "utf8");
const healthPage = readFileSync("src/app/health/page.tsx", "utf8");
if (!healthPage.includes("NGINEER health")) {
  console.error("Health page is missing expected status text");
  process.exit(1);
}

if (!networkPage.includes("NetworkFlowCanvas") || !networkPage.includes("network-max-canvas")) {
  console.error("Network page is not using the React Flow topology canvas");
  process.exit(1);
}

for (const marker of ["Upload evidence files", "Commit to Neo4j", "Apply approved locally", "Export IP CSV", "Review discovered facts", "IPAM command center", "Parser coverage", "Load Windows sample", "Load Linux sample", "Stage pasted evidence"]) {
  if (!ipamWorkspaceV2.includes(marker)) {
    console.error(`IpamWorkspace is missing expected IPAM marker: ${marker}`);
    process.exit(1);
  }
}

for (const marker of ["parseImportedConfig", "sanitizeConfigText", "findIpamConflicts", "applyApprovedImportFacts", "detectVendor", "parseCiscoFacts", "CDP topology link", "show interfaces status", "BGP neighbor summary"]) {
  if (!ipamModel.includes(marker)) {
    console.error(`IPAM model is missing expected parser marker: ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  "parseFortinetFacts",
  "config system interface",
  "Fortinet firewall policy",
  "Fortinet static route",
  "Fortinet address object subnet",
  "Fortinet BGP neighbor",
  "Fortinet DHCP server",
  "Fortinet IPsec VPN peer"
]) {
  if (!ipamModel.includes(marker)) {
    console.error(`IPAM model is missing expected Fortinet parser marker: ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  "parseWindowsFacts",
  "Windows network adapter",
  "Windows default gateway",
  "Windows DHCP scope prefix",
  "Windows DNS server",
  "parseLinuxFacts",
  "Linux ip addr interface",
  "Linux connected route prefix",
  "Linux NetworkManager gateway",
  "Linux netplan gateway"
]) {
  if (!ipamModel.includes(marker)) {
    console.error(`IPAM model is missing expected Windows/Linux parser marker: ${marker}`);
    process.exit(1);
  }
}

console.log("Smoke test passed: NGINEER v0.1.10.2 security hardening and IPAM workspace files are present.");
