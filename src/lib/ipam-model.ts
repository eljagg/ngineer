export type VendorKind =
  | "Cisco"
  | "Fortinet"
  | "Check Point"
  | "Ubiquiti"
  | "Windows"
  | "Linux"
  | "Unknown";

export type ImportFactType =
  | "device"
  | "interface"
  | "ip-address"
  | "prefix"
  | "vlan"
  | "vrf"
  | "route"
  | "firewall-policy"
  | "neighbor"
  | "warning";

export type SiteRecord = {
  id: string;
  name: string;
  region: string;
  role: "HQ" | "Branch" | "Data Center" | "Provider" | "Cloud" | "Unknown";
};

export type VrfRecord = {
  id: string;
  name: string;
  rd?: string;
  description: string;
};

export type VlanRecord = {
  id: string;
  vlanId: number;
  name: string;
  siteId: string;
  vrfId: string;
};

export type PrefixRecord = {
  id: string;
  cidr: string;
  siteId: string;
  vrfId: string;
  vlanId?: string;
  gateway?: string;
  purpose: string;
  status: "active" | "reserved" | "planned";
};

export type IpAddressRecord = {
  id: string;
  address: string;
  prefixId: string;
  vrfId: string;
  siteId: string;
  hostname?: string;
  device?: string;
  interfaceName?: string;
  role: "gateway" | "server" | "network-device" | "dhcp" | "reserved" | "unknown";
  source: "manual" | "imported" | "demo";
};

export type ImportFact = {
  id: string;
  type: ImportFactType;
  vendor: VendorKind;
  label: string;
  value: string;
  device?: string;
  interfaceName?: string;
  siteHint?: string;
  vrf?: string;
  vlan?: string;
  cidr?: string;
  ip?: string;
  prefix?: string;
  confidence: "high" | "medium" | "low";
  sourceFile: string;
  sanitizedEvidence?: string;
  approved: boolean;
};

export type ImportJob = {
  id: string;
  vendor: VendorKind;
  sourceName: string;
  createdAt: string;
  facts: ImportFact[];
  sanitizedPreview: string;
};

export type IpamInventory = {
  sites: SiteRecord[];
  vrfs: VrfRecord[];
  vlans: VlanRecord[];
  prefixes: PrefixRecord[];
  addresses: IpAddressRecord[];
  importJobs: ImportJob[];
};

export type IpamConflict = {
  id: string;
  severity: "danger" | "warn" | "info";
  title: string;
  detail: string;
  affected: string[];
};

const secretPatterns = [
  /(enable\s+secret\s+)(\S+)/gi,
  /(enable\s+password\s+)(\S+)/gi,
  /(password\s+)(0\s+|7\s+|5\s+|8\s+|9\s+)?(\S+)/gi,
  /(secret\s+)(0\s+|5\s+|8\s+|9\s+)?(\S+)/gi,
  /(snmp-server\s+community\s+)(\S+)/gi,
  /(radius-server\s+key\s+)(\S+)/gi,
  /(tacacs-server\s+key\s+)(\S+)/gi,
  /(pre-shared-key\s+)(\S+)/gi,
  /(set\s+psksecret\s+)(\S+)/gi,
  /(set\s+passwd\s+)(\S+)/gi,
  /(set\s+password\s+)(\S+)/gi,
  /(set\s+key\s+)(\S+)/gi,
  /(set\s+secret\s+)(\S+)/gi,
  /(api[-_ ]?key\s*[=:]\s*)(\S+)/gi,
  /(token\s*[=:]\s*)(\S+)/gi
];

export const demoInventory: IpamInventory = {
  sites: [
    { id: "site-branch", name: "Branch", region: "Jamaica", role: "Branch" },
    { id: "site-hq", name: "HQ", region: "Jamaica", role: "HQ" },
    { id: "site-provider", name: "Provider MPLS", region: "Service Provider", role: "Provider" }
  ],
  vrfs: [
    { id: "vrf-cust-a", name: "CUST-A", rd: "65000:100", description: "Customer production VPN / corporate routing domain" },
    { id: "vrf-global", name: "Global", description: "Provider/global transport table" }
  ],
  vlans: [
    { id: "vlan-20", vlanId: 20, name: "Branch-Users", siteId: "site-branch", vrfId: "vrf-cust-a" },
    { id: "vlan-120", vlanId: 120, name: "HQ-Database", siteId: "site-hq", vrfId: "vrf-cust-a" }
  ],
  prefixes: [
    { id: "prefix-10-20-30", cidr: "10.20.30.0/24", siteId: "site-branch", vrfId: "vrf-cust-a", vlanId: "vlan-20", gateway: "10.20.30.1", purpose: "Branch user access", status: "active" },
    { id: "prefix-10-120-10", cidr: "10.120.10.0/24", siteId: "site-hq", vrfId: "vrf-cust-a", vlanId: "vlan-120", gateway: "10.120.10.1", purpose: "HQ database segment", status: "active" },
    { id: "prefix-172-16-0", cidr: "172.16.0.0/30", siteId: "site-provider", vrfId: "vrf-global", purpose: "Provider PE-P core link", status: "active" }
  ],
  addresses: [
    { id: "ip-10-20-30-1", address: "10.20.30.1", prefixId: "prefix-10-20-30", vrfId: "vrf-cust-a", siteId: "site-branch", device: "BR-CE-01", interfaceName: "Gi0/0/1.20", role: "gateway", source: "demo" },
    { id: "ip-10-120-10-1", address: "10.120.10.1", prefixId: "prefix-10-120-10", vrfId: "vrf-cust-a", siteId: "site-hq", device: "HQ-FW-01", interfaceName: "ethernet1/2", role: "gateway", source: "demo" },
    { id: "ip-10-120-10-25", address: "10.120.10.25", prefixId: "prefix-10-120-10", vrfId: "vrf-cust-a", siteId: "site-hq", hostname: "HQ-DB-01", device: "HQ-DB-01", interfaceName: "ens192", role: "server", source: "demo" }
  ],
  importJobs: []
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function createId(prefix: string, value: string): string {
  return `${prefix}-${slugify(value)}`;
}

export function sanitizeConfigText(text: string): string {
  let sanitized = text;
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (_match, first = "", second = "", third = "") => {
      if (third) return `${first}${second || ""}<redacted>`;
      return `${first}<redacted>`;
    });
  }
  return sanitized;
}

export function detectVendor(text: string, fileName = ""): VendorKind {
  const haystack = `${fileName}\n${text}`.toLowerCase();

  if (/fortigate|fortios|config firewall|config system interface|set allowaccess/.test(haystack)) return "Fortinet";
  if (/checkpoint|check point|clish|fw ctl|set interface .* ipv4-address|gaia/.test(haystack)) return "Check Point";
  if (/unifi|ubiquiti|edgeos|interfaces ethernet|ubnt|switch-port profile/.test(haystack)) return "Ubiquiti";
  if (/windows ip configuration|ethernet adapter|get-netipconfiguration|dhcp server|active directory/.test(haystack)) return "Windows";
  if (/linux|ubuntu|red hat|rhel|centos|oracle linux|inet\s+\d+\.\d+\.\d+\.\d+\/\d+|networkmanager|netplan/.test(haystack)) return "Linux";
  if (/^hostname\s+\S+/m.test(text) || /interface\s+(gigabitethernet|tengigabitethernet|fastethernet|vlan|loopback|port-channel)/i.test(text) || /show ip interface brief/i.test(text)) return "Cisco";

  return "Unknown";
}

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

