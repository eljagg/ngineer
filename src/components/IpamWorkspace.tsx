"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  applyApprovedImportFacts,
  createId,
  demoInventory,
  findIpamConflicts,
  getPrefixUtilization,
  parseImportedConfig,
  type ImportFact,
  type ImportJob,
  type IpAddressRecord,
  type IpamInventory,
  type PrefixRecord,
  type SiteRecord,
  type VendorKind,
  type VlanRecord,
  type VrfRecord
} from "@/lib/ipam-model";

type ActiveView = "inventory" | "manual" | "import" | "review";

type CommitState =
  | { status: "idle"; message: string }
  | { status: "working"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type GraphSnapshot = {
  sites: number;
  vrfs: number;
  vlans: number;
  prefixes: number;
  addresses: number;
  importJobs: number;
  importedFacts: number;
};

type SnapshotState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "success"; snapshot: GraphSnapshot; fetchedAt: string }
  | { status: "error"; message: string };

const WORKSPACE_STORAGE_KEY = "ngineer.ipam.workspace.v1";
const API_TOKEN_STORAGE_KEY = "ngineer.ipam.apiToken";
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const vendorOptions: VendorKind[] = ["Unknown", "Cisco", "Fortinet", "Check Point", "Ubiquiti", "Windows", "Linux"];

const parserCoverage = [
  { name: "Cisco", detail: "running-config, VLANs, trunks, routes, OSPF/BGP, CDP/LLDP links" },
  { name: "Fortinet", detail: "interfaces, zones, policies, address objects, routes, DHCP, BGP, IPsec" },
  { name: "Check Point", detail: "Gaia clish: interfaces, mask-length prefixes, static routes, DNS, comments" },
  { name: "Ubiquiti", detail: "EdgeOS set commands + config.boot blocks: interfaces, vif VLANs, routes, firewall rules" },
  { name: "Windows", detail: "ipconfig, route print, systeminfo, NetIP/DNS/DHCP PowerShell outputs" },
  { name: "Linux", detail: "ip addr, ip route, hostnamectl, os-release, NetworkManager, ifcfg, netplan" }
];

const sampleImports = {
  checkpoint: {
    label: "Load Check Point sample",
    sourceName: "gw-hq-01-gaia.clish",
    vendor: "Check Point" as VendorKind,
    text: `set hostname GW-HQ-01
set interface eth0 ipv4-address 203.0.113.2 mask-length 30
set interface eth0 comments "External uplink to ISP"
set interface eth0 state on
set interface eth1 ipv4-address 10.120.1.1 mask-length 24
set interface eth1 comments "Internal core"
set interface eth2 state off
set static-route default nexthop gateway address 203.0.113.1 on
set static-route 10.50.0.0/16 nexthop gateway address 10.120.1.254 on
add dns primary 10.120.10.10
add dns secondary 10.120.10.11`
  },
  ubiquiti: {
    label: "Load Ubiquiti sample",
    sourceName: "er-branch-01-config.boot",
    vendor: "Ubiquiti" as VendorKind,
    text: `set system host-name ER-BRANCH-01
set interfaces ethernet eth0 address 203.0.113.6/30
set interfaces ethernet eth0 description "WAN uplink"
set interfaces ethernet eth1 address 10.20.0.1/24
set interfaces ethernet eth1 description "Branch LAN"
set interfaces ethernet eth1 vif 30 address 10.20.30.1/24
set protocols static route 0.0.0.0/0 next-hop 203.0.113.5
set firewall name WAN_IN rule 10 action drop
set firewall name WAN_IN rule 20 action accept`
  },
  windows: {
    label: "Load Windows sample",
    sourceName: "windows-server-sample.txt",
    vendor: "Windows" as VendorKind,
    text: `Windows IP Configuration

   Host Name . . . . . . . . . . . . : WIN-DC-01
   Primary Dns Suffix  . . . . . . . : corp.local

Ethernet adapter Ethernet0:

   Description . . . . . . . . . . . : Intel(R) Ethernet Connection
   DHCP Enabled. . . . . . . . . . . : No
   IPv4 Address. . . . . . . . . . . : 10.120.10.15(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.120.10.1
   DNS Servers . . . . . . . . . . . : 10.120.10.10
                                       10.120.10.11

===========================================================================
IPv4 Route Table
===========================================================================
Network Destination        Netmask          Gateway       Interface  Metric
          0.0.0.0          0.0.0.0       10.120.10.1     10.120.10.15     25
       10.120.10.0    255.255.255.0         On-link      10.120.10.15    281

ScopeId      SubnetMask      Name        StartRange       EndRange
10.120.30.0  255.255.255.0   BRANCH-DHCP 10.120.30.50    10.120.30.220`
  },
  linux: {
    label: "Load Linux sample",
    sourceName: "linux-server-sample.txt",
    vendor: "Linux" as VendorKind,
    text: `hostnamectl
   Static hostname: linux-app-01
 Operating System: Ubuntu 24.04.2 LTS

2: ens192: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    inet 10.120.20.25/24 brd 10.120.20.255 scope global ens192
       valid_lft forever preferred_lft forever

ip route
default via 10.120.20.1 dev ens192 proto static src 10.120.20.25
10.120.20.0/24 dev ens192 proto kernel scope link src 10.120.20.25

GENERAL.DEVICE: ens192
IP4.ADDRESS[1]: 10.120.20.25/24
IP4.GATEWAY: 10.120.20.1
IP4.DNS[1]: 10.120.10.10
IP4.DNS[2]: 10.120.10.11

NAME="Ubuntu"
VERSION="24.04.2 LTS (Noble Numbat)"`
  }
};

