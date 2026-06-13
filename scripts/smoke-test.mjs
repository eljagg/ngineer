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
  "src/components/DeviceGlyphs.tsx",
  "src/components/DocsExplorer.tsx",
  "src/components/ConfigBuilderWorkspace.tsx",
  "src/lib/docs-catalog.ts",
  "src/lib/config-templates.ts",
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
if (packageJson.name !== "ngineer" || packageJson.version !== "0.1.11.4") {
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

for (const marker of ["Upload evidence files", "Commit to Neo4j", "Apply approved locally", "Export IP CSV", "Review discovered facts", "IPAM command center", "Parser coverage", "Load Windows sample", "Load Linux sample", "Load Check Point sample", "Load Ubiquiti sample", "Stage pasted evidence"]) {
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
  "parseCheckPointFacts",
  "Check Point interface",
  "Check Point static route",
  "parseUbiquitiFacts",
  "Ubiquiti interface address",
  "Ubiquiti VLAN subinterface",
  "Ubiquiti firewall rule",
  "password-hash",
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

const deviceGlyphs = readFileSync("src/components/DeviceGlyphs.tsx", "utf8");
for (const glyph of ["RouterGlyph", "SwitchGlyph", "MultilayerGlyph", "FirewallGlyph", "ServerGlyph", "affinity-glyph"]) {
  if (!deviceGlyphs.includes(glyph)) {
    console.error(`DeviceGlyphs is missing expected glyph: ${glyph}`);
    process.exit(1);
  }
}

const globalsCss = readFileSync("src/app/globals.css", "utf8");
for (const marker of ["@keyframes linkPulse", "@keyframes rfLinkPulse", ".topology-link-down", ".rf-link-down", "prefers-reduced-motion"]) {
  if (!globalsCss.includes(marker)) {
    console.error(`globals.css is missing link-state style: ${marker}`);
    process.exit(1);
  }
}
for (const banned of ["@keyframes linkFlow", "@keyframes rfEdgeFlow", "canvas-zone-label {", "canvas-watermark {"]) {
  if (globalsCss.includes(banned)) {
    console.error(`globals.css still contains removed style: ${banned}`);
    process.exit(1);
  }
}

const homePage = readFileSync("src/app/page.tsx", "utf8");
if (homePage.includes("Build, trace, and validate") || !homePage.includes("network-max-canvas")) {
  console.error("Dashboard must be the full-height canvas without the hero wording");
  process.exit(1);
}

const docsCatalogSrc = readFileSync("src/lib/docs-catalog.ts", "utf8");
for (const entry of ["cisco-switching", "cisco-routing", "cisco-security", "fortinet-fortigate", "fortinet-fortiswitch", "paloalto-panos", "dell-networking", "pfsense", "redhat-rhel", "linux-mint", "windows-server", "windows-adds", "windows-gpo", "ospf", "bgp", "eigrp", "stp", "mpls", "ipam"]) {
  if (!docsCatalogSrc.includes(`id: "${entry}"`)) {
    console.error(`docs-catalog is missing required source: ${entry}`);
    process.exit(1);
  }
}

const configTemplatesSrc = readFileSync("src/lib/config-templates.ts", "utf8");
for (const tpl of ["ios-base-hardening", "ios-access-port", "ios-trunk-port", "ios-svi-gateway", "ios-ospf", "ios-eigrp", "ios-bgp", "ios-stp", "ios-mpls-ldp", "ios-static-route"]) {
  if (!configTemplatesSrc.includes(`id: "${tpl}"`)) {
    console.error(`config-templates is missing template: ${tpl}`);
    process.exit(1);
  }
}

const globalsIconCheck = readFileSync("src/app/globals.css", "utf8");
if (!globalsIconCheck.includes(".device-node .device-icon,\n.rf-device-icon-wrap {")) {
  console.error("Dashboard and network icon tiles must share one canonical rule");
  process.exit(1);
}

const flowCanvasSrc = readFileSync("src/components/NetworkFlowCanvas.tsx", "utf8");
if (!flowCanvasSrc.includes("maxZoom: 1")) {
  console.error("NetworkFlowCanvas must cap fitView zoom for large NOC displays");
  process.exit(1);
}
const globalsNoc = readFileSync("src/app/globals.css", "utf8");
if (globalsNoc.includes(".rf-device-node { width: max-content")) {
  console.error("Geometry-breaking max-content node rule must not return");
  process.exit(1);
}

// Dashboard/network visual unification guard: no pixel-sized overrides may
// exist on the network node tile, box, or caption - they must inherit the
// shared dashboard classes. This is the regression that shipped three times.
const unifiedCss = readFileSync("src/app/globals.css", "utf8");
const cssBlocks = unifiedCss.match(/[^{}]+\{[^}]*\}/g) || [];
for (const block of cssBlocks) {
  const selector = block.slice(0, block.indexOf("{"));
  const body = block.slice(block.indexOf("{"));
  const touchesRfNode = /rf-device-node|rf-device-icon-wrap|react-flow__node|rf-port-aware-node|rf-device-caption|device-node-(?:router|core|switch|firewall|server)/.test(selector);
  if (touchesRfNode && /(?:min-|max-)?(?:width|height)\s*:\s*[0-9.]+px/.test(body)) {
    console.error(`Pixel-sized rf node rule found - network nodes must share dashboard sizing: ${selector.trim()}`);
    process.exit(1);
  }
}

const unifiedFlow = readFileSync("src/components/NetworkFlowCanvas.tsx", "utf8");
for (const marker of ['className="device-icon rf-device-icon-wrap"', 'device-label rf-device-caption', "device-node-${kind}", "getBezierPath({ ...edgeArgs, curvature: 0.3 })"]) {
  if (!unifiedFlow.includes(marker)) {
    console.error(`NetworkFlowCanvas must consume dashboard classes: missing ${marker}`);
    process.exit(1);
  }
}

console.log("Smoke test passed: NGINEER v0.1.11.4 edge-termination geometry fix files are present.");