export function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

export function prefixToRange(cidr: string): { network: number; broadcast: number; mask: number; size: number } | null {
  const [ip, maskString] = cidr.trim().split("/");
  const base = ipv4ToInt(ip);
  const mask = Number(maskString);
  if (base === null || !Number.isInteger(mask) || mask < 0 || mask > 32) return null;
  const maskBits = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0;
  const network = base & maskBits;
  const size = Math.pow(2, 32 - mask);
  const broadcast = (network + size - 1) >>> 0;
  return { network, broadcast, mask, size };
}

export function ipIsInsidePrefix(ip: string, cidr: string): boolean {
  const value = ipv4ToInt(ip);
  const range = prefixToRange(cidr);
  if (value === null || !range) return false;
  return value >= range.network && value <= range.broadcast;
}

export function derivePrefixFromIp(ip: string, maskOrCidr: string): string | null {
  const value = ipv4ToInt(ip);
  if (value === null) return null;

  const parsedMask = maskOrCidr.includes(".") ? maskToPrefixLength(maskOrCidr) : Number(maskOrCidr.replace("/", ""));
  if (parsedMask === null || !Number.isInteger(parsedMask) || parsedMask < 0 || parsedMask > 32) return null;

  const maskBits = parsedMask === 0 ? 0 : (0xffffffff << (32 - parsedMask)) >>> 0;
  return `${intToIpv4(value & maskBits)}/${parsedMask}`;
}

export function maskToPrefixLength(mask: string): number | null {
  const value = ipv4ToInt(mask);
  if (value === null) return null;
  const binary = value.toString(2).padStart(32, "0");
  if (!/^1*0*$/.test(binary)) return null;
  return binary.indexOf("0") === -1 ? 32 : binary.indexOf("0");
}

export function getBestPrefixId(address: string, prefixes: PrefixRecord[], fallbackSiteId: string, fallbackVrfId: string): string {
  const matches = prefixes
    .filter((prefix) => prefix.siteId === fallbackSiteId && prefix.vrfId === fallbackVrfId && ipIsInsidePrefix(address, prefix.cidr))
    .sort((a, b) => (prefixToRange(b.cidr)?.mask ?? 0) - (prefixToRange(a.cidr)?.mask ?? 0));

  return matches[0]?.id || "unassigned-prefix";
}

export function getPrefixUtilization(prefix: PrefixRecord, addresses: IpAddressRecord[]): { used: number; usable: number; percent: number } {
  const range = prefixToRange(prefix.cidr);
  const used = addresses.filter((address) => address.prefixId === prefix.id).length;
  if (!range) return { used, usable: 0, percent: 0 };
  const usable = range.mask >= 31 ? range.size : Math.max(range.size - 2, 0);
  return { used, usable, percent: usable > 0 ? Math.min(100, Math.round((used / usable) * 100)) : 0 };
}

export function findIpamConflicts(inventory: IpamInventory): IpamConflict[] {
  const conflicts: IpamConflict[] = [];
  const addressGroups = new Map<string, IpAddressRecord[]>();

  for (const address of inventory.addresses) {
    const key = `${address.vrfId}:${address.address}`;
    addressGroups.set(key, [...(addressGroups.get(key) || []), address]);
  }

  for (const [key, rows] of addressGroups) {
    if (rows.length > 1) {
      conflicts.push({
        id: `duplicate-${key}`,
        severity: "danger",
        title: `Duplicate IP in ${rows[0].vrfId}`,
        detail: `${rows[0].address} appears ${rows.length} times in the same VRF.`,
        affected: rows.map((row) => `${row.device || row.hostname || "unknown"} ${row.interfaceName || ""}`.trim())
      });
    }
  }

  for (let i = 0; i < inventory.prefixes.length; i += 1) {
    for (let j = i + 1; j < inventory.prefixes.length; j += 1) {
      const a = inventory.prefixes[i];
      const b = inventory.prefixes[j];
      if (a.vrfId !== b.vrfId) continue;
      const ar = prefixToRange(a.cidr);
      const br = prefixToRange(b.cidr);
      if (!ar || !br) continue;
      const overlaps = ar.network <= br.broadcast && br.network <= ar.broadcast;
      if (overlaps) {
        conflicts.push({
          id: `overlap-${a.id}-${b.id}`,
          severity: "warn",
          title: "Overlapping prefixes",
          detail: `${a.cidr} overlaps ${b.cidr} inside ${a.vrfId}.`,
          affected: [a.cidr, b.cidr]
        });
      }
    }
  }

  for (const prefix of inventory.prefixes) {
    if (prefix.gateway && !ipIsInsidePrefix(prefix.gateway, prefix.cidr)) {
      conflicts.push({
        id: `gateway-${prefix.id}`,
        severity: "danger",
        title: "Gateway outside prefix",
        detail: `${prefix.gateway} is not inside ${prefix.cidr}.`,
        affected: [prefix.cidr, prefix.gateway]
      });
    }
  }

  return conflicts;
}

function pushFact(facts: ImportFact[], partial: Omit<ImportFact, "id" | "approved">) {
  const id = createId(`fact-${facts.length + 1}`, `${partial.type}-${partial.value}-${partial.sourceFile}`);
  if (!facts.some((fact) => fact.type === partial.type && fact.value === partial.value && fact.device === partial.device && fact.interfaceName === partial.interfaceName)) {
    facts.push({ ...partial, id, approved: partial.confidence === "high" });
  }
}

function extractHostname(text: string, vendor: VendorKind): string | undefined {
  const cisco = text.match(/^hostname\s+(\S+)/m)?.[1];
  if (cisco) return cisco;
  const fortinet = text.match(/set\s+hostname\s+"?([^"\n]+)"?/i)?.[1];
  if (fortinet) return fortinet.trim();
  const linux = text.match(/^hostname\s*[:=]?\s*(\S+)/im)?.[1] || text.match(/^\s*Static hostname:\s*(\S+)/im)?.[1];
  if (linux) return linux;
  const windows = text.match(/^\s*Host Name\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*:\s*(.+)$/im)?.[1];
  if (windows) return windows.trim();
  return vendor === "Unknown" ? undefined : `${vendor}-import`;
}
type CiscoParserContext = {
  rawText: string;
  sourceFile: string;
  hostname?: string;
  facts: ImportFact[];
};

function normalizeCiscoInterfaceName(name: string): string {
  return name
    .replace(/^Gi(?=\d)/i, "GigabitEthernet")
    .replace(/^Te(?=\d)/i, "TenGigabitEthernet")
    .replace(/^Fa(?=\d)/i, "FastEthernet")
    .replace(/^Eth(?=\d)/i, "Ethernet")
    .trim();
}