function findName<T extends { id: string; name: string }>(rows: T[], id?: string): string {
  return rows.find((row) => row.id === id)?.name || "Unassigned";
}

function toCsv(rows: Array<Record<string, string | number | undefined>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
  ].join("\n");
}

function downloadText(fileName: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCypherPreview(facts: ImportFact[]): string {
  const approved = facts.filter((fact) => fact.approved);
  if (approved.length === 0) return "// No approved facts selected yet.";
  return approved.slice(0, 40).map((fact) => {
    if (fact.type === "ip-address") {
      return `MERGE (ip:IPAddress {address: ${JSON.stringify(fact.ip || fact.value)}}) SET ip.sourceFile = ${JSON.stringify(fact.sourceFile)}, ip.device = ${JSON.stringify(fact.device || "")}, ip.interface = ${JSON.stringify(fact.interfaceName || "")};`;
    }
    if (fact.type === "prefix") {
      return `MERGE (p:Prefix {cidr: ${JSON.stringify(fact.cidr || fact.value)}}) SET p.sourceFile = ${JSON.stringify(fact.sourceFile)}, p.vendor = ${JSON.stringify(fact.vendor)};`;
    }
    if (fact.type === "interface") {
      return `MERGE (d:Device {name: ${JSON.stringify(fact.device || "Imported Device")}}) MERGE (i:Interface {name: ${JSON.stringify(fact.interfaceName || fact.value)}, device: d.name}) MERGE (d)-[:HAS_INTERFACE]->(i);`;
    }
    return `// ${fact.type}: ${fact.label} = ${fact.value}`;
  }).join("\n");
}

export function IpamWorkspace() {
  const [inventory, setInventory] = useState<IpamInventory>(demoInventory);
  const [activeView, setActiveView] = useState<ActiveView>("import");
  const [importText, setImportText] = useState("");
  const [sourceName, setSourceName] = useState("pasted-config.txt");
  const [forcedVendor, setForcedVendor] = useState<VendorKind>("Unknown");
  const [apiToken, setApiToken] = useState("");
  const [snapshotState, setSnapshotState] = useState<SnapshotState>({ status: "idle" });
  const [commitState, setCommitState] = useState<CommitState>({ status: "idle", message: "Approved facts can be committed to Neo4j after review." });
  const hydrated = useRef(false);

  // Hydrate staged work and API token from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const savedWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (savedWorkspace) {
        const parsed = JSON.parse(savedWorkspace) as IpamInventory;
        if (parsed && Array.isArray(parsed.importJobs)) setInventory(parsed);
      }
      const savedToken = localStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (savedToken) setApiToken(savedToken);
    } catch {
      // Corrupt or unavailable storage: continue with the demo baseline.
    }
    hydrated.current = true;
  }, []);

  // Persist the workspace (debounced 250ms) so staged imports survive refresh.
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(inventory));
      } catch {
        // Storage full or blocked: staging continues in memory only.
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [inventory]);

  function updateApiToken(value: string) {
    setApiToken(value);
    try {
      if (value) localStorage.setItem(API_TOKEN_STORAGE_KEY, value);
      else localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures; token still works for this session.
    }
  }

  function resetWorkspace() {
    setInventory(demoInventory);
    setSnapshotState({ status: "idle" });
    setCommitState({ status: "idle", message: "Workspace reset to demo baseline. Staged imports cleared." });
    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }

  const [siteForm, setSiteForm] = useState({ name: "", region: "", role: "Branch" as SiteRecord["role"] });
  const [vrfForm, setVrfForm] = useState({ name: "", rd: "", description: "" });
  const [vlanForm, setVlanForm] = useState({ vlanId: "", name: "", siteId: demoInventory.sites[0]?.id || "", vrfId: demoInventory.vrfs[0]?.id || "" });
  const [prefixForm, setPrefixForm] = useState({ cidr: "", siteId: demoInventory.sites[0]?.id || "", vrfId: demoInventory.vrfs[0]?.id || "", vlanId: "", gateway: "", purpose: "", status: "active" as PrefixRecord["status"] });
  const [ipForm, setIpForm] = useState({ address: "", prefixId: demoInventory.prefixes[0]?.id || "", siteId: demoInventory.sites[0]?.id || "", vrfId: demoInventory.vrfs[0]?.id || "", hostname: "", device: "", interfaceName: "", role: "unknown" as IpAddressRecord["role"] });

  const conflicts = useMemo(() => findIpamConflicts(inventory), [inventory]);
  const approvedFacts = useMemo(() => inventory.importJobs.flatMap((job) => job.facts).filter((fact) => fact.approved), [inventory.importJobs]);
  const allFacts = useMemo(() => inventory.importJobs.flatMap((job) => job.facts), [inventory.importJobs]);
  const warningFacts = useMemo(() => allFacts.filter((fact) => fact.type === "warning"), [allFacts]);
  const latestImport = inventory.importJobs[0];
  const totalUsable = inventory.prefixes.reduce((sum, prefix) => sum + getPrefixUtilization(prefix, inventory.addresses).usable, 0);
  const totalUsed = inventory.addresses.length;
  const utilization = totalUsable > 0 ? Math.min(100, Math.round((totalUsed / totalUsable) * 100)) : 0;

  function addSite(event: FormEvent) {
    event.preventDefault();
    if (!siteForm.name.trim()) return;
    const site: SiteRecord = { id: createId("site", siteForm.name), name: siteForm.name.trim(), region: siteForm.region.trim() || "Unknown", role: siteForm.role, origin: "manual" };
    setInventory((current) => ({ ...current, sites: current.sites.some((row) => row.id === site.id) ? current.sites : [...current.sites, site] }));
    setSiteForm({ name: "", region: "", role: "Branch" });
  }

  function addVrf(event: FormEvent) {
    event.preventDefault();
    if (!vrfForm.name.trim()) return;
    const vrf: VrfRecord = { id: createId("vrf", vrfForm.name), name: vrfForm.name.trim(), rd: vrfForm.rd.trim() || undefined, description: vrfForm.description.trim() || "Manually added VRF", origin: "manual" };
    setInventory((current) => ({ ...current, vrfs: current.vrfs.some((row) => row.id === vrf.id) ? current.vrfs : [...current.vrfs, vrf] }));
    setVrfForm({ name: "", rd: "", description: "" });
  }

  function addVlan(event: FormEvent) {
    event.preventDefault();
    const vlanId = Number(vlanForm.vlanId);
    if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) return;
    const vlan: VlanRecord = { id: createId("vlan", `${vlanForm.siteId}-${vlanId}`), vlanId, name: vlanForm.name.trim() || `VLAN ${vlanId}`, siteId: vlanForm.siteId, vrfId: vlanForm.vrfId, origin: "manual" };
    setInventory((current) => ({ ...current, vlans: current.vlans.some((row) => row.id === vlan.id) ? current.vlans : [...current.vlans, vlan] }));
    setVlanForm((current) => ({ ...current, vlanId: "", name: "" }));
  }

  function addPrefix(event: FormEvent) {
    event.preventDefault();
    if (!prefixForm.cidr.includes("/")) return;
    const prefix: PrefixRecord = { id: createId("prefix", `${prefixForm.vrfId}-${prefixForm.cidr}`), cidr: prefixForm.cidr.trim(), siteId: prefixForm.siteId, vrfId: prefixForm.vrfId, vlanId: prefixForm.vlanId || undefined, gateway: prefixForm.gateway.trim() || undefined, purpose: prefixForm.purpose.trim() || "Manually added prefix", status: prefixForm.status, origin: "manual" };
    setInventory((current) => ({ ...current, prefixes: current.prefixes.some((row) => row.id === prefix.id) ? current.prefixes : [...current.prefixes, prefix] }));
    setPrefixForm((current) => ({ ...current, cidr: "", gateway: "", purpose: "" }));
  }

  function addAddress(event: FormEvent) {
    event.preventDefault();
    if (!ipForm.address.trim()) return;
    const address: IpAddressRecord = { id: createId("ip", `${ipForm.vrfId}-${ipForm.address}-${ipForm.device}-${ipForm.interfaceName}`), address: ipForm.address.trim(), prefixId: ipForm.prefixId, siteId: ipForm.siteId, vrfId: ipForm.vrfId, hostname: ipForm.hostname.trim() || undefined, device: ipForm.device.trim() || undefined, interfaceName: ipForm.interfaceName.trim() || undefined, role: ipForm.role, source: "manual" };
    setInventory((current) => ({ ...current, addresses: [...current.addresses, address] }));
    setIpForm((current) => ({ ...current, address: "", hostname: "", device: "", interfaceName: "" }));
  }

  function stageImport(text: string, name: string, vendor = forcedVendor) {
    const job = parseImportedConfig(text, name, vendor);
    setInventory((current) => ({ ...current, importJobs: [job, ...current.importJobs] }));
    setActiveView("review");
    setCommitState({ status: "idle", message: `${job.facts.length} facts staged from ${job.sourceName}. Review before committing.` });
  }

  function stagePastedImport() {
    if (!importText.trim()) return;
    stageImport(importText, sourceName || "pasted-config.txt");
  }

  function loadSampleImport(kind: keyof typeof sampleImports) {
    const sample = sampleImports[kind];
    setSourceName(sample.sourceName);
    setForcedVendor(sample.vendor);
    setImportText(sample.text.trim());
    setActiveView("import");
    setCommitState({ status: "idle", message: `${sample.label.replace("Load ", "")} loaded. Click Stage pasted evidence to create reviewable facts.` });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        setCommitState({ status: "error", message: `${file.name} is larger than 5 MB and was skipped. Split large evidence files before importing.` });
        continue;
      }
      const text = await file.text();
      stageImport(text, file.name);
    }
  }

  function toggleFact(jobId: string, factId: string) {
    setInventory((current) => ({
      ...current,
      importJobs: current.importJobs.map((job) => job.id === jobId ? {
        ...job,
        facts: job.facts.map((fact) => fact.id === factId ? { ...fact, approved: !fact.approved } : fact)
      } : job)
    }));
  }

  function approveAllFacts(job: ImportJob) {
    setInventory((current) => ({
      ...current,
      importJobs: current.importJobs.map((row) => row.id === job.id ? { ...row, facts: row.facts.map((fact) => ({ ...fact, approved: fact.type !== "warning" })) } : row)
    }));
  }

  function applyApprovedToIpam() {
    setInventory((current) => applyApprovedImportFacts(current, current.importJobs.flatMap((job) => job.facts)));
    setCommitState({ status: "success", message: "Approved facts applied to the local IPAM inventory. Use Commit to Neo4j to persist them." });
    setActiveView("inventory");
  }

  async function commitToNeo4j() {
    if (!apiToken.trim()) {
      setCommitState({ status: "error", message: "Set the IPAM API token first (matches IPAM_API_TOKEN on the server). Demo data is never committed." });
      return;
    }
    setCommitState({ status: "working", message: "Committing approved IPAM/import facts to Neo4j..." });
    try {
      // Demo seed rows are filtered out here and again server-side; they must
      // never be persisted as source of truth.
      const commitInventory: IpamInventory = {
        sites: inventory.sites.filter((row) => row.origin !== "demo"),
        vrfs: inventory.vrfs.filter((row) => row.origin !== "demo"),
        vlans: inventory.vlans.filter((row) => row.origin !== "demo"),
        prefixes: inventory.prefixes.filter((row) => row.origin !== "demo"),
        addresses: inventory.addresses.filter((row) => row.source !== "demo"),
        importJobs: inventory.importJobs
      };
      const response = await fetch("/api/ipam/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken.trim()}` },
        body: JSON.stringify({ inventory: commitInventory, approvedFacts })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Neo4j commit failed");
      setCommitState({ status: "success", message: `Committed to Neo4j. Import jobs: ${data.result?.importJobs || 0}, facts: ${data.result?.facts || 0}, prefixes: ${data.result?.prefixes || 0}, addresses: ${data.result?.addresses || 0}. Demo rows excluded.` });
    } catch (error) {
      setCommitState({ status: "error", message: error instanceof Error ? error.message : "Unknown Neo4j commit error" });
    }
  }

  async function fetchGraphSnapshot() {
    if (!apiToken.trim()) {
      setSnapshotState({ status: "error", message: "Set the IPAM API token first (Review tab) to read the graph snapshot." });
      return;
    }
    setSnapshotState({ status: "working" });
    try {
      const response = await fetch("/api/ipam/snapshot", {
        headers: { Authorization: `Bearer ${apiToken.trim()}` }
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Snapshot request failed");
      setSnapshotState({ status: "success", snapshot: data.snapshot as GraphSnapshot, fetchedAt: new Date().toLocaleTimeString() });
    } catch (error) {
      setSnapshotState({ status: "error", message: error instanceof Error ? error.message : "Unknown snapshot error" });
    }
  }

  function exportIpamCsv() {
    downloadText("ngineer-ipam-addresses.csv", toCsv(inventory.addresses.map((row) => ({
      address: row.address,
      vrf: findName(inventory.vrfs, row.vrfId),
      site: findName(inventory.sites, row.siteId),
      prefix: inventory.prefixes.find((prefix) => prefix.id === row.prefixId)?.cidr,
      device: row.device,
      interface: row.interfaceName,
      role: row.role,
      source: row.source
    }))), "text/csv");
  }

  return (
    <div className="ipam-shell">
      <section className="ipam-command-row ipam-command-row-compact">
        <div>
          <div className="eyebrow">IPAM command center</div>
          <h1>Import, validate, and commit network/server facts.</h1>
          <p className="lead compact-lead">
            Paste device configs or server command outputs, review parsed facts, then approve them into the NGINEER source of truth.
          </p>
        </div>
        <div className="ipam-mode-switch" aria-label="IPAM workspace sections">
          {([
            ["import", `Import evidence`],
            ["review", `Review (${allFacts.length})`],
            ["inventory", "Inventory"],
            ["manual", "Manual entry"]
          ] as const).map(([key, label]) => (
            <button className={activeView === key ? "active" : ""} key={key} onClick={() => setActiveView(key)} type="button">{label}</button>
          ))}
        </div>
      </section>

      <section className="ipam-flow-strip" aria-label="IPAM import workflow">
        <article className={activeView === "import" ? "active" : ""}>
          <span>1</span>
          <strong>Import evidence</strong>
          <small>Cisco, Fortinet, Windows, Linux outputs</small>
        </article>
        <article className={activeView === "review" ? "active" : ""}>
          <span>2</span>
          <strong>Review facts</strong>
          <small>{allFacts.length} staged · {warningFacts.length} warnings</small>
        </article>
        <article className={activeView === "inventory" ? "active" : ""}>
          <span>3</span>
          <strong>Update inventory</strong>
          <small>{inventory.addresses.length} IP assignments tracked</small>
        </article>
        <article className="ipam-flow-link" onClick={() => setActiveView("review")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setActiveView("review"); }}>
          <span>4</span>
          <strong>Commit source of truth</strong>
          <small>Neo4j-ready after approval</small>
        </article>
      </section>

      <section className="ipam-kpi-grid section">
        <article><span>Sites</span><strong>{inventory.sites.length}</strong><small>Logical locations</small></article>
        <article><span>VRFs</span><strong>{inventory.vrfs.length}</strong><small>Routing domains</small></article>
        <article><span>Prefixes</span><strong>{inventory.prefixes.length}</strong><small>Tracked subnets</small></article>
        <article><span>IP addresses</span><strong>{inventory.addresses.length}</strong><small>{utilization}% used across tracked usable space</small></article>
        <article className={conflicts.length > 0 ? "danger" : "good"}><span>Conflicts</span><strong>{conflicts.length}</strong><small>Duplicates, overlaps, gateway errors</small></article>
      </section>

      {activeView === "inventory" && (
        <section className="ipam-work-grid section">
          <div className="ipam-main-panel">
            <div className="panel-heading flat-heading">
              <div>
                <div className="eyebrow">Prefix inventory</div>
                <h2>VRF-aware prefixes and utilization</h2>
              </div>
              <button className="btn" type="button" onClick={exportIpamCsv}>Export IP CSV</button>
            </div>
            <div className="ipam-table-wrap">
              <table className="table ipam-table">
                <thead><tr><th>Prefix</th><th>VRF</th><th>Site</th><th>VLAN</th><th>Gateway</th><th>Used</th><th>Purpose</th></tr></thead>
                <tbody>
                  {inventory.prefixes.map((prefix) => {
                    const used = getPrefixUtilization(prefix, inventory.addresses);
                    const vlan = inventory.vlans.find((row) => row.id === prefix.vlanId);
                    return (
                      <tr key={prefix.id}>
                        <td><strong>{prefix.cidr}</strong><span className="subtle-line">{prefix.status}</span></td>
                        <td>{findName(inventory.vrfs, prefix.vrfId)}</td>
                        <td>{findName(inventory.sites, prefix.siteId)}</td>
                        <td>{vlan ? `${vlan.vlanId} · ${vlan.name}` : "—"}</td>
                        <td>{prefix.gateway || "—"}</td>
                        <td><span className="usage-pill">{used.used}/{used.usable} · {used.percent}%</span></td>
                        <td>{prefix.purpose}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="panel-heading flat-heading section">
              <div>
                <div className="eyebrow">Address inventory</div>
                <h2>Assigned IPs and owning interfaces</h2>
              </div>
            </div>
            <div className="ipam-table-wrap">
              <table className="table ipam-table">
                <thead><tr><th>IP</th><th>Prefix</th><th>Device / Host</th><th>Interface</th><th>Role</th><th>Source</th></tr></thead>
                <tbody>
                  {inventory.addresses.map((address) => (
                    <tr key={address.id}>
                      <td><strong>{address.address}</strong></td>
                      <td>{inventory.prefixes.find((prefix) => prefix.id === address.prefixId)?.cidr || "Unassigned"}</td>
                      <td>{address.device || address.hostname || "—"}</td>
                      <td>{address.interfaceName || "—"}</td>
                      <td>{address.role}</td>
                      <td><span className={`badge ${address.source === "imported" ? "warn" : "good"}`}>{address.source}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="ipam-side-panel">
            <div className="ipam-side-action">
              <h2>Validation</h2>
              <button className="btn" type="button" onClick={() => setActiveView("import")}>Import evidence</button>
            </div>
            {conflicts.length === 0 ? <p>No duplicate IPs, overlaps, or gateway placement errors detected in the current inventory.</p> : conflicts.map((conflict) => (
              <div className={`ipam-conflict ${conflict.severity}`} key={conflict.id}>
                <strong>{conflict.title}</strong>
                <p>{conflict.detail}</p>
                <small>{conflict.affected.join(" · ")}</small>
              </div>
            ))}

            <div className="ipam-side-action section">
              <h2>Neo4j graph snapshot</h2>
              <button className="btn" type="button" onClick={() => void fetchGraphSnapshot()}>Refresh graph snapshot</button>
            </div>
            {snapshotState.status === "idle" && <p>Read back what is actually persisted in Neo4j, so the local workspace and the graph never drift silently. Requires the IPAM API token (set it on the Review tab).</p>}
            {snapshotState.status === "working" && <p>Reading graph counts from Neo4j...</p>}
            {snapshotState.status === "error" && <div className="ipam-conflict danger"><strong>Snapshot failed</strong><p>{snapshotState.message}</p></div>}
            {snapshotState.status === "success" && (
              <div className="ipam-graph-snapshot">
                <p>
                  Sites {snapshotState.snapshot.sites} · VRFs {snapshotState.snapshot.vrfs} · VLANs {snapshotState.snapshot.vlans} · Prefixes {snapshotState.snapshot.prefixes} · IPs {snapshotState.snapshot.addresses} · Import jobs {snapshotState.snapshot.importJobs} · Facts {snapshotState.snapshot.importedFacts}
                </p>
                <small>Fetched at {snapshotState.fetchedAt} from the live graph.</small>
              </div>
            )}

            <div className="ipam-side-action section">
              <h2>Local workspace</h2>
              <button className="btn" type="button" onClick={resetWorkspace}>Reset local workspace</button>
            </div>
            <p>Staged imports persist in this browser between refreshes. Reset clears staged work and returns to the demo baseline. Demo rows are never committed to Neo4j.</p>
          </aside>
        </section>
      )}

      {activeView === "manual" && (
        <section className="ipam-form-grid section">
          <form className="ipam-form-panel" onSubmit={addSite}>
            <h2>Add site</h2>
            <label>Name<input value={siteForm.name} onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value })} placeholder="Kingston HQ" /></label>
            <label>Region<input value={siteForm.region} onChange={(event) => setSiteForm({ ...siteForm, region: event.target.value })} placeholder="Jamaica" /></label>
            <label>Role<select value={siteForm.role} onChange={(event) => setSiteForm({ ...siteForm, role: event.target.value as SiteRecord["role"] })}><option>HQ</option><option>Branch</option><option>Data Center</option><option>Provider</option><option>Cloud</option><option>Unknown</option></select></label>
            <button className="btn primary" type="submit">Add site</button>
          </form>

          <form className="ipam-form-panel" onSubmit={addVrf}>
            <h2>Add VRF</h2>
            <label>Name<input value={vrfForm.name} onChange={(event) => setVrfForm({ ...vrfForm, name: event.target.value })} placeholder="CORP" /></label>
            <label>RD / Identifier<input value={vrfForm.rd} onChange={(event) => setVrfForm({ ...vrfForm, rd: event.target.value })} placeholder="65000:100" /></label>
            <label>Description<input value={vrfForm.description} onChange={(event) => setVrfForm({ ...vrfForm, description: event.target.value })} placeholder="Corporate production routing domain" /></label>
            <button className="btn primary" type="submit">Add VRF</button>
          </form>

          <form className="ipam-form-panel" onSubmit={addVlan}>
            <h2>Add VLAN</h2>
            <label>VLAN ID<input value={vlanForm.vlanId} onChange={(event) => setVlanForm({ ...vlanForm, vlanId: event.target.value })} placeholder="120" /></label>
            <label>Name<input value={vlanForm.name} onChange={(event) => setVlanForm({ ...vlanForm, name: event.target.value })} placeholder="Database" /></label>
            <label>Site<select value={vlanForm.siteId} onChange={(event) => setVlanForm({ ...vlanForm, siteId: event.target.value })}>{inventory.sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>
            <label>VRF<select value={vlanForm.vrfId} onChange={(event) => setVlanForm({ ...vlanForm, vrfId: event.target.value })}>{inventory.vrfs.map((vrf) => <option value={vrf.id} key={vrf.id}>{vrf.name}</option>)}</select></label>
            <button className="btn primary" type="submit">Add VLAN</button>
          </form>

          <form className="ipam-form-panel" onSubmit={addPrefix}>
            <h2>Add prefix</h2>
            <label>Prefix<input value={prefixForm.cidr} onChange={(event) => setPrefixForm({ ...prefixForm, cidr: event.target.value })} placeholder="10.40.10.0/24" /></label>
            <label>Gateway<input value={prefixForm.gateway} onChange={(event) => setPrefixForm({ ...prefixForm, gateway: event.target.value })} placeholder="10.40.10.1" /></label>
            <label>Site<select value={prefixForm.siteId} onChange={(event) => setPrefixForm({ ...prefixForm, siteId: event.target.value })}>{inventory.sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>
            <label>VRF<select value={prefixForm.vrfId} onChange={(event) => setPrefixForm({ ...prefixForm, vrfId: event.target.value })}>{inventory.vrfs.map((vrf) => <option value={vrf.id} key={vrf.id}>{vrf.name}</option>)}</select></label>
            <label>VLAN<select value={prefixForm.vlanId} onChange={(event) => setPrefixForm({ ...prefixForm, vlanId: event.target.value })}><option value="">No VLAN</option>{inventory.vlans.map((vlan) => <option value={vlan.id} key={vlan.id}>{vlan.vlanId} · {vlan.name}</option>)}</select></label>
            <label>Purpose<input value={prefixForm.purpose} onChange={(event) => setPrefixForm({ ...prefixForm, purpose: event.target.value })} placeholder="User access" /></label>
            <button className="btn primary" type="submit">Add prefix</button>
          </form>

          <form className="ipam-form-panel wide" onSubmit={addAddress}>
            <h2>Add IP address / interface assignment</h2>
            <label>IP address<input value={ipForm.address} onChange={(event) => setIpForm({ ...ipForm, address: event.target.value })} placeholder="10.40.10.25" /></label>
            <label>Prefix<select value={ipForm.prefixId} onChange={(event) => setIpForm({ ...ipForm, prefixId: event.target.value })}>{inventory.prefixes.map((prefix) => <option value={prefix.id} key={prefix.id}>{prefix.cidr}</option>)}</select></label>
            <label>Device<input value={ipForm.device} onChange={(event) => setIpForm({ ...ipForm, device: event.target.value })} placeholder="BR-SW-01" /></label>
            <label>Interface<input value={ipForm.interfaceName} onChange={(event) => setIpForm({ ...ipForm, interfaceName: event.target.value })} placeholder="Gi1/0/1 or ens192" /></label>
            <label>Role<select value={ipForm.role} onChange={(event) => setIpForm({ ...ipForm, role: event.target.value as IpAddressRecord["role"] })}><option value="gateway">gateway</option><option value="server">server</option><option value="network-device">network-device</option><option value="dhcp">dhcp</option><option value="reserved">reserved</option><option value="unknown">unknown</option></select></label>
            <button className="btn primary" type="submit">Add IP assignment</button>
          </form>
        </section>
      )}

      {activeView === "import" && (
        <section className="ipam-import-layout section ipam-import-layout-upgraded">
          <div className="ipam-import-panel ipam-import-command-panel">
            <div className="panel-heading flat-heading">
              <div>
                <div className="eyebrow">Evidence intake</div>
                <h2>Paste or upload outputs, then stage reviewable facts</h2>
              </div>
              <span className="badge good">6 vendor parsers active</span>
            </div>
            <p className="ipam-panel-lead">
              NGINEER does not blindly add imported data. It extracts candidate facts, sanitizes evidence, and sends them to Review for approval before local inventory or Neo4j commit.
            </p>

            <div className="ipam-sample-row" aria-label="Load sample imports">
              {(Object.keys(sampleImports) as Array<keyof typeof sampleImports>).map((kind) => (
                <button className="btn" type="button" key={kind} onClick={() => loadSampleImport(kind)}>{sampleImports[kind].label}</button>
              ))}
            </div>

            <div className="form-grid ipam-import-fields">
              <label className="field">Source name<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="edge-fw-01-backup.conf or win-dc-01-ipconfig.txt" /></label>
              <label className="field">Parser hint<select value={forcedVendor} onChange={(event) => setForcedVendor(event.target.value as VendorKind)}>{vendorOptions.map((vendor) => <option key={vendor}>{vendor}</option>)}</select></label>
            </div>
            <label className="field section">Config / command output text<textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={`Paste evidence here, for example:

Cisco: show running-config, show ip interface brief, show vlan brief, show cdp neighbors detail
Fortinet: config system interface, config firewall policy, config router static
Windows: ipconfig /all, route print, systeminfo, Get-NetIPConfiguration
Linux: hostnamectl, ip addr, ip route, nmcli, /etc/os-release, netplan`} /></label>
            <div className="actions ipam-import-actions">
              <button className="btn primary" type="button" onClick={stagePastedImport}>Stage pasted evidence</button>
              <label className="btn file-btn">Upload evidence files<input type="file" multiple onChange={(event) => void handleFiles(event.target.files)} /></label>
              <button className="btn" type="button" onClick={() => setActiveView("review")}>Open review queue ({allFacts.length})</button>
            </div>
          </div>

          <aside className="ipam-side-panel ipam-parser-panel">
            <h2>Parser coverage</h2>
            <div className="ipam-parser-card-list">
              {parserCoverage.map((parser) => (
                <article key={parser.name}>
                  <strong>{parser.name}</strong>
                  <span>{parser.detail}</span>
                </article>
              ))}
            </div>

            <div className="ipam-latest-import">
              <div className="eyebrow">Current queue</div>
              {latestImport ? (
                <>
                  <strong>{latestImport.sourceName}</strong>
                  <span>{latestImport.vendor} · {latestImport.facts.length} staged facts</span>
                  <button className="btn" type="button" onClick={() => setActiveView("review")}>Review latest import</button>
                </>
              ) : (
                <p>No import jobs staged yet. Paste output or upload files to begin.</p>
              )}
            </div>
          </aside>
        </section>
      )}

      {activeView === "review" && (
        <section className="ipam-review-layout section">
          <div className="ipam-main-panel">
            <div className="panel-heading flat-heading">
              <div>
                <div className="eyebrow">Import staging</div>
                <h2>Review discovered facts before they become source of truth</h2>
              </div>
              <div className="actions compact-actions">
                <button className="btn" type="button" onClick={applyApprovedToIpam}>Apply approved locally</button>
                <button className="btn primary" type="button" onClick={commitToNeo4j}>Commit to Neo4j</button>
              </div>
            </div>

            <div className={`ipam-commit-state ${commitState.status}`}>{commitState.message}</div>

            {inventory.importJobs.length === 0 ? (
              <div className="ipam-empty-state">
                <div className="eyebrow">No staged evidence</div>
                <h3>Import configs or server outputs first.</h3>
                <p>Use Import evidence to paste Cisco/Fortinet configs, Windows outputs, or Linux command results. NGINEER will stage parsed facts here for approval.</p>
                <button className="btn primary" type="button" onClick={() => setActiveView("import")}>Go to import evidence</button>
              </div>
            ) : inventory.importJobs.map((job) => (
              <article className="import-job" key={job.id}>
                <div className="import-job-head">
                  <div><strong>{job.sourceName}</strong><span>{job.vendor} · {job.facts.length} facts · {new Date(job.createdAt).toLocaleString()}</span></div>
                  <button className="btn" type="button" onClick={() => approveAllFacts(job)}>Approve all non-warnings</button>
                </div>
                <div className="ipam-table-wrap">
                  <table className="table ipam-table">
                    <thead><tr><th>Approve</th><th>Type</th><th>Label</th><th>Value</th><th>Device</th><th>Interface</th><th>Confidence</th></tr></thead>
                    <tbody>
                      {job.facts.map((fact) => (
                        <tr key={fact.id}>
                          <td><input type="checkbox" checked={fact.approved} onChange={() => toggleFact(job.id, fact.id)} /></td>
                          <td><span className={`badge ${fact.confidence === "high" ? "good" : fact.confidence === "medium" ? "warn" : "danger"}`}>{fact.type}</span></td>
                          <td>{fact.label}</td>
                          <td><strong>{fact.value}</strong><span className="subtle-line">{fact.sanitizedEvidence}</span></td>
                          <td>{fact.device || "—"}</td>
                          <td>{fact.interfaceName || "—"}</td>
                          <td>{fact.confidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>

          <aside className="ipam-side-panel">
            <h2>API access</h2>
            <p>Commit and snapshot APIs are token-protected. Paste the value of <code>IPAM_API_TOKEN</code> from the server environment. It is stored only in this browser.</p>
            <label className="field">IPAM API token<input type="password" value={apiToken} onChange={(event) => updateApiToken(event.target.value)} placeholder="Paste IPAM_API_TOKEN value" autoComplete="off" /></label>

            <h2 className="section">Cypher preview</h2>
            <p>This is a compact preview of the approved facts. The API commit writes structured nodes and relationships to Neo4j. Demo seed rows are always excluded from commits.</p>
            <pre className="codebox mini-code">{buildCypherPreview(approvedFacts)}</pre>
          </aside>
        </section>
      )}
    </div>
  );
}