function parseCiscoRunningConfigInterfaces({ rawText, sourceFile, hostname, facts }: CiscoParserContext) {
  const interfaceBlocks = rawText.split(/\n(?=interface\s+)/i);

  for (const block of interfaceBlocks) {
    const interfaceName = block.match(/^interface\s+([^\n]+)/i)?.[1]?.trim();
    if (!interfaceName) continue;

    const normalizedInterface = normalizeCiscoInterfaceName(interfaceName);
    const evidence = sanitizeConfigText(block.split("\n").slice(0, 12).join("\n"));

    pushFact(facts, {
      type: "interface",
      vendor: "Cisco",
      label: "Cisco running-config interface",
      value: normalizedInterface,
      device: hostname,
      interfaceName: normalizedInterface,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: evidence
    });

    const description = block.match(/^\s*description\s+([^\n]+)/im)?.[1]?.trim();
    const vrf = block.match(/^\s*(?:vrf|ip\s+vrf)\s+forwarding\s+(\S+)/im)?.[1];
    const accessVlan = block.match(/^\s*switchport\s+access\s+vlan\s+(\d+)/im)?.[1];
    const voiceVlan = block.match(/^\s*switchport\s+voice\s+vlan\s+(\d+)/im)?.[1];
    const nativeVlan = block.match(/^\s*switchport\s+trunk\s+native\s+vlan\s+(\d+)/im)?.[1];
    const allowedVlan = block.match(/^\s*switchport\s+trunk\s+allowed\s+vlan\s+([^\n]+)/im)?.[1]?.trim();
    const switchportMode = block.match(/^\s*switchport\s+mode\s+(access|trunk|dynamic desirable|dynamic auto)/im)?.[1];
    const channelGroup = block.match(/^\s*channel-group\s+(\d+)/im)?.[1];
    const isShutdown = /^\s*shutdown\s*$/im.test(block);

    if (description) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Cisco",
        label: "Interface description / possible peer",
        value: description,
        device: hostname,
        interfaceName: normalizedInterface,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n description ${description}`
      });
    }

    if (vrf) {
      pushFact(facts, {
        type: "vrf",
        vendor: "Cisco",
        label: "Interface VRF",
        value: vrf,
        device: hostname,
        interfaceName: normalizedInterface,
        vrf,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n vrf forwarding ${vrf}`
      });
    }

    for (const [label, vlan] of [["Access VLAN", accessVlan], ["Voice VLAN", voiceVlan], ["Native trunk VLAN", nativeVlan]] as const) {
      if (!vlan) continue;
      pushFact(facts, {
        type: "vlan",
        vendor: "Cisco",
        label,
        value: vlan,
        device: hostname,
        interfaceName: normalizedInterface,
        vlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n ${label}: ${vlan}`
      });
    }

    if (allowedVlan || switchportMode || channelGroup) {
      pushFact(facts, {
        type: "interface",
        vendor: "Cisco",
        label: "Cisco switching role",
        value: [switchportMode ? `mode ${switchportMode}` : undefined, allowedVlan ? `allowed VLANs ${allowedVlan}` : undefined, channelGroup ? `port-channel ${channelGroup}` : undefined].filter(Boolean).join("; "),
        device: hostname,
        interfaceName: normalizedInterface,
        vlan: accessVlan || nativeVlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: evidence
      });
    }

    if (isShutdown) {
      pushFact(facts, {
        type: "warning",
        vendor: "Cisco",
        label: "Administratively shutdown interface",
        value: normalizedInterface,
        device: hostname,
        interfaceName: normalizedInterface,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n shutdown`
      });
    }

    const ipMatches = block.matchAll(/^\s*ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)(?:\s+secondary)?/gim);
    for (const ipMatch of ipMatches) {
      const ip = ipMatch[1];
      const cidr = derivePrefixFromIp(ip, ipMatch[2]);
      if (!cidr) continue;
      const sviVlan = normalizedInterface.toLowerCase().startsWith("vlan") ? normalizedInterface.replace(/\D+/g, "") : undefined;

      pushFact(facts, {
        type: "prefix",
        vendor: "Cisco",
        label: "Connected prefix from running-config",
        value: cidr,
        device: hostname,
        interfaceName: normalizedInterface,
        cidr,
        prefix: cidr,
        vrf,
        vlan: sviVlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n ip address ${ip} ${ipMatch[2]}`
      });

      pushFact(facts, {
        type: "ip-address",
        vendor: "Cisco",
        label: "Interface IP address from running-config",
        value: ip,
        device: hostname,
        interfaceName: normalizedInterface,
        ip,
        cidr,
        prefix: cidr,
        vrf,
        vlan: sviVlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: `interface ${normalizedInterface}\n ip address ${ip} ${ipMatch[2]}`
      });
    }
  }
}

function parseCiscoVlanConfig({ rawText, sourceFile, hostname, facts }: CiscoParserContext) {
  const vlanBlocks = rawText.matchAll(/^vlan\s+(\d+)([\s\S]*?)(?=^!|^vlan\s+\d+|^interface\s+|^router\s+|$)/gim);
  for (const match of vlanBlocks) {
    const vlan = match[1];
    const name = match[2].match(/^\s*name\s+([^\n]+)/im)?.[1]?.trim();
    pushFact(facts, {
      type: "vlan",
      vendor: "Cisco",
      label: name ? "VLAN from running-config" : "VLAN ID from running-config",
      value: name ? `${vlan} ${name}` : vlan,
      device: hostname,
      vlan,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: `vlan ${vlan}${name ? `\n name ${name}` : ""}`
    });
  }
}

function parseCiscoRoutingConfig({ rawText, sourceFile, hostname, facts }: CiscoParserContext) {
  const staticRoutes = rawText.matchAll(/^ip\s+route(?:\s+vrf\s+(\S+))?\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)/gim);
  for (const match of staticRoutes) {
    const vrf = match[1];
    const cidr = derivePrefixFromIp(match[2], match[3]);
    pushFact(facts, {
      type: "route",
      vendor: "Cisco",
      label: vrf ? "Static route in VRF" : "Static route",
      value: `${cidr || `${match[2]} ${match[3]}`} via ${match[4]}`,
      device: hostname,
      vrf,
      cidr: cidr || undefined,
      prefix: cidr || undefined,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: match[0]
    });
  }

  const ospfProcesses = rawText.matchAll(/^router\s+ospf\s+(\S+)([\s\S]*?)(?=^!|^router\s+|^interface\s+|$)/gim);
  for (const match of ospfProcesses) {
    const processId = match[1];
    const routerId = match[2].match(/^\s*router-id\s+(\S+)/im)?.[1];
    const vrf = match[2].match(/^\s*vrf\s+(\S+)/im)?.[1];
    pushFact(facts, {
      type: "route",
      vendor: "Cisco",
      label: "OSPF routing process",
      value: `OSPF ${processId}${routerId ? ` router-id ${routerId}` : ""}`,
      device: hostname,
      vrf,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0].split("\n").slice(0, 14).join("\n"))
    });

    for (const network of match[2].matchAll(/^\s*network\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+area\s+(\S+)/gim)) {
      pushFact(facts, {
        type: "route",
        vendor: "Cisco",
        label: "OSPF network statement",
        value: `${network[1]} wildcard ${network[2]} area ${network[3]}`,
        device: hostname,
        vrf,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: network[0]
      });
    }
  }

  const bgpProcesses = rawText.matchAll(/^router\s+bgp\s+(\d+)([\s\S]*?)(?=^!|^router\s+|^interface\s+|$)/gim);
  for (const match of bgpProcesses) {
    const asn = match[1];
    pushFact(facts, {
      type: "route",
      vendor: "Cisco",
      label: "BGP routing process",
      value: `BGP AS ${asn}`,
      device: hostname,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0].split("\n").slice(0, 16).join("\n"))
    });

    for (const neighbor of match[2].matchAll(/^\s*neighbor\s+(\d+\.\d+\.\d+\.\d+)\s+remote-as\s+(\d+)/gim)) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Cisco",
        label: "BGP neighbor from running-config",
        value: `${neighbor[1]} remote-as ${neighbor[2]}`,
        device: hostname,
        ip: neighbor[1],
        confidence: "high",
        sourceFile,
        sanitizedEvidence: neighbor[0]
      });
    }
  }
}

function parseCiscoShowOutputs({ rawText, sourceFile, hostname, facts }: CiscoParserContext) {
  const lines = rawText.split("\n");

  const versionModel = rawText.match(/Cisco\s+(?:IOS|IOS XE)[\s\S]*?\n(?:.*?)(?:processor|bytes of memory)/i)?.[0] || rawText.match(/cisco\s+([A-Za-z0-9-]+)\s+\(/i)?.[0];
  const serial = rawText.match(/System serial number\s*:\s*(\S+)/i)?.[1] || rawText.match(/Processor board ID\s+(\S+)/i)?.[1];
  if (versionModel || serial) {
    pushFact(facts, {
      type: "device",
      vendor: "Cisco",
      label: "Cisco platform evidence",
      value: [versionModel ? versionModel.replace(/\s+/g, " ").slice(0, 96) : undefined, serial ? `serial ${serial}` : undefined].filter(Boolean).join("; "),
      device: hostname,
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: [versionModel, serial ? `System serial number: ${serial}` : undefined].filter(Boolean).join("\n")
    });
  }

  for (const line of lines) {
    const showIpBrief = line.match(/^\s*([A-Za-z][A-Za-z0-9/_.-]+)\s+(\d+\.\d+\.\d+\.\d+|unassigned)\s+\S+\s+\S+\s+(administratively down|up|down)\s+(up|down)/i);
    if (showIpBrief) {
      const interfaceName = normalizeCiscoInterfaceName(showIpBrief[1]);
      pushFact(facts, {
        type: "interface",
        vendor: "Cisco",
        label: "show ip interface brief status",
        value: `${interfaceName} ${showIpBrief[3]}/${showIpBrief[4]}`,
        device: hostname,
        interfaceName,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });

      if (showIpBrief[2] !== "unassigned") {
        pushFact(facts, {
          type: "ip-address",
          vendor: "Cisco",
          label: "show ip interface brief address",
          value: showIpBrief[2],
          device: hostname,
          interfaceName,
          ip: showIpBrief[2],
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }
    }

    const interfaceStatus = line.match(/^\s*([A-Za-z][A-Za-z0-9/_.-]+)\s+(.{0,24}?)\s+(connected|notconnect|disabled|err-disabled|sfpAbsent|inactive)\s+(\S+)\s+(auto|a-full|full|half|\S+)\s+(auto|\d+|a-\d+|\S+)\s+(.+)$/i);
    if (interfaceStatus && !/^Port\s+Name\s+Status/i.test(line)) {
      const interfaceName = normalizeCiscoInterfaceName(interfaceStatus[1]);
      const vlan = /^\d+$/.test(interfaceStatus[4]) ? interfaceStatus[4] : undefined;
      pushFact(facts, {
        type: "interface",
        vendor: "Cisco",
        label: "show interfaces status port",
        value: `${interfaceName} ${interfaceStatus[3]} vlan ${interfaceStatus[4]} ${interfaceStatus[7].trim()}`,
        device: hostname,
        interfaceName,
        vlan,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      if (vlan) {
        pushFact(facts, {
          type: "vlan",
          vendor: "Cisco",
          label: "Access VLAN from interface status",
          value: vlan,
          device: hostname,
          interfaceName,
          vlan,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }
    }

    const vlanBrief = line.match(/^\s*(\d+)\s+([A-Za-z0-9_.-]+)\s+(active|suspended|act\/lshut)(?:\s+(.+))?/i);
    if (vlanBrief) {
      pushFact(facts, {
        type: "vlan",
        vendor: "Cisco",
        label: "VLAN from show vlan brief",
        value: `${vlanBrief[1]} ${vlanBrief[2]}`,
        device: hostname,
        vlan: vlanBrief[1],
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      if (vlanBrief[4]) {
        for (const iface of vlanBrief[4].split(/,\s*/).filter(Boolean)) {
          pushFact(facts, {
            type: "interface",
            vendor: "Cisco",
            label: "VLAN membership from show vlan brief",
            value: `${normalizeCiscoInterfaceName(iface)} in VLAN ${vlanBrief[1]}`,
            device: hostname,
            interfaceName: normalizeCiscoInterfaceName(iface),
            vlan: vlanBrief[1],
            confidence: "medium",
            sourceFile,
            sanitizedEvidence: line.trim()
          });
        }
      }
    }

    const trunkLine = line.match(/^\s*([A-Za-z][A-Za-z0-9/_.-]+)\s+(on|auto|desirable|nonegotiate)\s+(\S+)\s+(trunking|not-trunking)\s+(\d+)/i);
    if (trunkLine) {
      pushFact(facts, {
        type: "interface",
        vendor: "Cisco",
        label: "show interfaces trunk",
        value: `${normalizeCiscoInterfaceName(trunkLine[1])} ${trunkLine[4]} native VLAN ${trunkLine[5]}`,
        device: hostname,
        interfaceName: normalizeCiscoInterfaceName(trunkLine[1]),
        vlan: trunkLine[5],
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
    }

    const routeLine = line.match(/^\s*(O|IA|E1|E2|B|D|EX|C|L|S|R)\*?\s+(\d+\.\d+\.\d+\.\d+\/\d+)(?:\s+\[.*?\])?(?:\s+via\s+(\d+\.\d+\.\d+\.\d+))?(?:,\s*([^,\n]+))?/i);
    if (routeLine) {
      pushFact(facts, {
        type: "route",
        vendor: "Cisco",
        label: "Route from show ip route",
        value: `${routeLine[1]} ${routeLine[2]}${routeLine[3] ? ` via ${routeLine[3]}` : ""}`,
        device: hostname,
        cidr: routeLine[2],
        prefix: routeLine[2],
        ip: routeLine[3],
        confidence: routeLine[1] === "C" || routeLine[1] === "L" ? "high" : "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
    }

    const ospfNeighbor = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+\d+\s+([A-Z/]+)\s+\S+\s+(\d+\.\d+\.\d+\.\d+)\s+([A-Za-z0-9/_.-]+)/i);
    if (ospfNeighbor && !/Neighbor\s+ID/i.test(line)) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Cisco",
        label: "OSPF neighbor",
        value: `${ospfNeighbor[1]} ${ospfNeighbor[2]} via ${ospfNeighbor[4]}`,
        device: hostname,
        interfaceName: normalizeCiscoInterfaceName(ospfNeighbor[4]),
        ip: ospfNeighbor[3],
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
    }

    const bgpNeighbor = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+\d+\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\S+\s+(\S+)/i);
    if (bgpNeighbor && !/Neighbor\s+V/i.test(line)) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Cisco",
        label: "BGP neighbor summary",
        value: `${bgpNeighbor[1]} remote-as ${bgpNeighbor[2]} state/pfx ${bgpNeighbor[3]}`,
        device: hostname,
        ip: bgpNeighbor[1],
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
    }
  }
}

function parseCiscoDiscoveryNeighbors({ rawText, sourceFile, hostname, facts }: CiscoParserContext) {
  const cdpBlocks = rawText.split(/-{5,}|\n(?=Device ID\s*:)/i).filter((block) => /Device ID\s*:/i.test(block));
  for (const block of cdpBlocks) {
    const remoteDevice = block.match(/Device ID\s*:\s*([^\n]+)/i)?.[1]?.trim();
    const localInterface = block.match(/Interface\s*:\s*([^,\n]+),\s*Port ID \(outgoing port\)\s*:\s*([^\n]+)/i);
    const platform = block.match(/Platform\s*:\s*([^,\n]+)/i)?.[1]?.trim();
    const managementIp = block.match(/IP address\s*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (!remoteDevice || !localInterface) continue;

    pushFact(facts, {
      type: "neighbor",
      vendor: "Cisco",
      label: "CDP topology link",
      value: `${hostname || "local"}:${normalizeCiscoInterfaceName(localInterface[1].trim())} -> ${remoteDevice}:${normalizeCiscoInterfaceName(localInterface[2].trim())}`,
      device: hostname,
      interfaceName: normalizeCiscoInterfaceName(localInterface[1].trim()),
      ip: managementIp,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText([`Device ID: ${remoteDevice}`, `Interface: ${localInterface[1].trim()}`, `Port ID: ${localInterface[2].trim()}`, platform ? `Platform: ${platform}` : undefined, managementIp ? `IP address: ${managementIp}` : undefined].filter(Boolean).join("\n"))
    });
  }

  const lldpBlocks = rawText.split(/-{5,}|\n(?=Local Intf\s*:|System Name\s*:)/i).filter((block) => /System Name\s*:|Local Intf\s*:/i.test(block));
  for (const block of lldpBlocks) {
    const remoteDevice = block.match(/System Name\s*:\s*([^\n]+)/i)?.[1]?.trim() || block.match(/System Description\s*:\s*([^\n]+)/i)?.[1]?.trim();
    const localInterface = block.match(/Local Intf\s*:\s*([^\n]+)/i)?.[1]?.trim();
    const remotePort = block.match(/Port id\s*:\s*([^\n]+)/i)?.[1]?.trim();
    if (!remoteDevice || !localInterface || !remotePort) continue;

    pushFact(facts, {
      type: "neighbor",
      vendor: "Cisco",
      label: "LLDP topology link",
      value: `${hostname || "local"}:${normalizeCiscoInterfaceName(localInterface)} -> ${remoteDevice}:${normalizeCiscoInterfaceName(remotePort)}`,
      device: hostname,
      interfaceName: normalizeCiscoInterfaceName(localInterface),
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText([`System Name: ${remoteDevice}`, `Local Intf: ${localInterface}`, `Port id: ${remotePort}`].join("\n"))
    });
  }
}

function parseCiscoFacts(rawText: string, sourceFile: string, hostname: string | undefined, facts: ImportFact[]) {
  const context = { rawText, sourceFile, hostname, facts };
  parseCiscoRunningConfigInterfaces(context);
  parseCiscoVlanConfig(context);
  parseCiscoRoutingConfig(context);
  parseCiscoShowOutputs(context);
  parseCiscoDiscoveryNeighbors(context);
}


type FortinetParserContext = {
  rawText: string;
  sourceFile: string;
  hostname?: string;
  facts: ImportFact[];
};

function normalizeFortinetValue(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim().replace(/^"|"$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function splitFortinetList(value: string | undefined): string[] {
  if (!value) return [];
  const matches = [...value.matchAll(/"([^"]+)"|(\S+)/g)];
  return matches.map((match) => normalizeFortinetValue(match[1] || match[2])).filter(Boolean) as string[];
}

function getFortinetSetValue(block: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`^\\s*set\\s+${escapedKey}\\s+(.+)$`, "im"));
  return normalizeFortinetValue(match?.[1]);
}

function getFortinetSetList(block: string, key: string): string[] {
  return splitFortinetList(getFortinetSetValue(block, key));
}

function getFortinetConfigSections(rawText: string, header: string): string[] {
  const sections: string[] = [];
  const lines = rawText.split(/\r?\n/);
  const headerLower = header.toLowerCase();
  let collecting = false;
  let depth = 0;
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (!collecting && lower === headerLower) {
      collecting = true;
      depth = 1;
      current = [];
      continue;
    }

    if (!collecting) continue;

    if (/^config\s+/i.test(trimmed)) {
      depth += 1;
      current.push(line);
      continue;
    }

    if (/^end$/i.test(trimmed)) {
      depth -= 1;
      if (depth === 0) {
        sections.push(current.join("\n"));
        collecting = false;
        current = [];
        continue;
      }
    }

    current.push(line);
  }

  return sections;
}

function parseFortinetEditBlocks(section: string): Array<{ name: string; body: string }> {
  const blocks: Array<{ name: string; body: string }> = [];
  const pattern = /^\s*edit\s+(?:"([^"]+)"|(\S+))\s*$([\s\S]*?)(?=^\s*next\s*$|^\s*edit\s+(?:"[^"]+"|\S+)\s*$|\s*$)/gim;
  for (const match of section.matchAll(pattern)) {
    const name = normalizeFortinetValue(match[1] || match[2]);
    if (!name) continue;
    blocks.push({ name, body: match[3] || "" });
  }
  return blocks;
}

function pushFortinetInterfaceFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config system interface")) {
    for (const { name: interfaceName, body } of parseFortinetEditBlocks(section)) {
      const ipMatch = body.match(/^\s*set\s+ip\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/im);
      const alias = getFortinetSetValue(body, "alias");
      const role = getFortinetSetValue(body, "role");
      const type = getFortinetSetValue(body, "type");
      const parentInterface = getFortinetSetValue(body, "interface");
      const vlan = getFortinetSetValue(body, "vlanid");
      const vdom = getFortinetSetValue(body, "vdom");
      const vrfNumber = getFortinetSetValue(body, "vrf");
      const status = getFortinetSetValue(body, "status");
      const allowAccess = getFortinetSetValue(body, "allowaccess");
      const evidence = sanitizeConfigText([`edit "${interfaceName}"`, ...body.split("\n").slice(0, 12)].join("\n"));

      pushFact(facts, {
        type: "interface",
        vendor: "Fortinet",
        label: "Fortinet system interface",
        value: [interfaceName, type ? `type ${type}` : undefined, role ? `role ${role}` : undefined, alias ? `alias ${alias}` : undefined].filter(Boolean).join("; "),
        device: hostname,
        interfaceName,
        vlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: evidence
      });

      if (parentInterface || type === "vlan" || type === "aggregate" || type === "tunnel") {
        pushFact(facts, {
          type: "interface",
          vendor: "Fortinet",
          label: "Fortinet logical interface relationship",
          value: `${interfaceName}${parentInterface ? ` parent ${parentInterface}` : ""}${type ? ` type ${type}` : ""}`,
          device: hostname,
          interfaceName,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: evidence
        });
      }

      if (vdom) {
        pushFact(facts, {
          type: "vrf",
          vendor: "Fortinet",
          label: "Fortinet VDOM routing context",
          value: vdom,
          device: hostname,
          interfaceName,
          vrf: vdom,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `edit "${interfaceName}"\n set vdom "${vdom}"`
        });
      }

      if (vrfNumber) {
        const vrf = `VRF-${vrfNumber}`;
        pushFact(facts, {
          type: "vrf",
          vendor: "Fortinet",
          label: "Fortinet interface VRF",
          value: vrf,
          device: hostname,
          interfaceName,
          vrf,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `edit "${interfaceName}"\n set vrf ${vrfNumber}`
        });
      }

      if (vlan) {
        pushFact(facts, {
          type: "vlan",
          vendor: "Fortinet",
          label: "Fortinet VLAN interface",
          value: vlan,
          device: hostname,
          interfaceName,
          vlan,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `edit "${interfaceName}"\n set vlanid ${vlan}`
        });
      }

      if (ipMatch) {
        const cidr = derivePrefixFromIp(ipMatch[1], ipMatch[2]);
        if (cidr) {
          pushFact(facts, {
            type: "prefix",
            vendor: "Fortinet",
            label: "Fortinet interface prefix",
            value: cidr,
            device: hostname,
            interfaceName,
            cidr,
            prefix: cidr,
            vlan,
            confidence: "high",
            sourceFile,
            sanitizedEvidence: `edit "${interfaceName}"\n set ip ${ipMatch[1]} ${ipMatch[2]}`
          });
          pushFact(facts, {
            type: "ip-address",
            vendor: "Fortinet",
            label: "Fortinet interface IP",
            value: ipMatch[1],
            device: hostname,
            interfaceName,
            ip: ipMatch[1],
            cidr,
            prefix: cidr,
            vlan,
            confidence: "high",
            sourceFile,
            sanitizedEvidence: `edit "${interfaceName}"\n set ip ${ipMatch[1]} ${ipMatch[2]}`
          });
        }
      }

      if (status === "down") {
        pushFact(facts, {
          type: "warning",
          vendor: "Fortinet",
          label: "Fortinet interface disabled",
          value: `${interfaceName} is administratively down`,
          device: hostname,
          interfaceName,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `edit "${interfaceName}"\n set status down`
        });
      }

      if (allowAccess && /\b(http|https|ssh|telnet|snmp)\b/i.test(allowAccess)) {
        pushFact(facts, {
          type: "warning",
          vendor: "Fortinet",
          label: "Fortinet management access enabled",
          value: `${interfaceName}: ${allowAccess}`,
          device: hostname,
          interfaceName,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `edit "${interfaceName}"\n set allowaccess ${allowAccess}`
        });
      }
    }
  }
}

function pushFortinetZoneFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config system zone")) {
    for (const { name: zoneName, body } of parseFortinetEditBlocks(section)) {
      const members = getFortinetSetList(body, "interface");
      if (members.length === 0) continue;
      pushFact(facts, {
        type: "interface",
        vendor: "Fortinet",
        label: "Fortinet zone membership",
        value: `${zoneName}: ${members.join(", ")}`,
        device: hostname,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: `edit "${zoneName}"\n set interface ${members.map((item) => `"${item}"`).join(" ")}`
      });
    }
  }
}

function pushFortinetAddressFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config firewall address")) {
    for (const { name: objectName, body } of parseFortinetEditBlocks(section)) {
      const subnet = body.match(/^\s*set\s+subnet\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/im);
      const startIp = getFortinetSetValue(body, "start-ip");
      const endIp = getFortinetSetValue(body, "end-ip");
      const fqdn = getFortinetSetValue(body, "fqdn");

      if (subnet) {
        const cidr = derivePrefixFromIp(subnet[1], subnet[2]);
        if (cidr) {
          pushFact(facts, {
            type: "prefix",
            vendor: "Fortinet",
            label: "Fortinet address object subnet",
            value: `${objectName} ${cidr}`,
            device: hostname,
            cidr,
            prefix: cidr,
            confidence: "medium",
            sourceFile,
            sanitizedEvidence: `edit "${objectName}"\n set subnet ${subnet[1]} ${subnet[2]}`
          });
        }
      }

      for (const [label, ip] of [["Fortinet address range start", startIp], ["Fortinet address range end", endIp]] as const) {
        if (!ip) continue;
        pushFact(facts, {
          type: "ip-address",
          vendor: "Fortinet",
          label,
          value: `${objectName} ${ip}`,
          device: hostname,
          ip,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `edit "${objectName}"\n set ${label.includes("start") ? "start-ip" : "end-ip"} ${ip}`
        });
      }

      if (fqdn) {
        pushFact(facts, {
          type: "firewall-policy",
          vendor: "Fortinet",
          label: "Fortinet FQDN address object",
          value: `${objectName} -> ${fqdn}`,
          device: hostname,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `edit "${objectName}"\n set fqdn "${fqdn}"`
        });
      }
    }
  }

  for (const section of getFortinetConfigSections(rawText, "config firewall addrgrp")) {
    for (const { name: groupName, body } of parseFortinetEditBlocks(section)) {
      const members = getFortinetSetList(body, "member");
      if (members.length === 0) continue;
      pushFact(facts, {
        type: "firewall-policy",
        vendor: "Fortinet",
        label: "Fortinet address group",
        value: `${groupName}: ${members.join(", ")}`,
        device: hostname,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `edit "${groupName}"\n set member ${members.map((member) => `"${member}"`).join(" ")}`
      });
    }
  }
}

function pushFortinetPolicyFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config firewall policy")) {
    for (const { name: policyId, body } of parseFortinetEditBlocks(section)) {
      const name = getFortinetSetValue(body, "name");
      const srcIntf = getFortinetSetList(body, "srcintf");
      const dstIntf = getFortinetSetList(body, "dstintf");
      const srcAddr = getFortinetSetList(body, "srcaddr");
      const dstAddr = getFortinetSetList(body, "dstaddr");
      const service = getFortinetSetList(body, "service");
      const action = getFortinetSetValue(body, "action") || "accept";
      const nat = getFortinetSetValue(body, "nat");
      const status = getFortinetSetValue(body, "status");
      const schedule = getFortinetSetValue(body, "schedule");
      const evidence = sanitizeConfigText([`edit ${policyId}`, ...body.split("\n").slice(0, 18)].join("\n"));

      if (srcIntf.length === 0 && dstIntf.length === 0 && srcAddr.length === 0 && dstAddr.length === 0) continue;

      pushFact(facts, {
        type: "firewall-policy",
        vendor: "Fortinet",
        label: "Fortinet firewall policy",
        value: [
          `policy ${policyId}`,
          name ? `name ${name}` : undefined,
          `${srcIntf.join("|") || "any-src-intf"} -> ${dstIntf.join("|") || "any-dst-intf"}`,
          `${srcAddr.join("|") || "all"} -> ${dstAddr.join("|") || "all"}`,
          `action ${action}`,
          service.length ? `service ${service.join("|")}` : undefined,
          nat === "enable" ? "NAT enabled" : undefined,
          schedule ? `schedule ${schedule}` : undefined
        ].filter(Boolean).join("; "),
        device: hostname,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: evidence
      });

      if (status === "disable") {
        pushFact(facts, {
          type: "warning",
          vendor: "Fortinet",
          label: "Fortinet disabled firewall policy",
          value: `policy ${policyId}${name ? ` ${name}` : ""}`,
          device: hostname,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `edit ${policyId}\n set status disable`
        });
      }

      if (action === "accept" && (srcAddr.includes("all") || srcAddr.includes("ALL")) && (dstAddr.includes("all") || dstAddr.includes("ALL")) && (service.includes("ALL") || service.includes("all"))) {
        pushFact(facts, {
          type: "warning",
          vendor: "Fortinet",
          label: "Fortinet broad allow policy",
          value: `policy ${policyId} allows all sources to all destinations with ALL service`,
          device: hostname,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: evidence
        });
      }
    }
  }
}

function pushFortinetRouteFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config router static")) {
    for (const { name: routeId, body } of parseFortinetEditBlocks(section)) {
      const dst = body.match(/^\s*set\s+dst\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/im);
      const gateway = getFortinetSetValue(body, "gateway");
      const device = getFortinetSetValue(body, "device");
      const distance = getFortinetSetValue(body, "distance");
      const priority = getFortinetSetValue(body, "priority");
      const cidr = dst ? derivePrefixFromIp(dst[1], dst[2]) : "0.0.0.0/0";
      if (!cidr && !gateway && !device) continue;

      pushFact(facts, {
        type: "route",
        vendor: "Fortinet",
        label: cidr === "0.0.0.0/0" ? "Fortinet default route" : "Fortinet static route",
        value: [cidr, gateway ? `via ${gateway}` : undefined, device ? `dev ${device}` : undefined, distance ? `distance ${distance}` : undefined, priority ? `priority ${priority}` : undefined].filter(Boolean).join(" "),
        device: hostname,
        interfaceName: device,
        ip: gateway,
        cidr: cidr || undefined,
        prefix: cidr || undefined,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText([`edit ${routeId}`, ...body.split("\n").slice(0, 10)].join("\n"))
      });
    }
  }

  for (const section of getFortinetConfigSections(rawText, "config router ospf")) {
    const routerId = getFortinetSetValue(section, "router-id");
    if (routerId) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Fortinet",
        label: "Fortinet OSPF router ID",
        value: routerId,
        device: hostname,
        ip: routerId,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `config router ospf\n set router-id ${routerId}`
      });
    }

    for (const prefixLine of section.matchAll(/^\s*set\s+prefix\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/gim)) {
      const cidr = derivePrefixFromIp(prefixLine[1], prefixLine[2]);
      if (!cidr) continue;
      pushFact(facts, {
        type: "prefix",
        vendor: "Fortinet",
        label: "Fortinet OSPF advertised network",
        value: cidr,
        device: hostname,
        cidr,
        prefix: cidr,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `set prefix ${prefixLine[1]} ${prefixLine[2]}`
      });
    }
  }

  for (const section of getFortinetConfigSections(rawText, "config router bgp")) {
    const localAs = getFortinetSetValue(section, "as");
    if (localAs) {
      pushFact(facts, {
        type: "neighbor",
        vendor: "Fortinet",
        label: "Fortinet BGP local AS",
        value: `local-as ${localAs}`,
        device: hostname,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `config router bgp\n set as ${localAs}`
      });
    }

    const neighborSections = getFortinetConfigSections(section, "config neighbor");
    for (const neighborSection of neighborSections) {
      for (const { name: neighborIp, body } of parseFortinetEditBlocks(neighborSection)) {
        const remoteAs = getFortinetSetValue(body, "remote-as");
        pushFact(facts, {
          type: "neighbor",
          vendor: "Fortinet",
          label: "Fortinet BGP neighbor",
          value: `${neighborIp}${remoteAs ? ` remote-as ${remoteAs}` : ""}`,
          device: hostname,
          ip: neighborIp,
          confidence: remoteAs ? "high" : "medium",
          sourceFile,
          sanitizedEvidence: sanitizeConfigText([`edit "${neighborIp}"`, ...body.split("\n").slice(0, 8)].join("\n"))
        });
      }
    }
  }
}

function pushFortinetDhcpFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config system dhcp server")) {
    for (const { name: serverId, body } of parseFortinetEditBlocks(section)) {
      const interfaceName = normalizeFortinetValue(getFortinetSetValue(body, "interface"));
      const gateway = normalizeFortinetValue(getFortinetSetValue(body, "default-gateway"));
      const netmask = normalizeFortinetValue(getFortinetSetValue(body, "netmask"));
      const startIp = normalizeFortinetValue(getFortinetSetValue(body, "start-ip"));
      const endIp = normalizeFortinetValue(getFortinetSetValue(body, "end-ip"));
      const dnsService = normalizeFortinetValue(getFortinetSetValue(body, "dns-service"));
      const cidr = gateway && netmask ? derivePrefixFromIp(gateway, netmask) : undefined;

      pushFact(facts, {
        type: "firewall-policy",
        vendor: "Fortinet",
        label: "Fortinet DHCP server",
        value: [
          `dhcp ${serverId}`,
          interfaceName ? `interface ${interfaceName}` : undefined,
          cidr ? `scope ${cidr}` : undefined,
          gateway ? `gateway ${gateway}` : undefined,
          startIp && endIp ? `range ${startIp}-${endIp}` : undefined,
          dnsService ? `dns ${dnsService}` : undefined
        ].filter(Boolean).join("; "),
        device: hostname,
        interfaceName,
        ip: gateway,
        cidr,
        prefix: cidr,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText([`edit ${serverId}`, ...body.split("\n").slice(0, 14)].join("\n"))
      });

      if (cidr) {
        pushFact(facts, {
          type: "prefix",
          vendor: "Fortinet",
          label: "Fortinet DHCP scope prefix",
          value: cidr,
          device: hostname,
          interfaceName,
          cidr,
          prefix: cidr,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `edit ${serverId}\n set default-gateway ${gateway}\n set netmask ${netmask}`
        });
      }
    }
  }
}

function pushFortinetVpnFacts({ rawText, sourceFile, hostname, facts }: FortinetParserContext) {
  for (const section of getFortinetConfigSections(rawText, "config vpn ipsec phase1-interface")) {
    for (const { name: vpnName, body } of parseFortinetEditBlocks(section)) {
      const interfaceName = getFortinetSetValue(body, "interface");
      const remoteGateway = getFortinetSetValue(body, "remote-gw");
      const peerId = getFortinetSetValue(body, "peerid");
      pushFact(facts, {
        type: "neighbor",
        vendor: "Fortinet",
        label: "Fortinet IPsec VPN peer",
        value: [vpnName, interfaceName ? `underlay ${interfaceName}` : undefined, remoteGateway ? `remote-gw ${remoteGateway}` : undefined, peerId ? `peerid ${peerId}` : undefined].filter(Boolean).join("; "),
        device: hostname,
        interfaceName,
        ip: remoteGateway,
        confidence: remoteGateway ? "high" : "medium",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText([`edit "${vpnName}"`, ...body.split("\n").slice(0, 12)].join("\n"))
      });
    }
  }
}

function parseFortinetFacts(rawText: string, sourceFile: string, hostname: string | undefined, facts: ImportFact[]) {
  const context = { rawText, sourceFile, hostname, facts };
  pushFortinetInterfaceFacts(context);
  pushFortinetZoneFacts(context);
  pushFortinetAddressFacts(context);
  pushFortinetPolicyFacts(context);
  pushFortinetRouteFacts(context);
  pushFortinetDhcpFacts(context);
  pushFortinetVpnFacts(context);
}


export function parseImportedConfig(rawText: string, sourceFile = "pasted-config", forcedVendor?: VendorKind): ImportJob {
  const sanitized = sanitizeConfigText(rawText);
  const vendor = forcedVendor && forcedVendor !== "Unknown" ? forcedVendor : detectVendor(rawText, sourceFile);
  const facts: ImportFact[] = [];
  const hostname = extractHostname(rawText, vendor);

  if (hostname) {
    pushFact(facts, {
      type: "device",
      vendor,
      label: "Device hostname",
      value: hostname,
      device: hostname,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: `hostname ${hostname}`
    });
  }

  if (vendor === "Cisco" || vendor === "Unknown") {
    parseCiscoFacts(rawText, sourceFile, hostname, facts);
  }

  if (vendor === "Fortinet" || vendor === "Unknown") {
    parseFortinetFacts(rawText, sourceFile, hostname, facts);
  }

  if (vendor === "Windows" || vendor === "Unknown") {
    let currentAdapter = "Windows NIC";
    for (const line of rawText.split("\n")) {
      const adapter = line.match(/^([^:\n]+adapter[^:\n]*):/i);
      if (adapter) currentAdapter = adapter[1].trim();
      const ip = line.match(/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
      const gateway = line.match(/Default Gateway[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
      const dhcp = line.match(/DHCP Server[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
      const mask = line.match(/Subnet Mask[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
      const foundIp = ip || gateway || dhcp;
      if (foundIp) {
        const cidr = mask ? derivePrefixFromIp(foundIp, mask) : undefined;
        pushFact(facts, {
          type: ip ? "ip-address" : "route",
          vendor: "Windows",
          label: ip ? "Windows NIC IPv4" : gateway ? "Windows default gateway" : "Windows DHCP server",
          value: foundIp,
          device: hostname,
          interfaceName: currentAdapter,
          ip: foundIp,
          cidr: cidr || undefined,
          prefix: cidr || undefined,
          confidence: ip ? "high" : "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
        if (cidr) {
          pushFact(facts, {
            type: "prefix",
            vendor: "Windows",
            label: "Windows connected prefix",
            value: cidr,
            device: hostname,
            interfaceName: currentAdapter,
            cidr,
            prefix: cidr,
            confidence: "medium",
            sourceFile,
            sanitizedEvidence: `adapter ${currentAdapter} ${cidr}`
          });
        }
      }
    }
  }

  if (vendor === "Linux" || vendor === "Unknown") {
    for (const line of rawText.split("\n")) {
      const ipAddr = line.match(/\binet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)\b(?:[^\n]*\sdev\s+(\S+))?/i);
      if (ipAddr) {
        const cidr = derivePrefixFromIp(ipAddr[1], ipAddr[2]);
        const interfaceName = ipAddr[3]?.replace(/:$/, "") || line.match(/^\d+:\s*([^:]+):/)?.[1];
        if (cidr) {
          pushFact(facts, {
            type: "prefix",
            vendor: "Linux",
            label: "Linux connected prefix",
            value: cidr,
            device: hostname,
            interfaceName,
            cidr,
            prefix: cidr,
            confidence: "medium",
            sourceFile,
            sanitizedEvidence: line.trim()
          });
          pushFact(facts, {
            type: "ip-address",
            vendor: "Linux",
            label: "Linux interface IP",
            value: ipAddr[1],
            device: hostname,
            interfaceName,
            ip: ipAddr[1],
            cidr,
            prefix: cidr,
            confidence: "high",
            sourceFile,
            sanitizedEvidence: line.trim()
          });
        }
      }
      const defaultRoute = line.match(/^default\s+via\s+(\d+\.\d+\.\d+\.\d+)(?:\s+dev\s+(\S+))?/i);
      if (defaultRoute) {
        pushFact(facts, {
          type: "route",
          vendor: "Linux",
          label: "Linux default route",
          value: defaultRoute[1],
          device: hostname,
          interfaceName: defaultRoute[2],
          ip: defaultRoute[1],
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }
    }
  }

  if (vendor === "Check Point" || vendor === "Ubiquiti") {
    for (const line of rawText.split("\n")) {
      const cidr = line.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/)?.[1];
      const dotted = line.match(/(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/);
      const interfaceName = line.match(/(?:interface|ethernet|eth)\s+([A-Za-z0-9/_.-]+)/i)?.[1];
      if (cidr) {
        pushFact(facts, {
          type: "prefix",
          vendor,
          label: `${vendor} prefix` as string,
          value: cidr,
          device: hostname,
          interfaceName,
          cidr,
          prefix: cidr,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      } else if (dotted) {
        const derived = derivePrefixFromIp(dotted[1], dotted[2]);
        if (derived) {
          pushFact(facts, {
            type: "prefix",
            vendor,
            label: `${vendor} prefix`,
            value: derived,
            device: hostname,
            interfaceName,
            cidr: derived,
            prefix: derived,
            confidence: "low",
            sourceFile,
            sanitizedEvidence: line.trim()
          });
        }
      }
    }
  }

  if (facts.length === 0) {
    pushFact(facts, {
      type: "warning",
      vendor,
      label: "No structured facts detected",
      value: "NGINEER could not parse this file yet. Keep it staged for manual review or vendor parser expansion.",
      confidence: "low",
      sourceFile,
      sanitizedEvidence: sanitized.slice(0, 320)
    });
  }

  return {
    id: createId("import", `${sourceFile}-${Date.now()}`),
    vendor,
    sourceName: sourceFile,
    createdAt: new Date().toISOString(),
    facts,
    sanitizedPreview: sanitized.split("\n").slice(0, 80).join("\n")
  };
}

export function applyApprovedImportFacts(inventory: IpamInventory, facts: ImportFact[]): IpamInventory {
  const next: IpamInventory = {
    sites: [...inventory.sites],
    vrfs: [...inventory.vrfs],
    vlans: [...inventory.vlans],
    prefixes: [...inventory.prefixes],
    addresses: [...inventory.addresses],
    importJobs: [...inventory.importJobs]
  };

  const defaultSite = next.sites[0]?.id || "site-unknown";
  const defaultVrf = next.vrfs[0]?.id || "vrf-global";

  for (const fact of facts.filter((item) => item.approved)) {
    if (fact.type === "vrf" && fact.value && !next.vrfs.some((vrf) => vrf.name === fact.value)) {
      next.vrfs.push({ id: createId("vrf", fact.value), name: fact.value, description: `Imported from ${fact.sourceFile}` });
    }

    if (fact.type === "vlan" && fact.vlan) {
      const vlanId = Number(fact.vlan);
      if (Number.isInteger(vlanId) && !next.vlans.some((vlan) => vlan.vlanId === vlanId && vlan.siteId === defaultSite)) {
        next.vlans.push({ id: createId("vlan", `${defaultSite}-${vlanId}`), vlanId, name: `Imported VLAN ${vlanId}`, siteId: defaultSite, vrfId: defaultVrf });
      }
    }

    if (fact.type === "prefix" && fact.cidr && !next.prefixes.some((prefix) => prefix.cidr === fact.cidr && prefix.vrfId === defaultVrf)) {
      const vlan = fact.vlan ? next.vlans.find((row) => row.vlanId === Number(fact.vlan)) : undefined;
      next.prefixes.push({
        id: createId("prefix", fact.cidr),
        cidr: fact.cidr,
        siteId: defaultSite,
        vrfId: defaultVrf,
        vlanId: vlan?.id,
        gateway: fact.ip,
        purpose: `Imported from ${fact.device || fact.vendor}`,
        status: "active"
      });
    }

    if (fact.type === "ip-address" && fact.ip) {
      const prefixId = fact.cidr
        ? next.prefixes.find((prefix) => prefix.cidr === fact.cidr)?.id || createId("prefix", fact.cidr)
        : getBestPrefixId(fact.ip, next.prefixes, defaultSite, defaultVrf);

      if (!next.addresses.some((address) => address.address === fact.ip && address.vrfId === defaultVrf && address.device === fact.device && address.interfaceName === fact.interfaceName)) {
        next.addresses.push({
          id: createId("ip", `${fact.ip}-${fact.device || "device"}-${fact.interfaceName || "interface"}`),
          address: fact.ip,
          prefixId,
          vrfId: defaultVrf,
          siteId: defaultSite,
          hostname: fact.device,
          device: fact.device,
          interfaceName: fact.interfaceName,
          role: fact.interfaceName?.toLowerCase().includes("vlan") ? "gateway" : "network-device",
          source: "imported"
        });
      }
    }
  }

  return next;
}
