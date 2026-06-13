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

export type RecordOrigin = "demo" | "manual" | "imported";

export type SiteRecord = {
  id: string;
  name: string;
  region: string;
  role: "HQ" | "Branch" | "Data Center" | "Provider" | "Cloud" | "Unknown";
  origin?: RecordOrigin;
};

export type VrfRecord = {
  id: string;
  name: string;
  rd?: string;
  description: string;
  origin?: RecordOrigin;
};

export type VlanRecord = {
  id: string;
  vlanId: number;
  name: string;
  siteId: string;
  vrfId: string;
  origin?: RecordOrigin;
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
  origin?: RecordOrigin;
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

// Every pattern captures exactly TWO groups: (kept-prefix)(secret).
// The replacer keeps group 1 and replaces group 2 with <redacted>.
// Rules: word-boundary anchor every keyword (prevents mid-word matches like
// "MyOspfSecret"), and use [ \t]+ separators only (never \s+, which crosses
// newlines and redacts the first word of the next line). Do not add
// three-group patterns: extra replacer args receive the match offset, which
// previously caused secrets to be kept instead of redacted.
const secretPatterns: RegExp[] = [
  /(\benable[ \t]+secret[ \t]+(?:[0-9][ \t]+)?)(\S+)/gi,
  /(\benable[ \t]+password[ \t]+(?:[0-9][ \t]+)?)(\S+)/gi,
  /(\bpassword[ \t]+(?:[05789][ \t]+|ENC[ \t]+)?)(\S+)/gi,
  /(\bpassword-hash[ \t]+)(\S+)/gi,
  /(\bexpert-password(?:-hash)?[ \t]+)(\S+)/gi,
  /(\bsecret[ \t]+(?:[0589][ \t]+|ENC[ \t]+)?)(\S+)/gi,
  /(\bsnmp-server[ \t]+community[ \t]+)(\S+)/gi,
  /(\bradius-server[ \t]+key[ \t]+(?:[067][ \t]+)?)(\S+)/gi,
  /(\btacacs-server[ \t]+key[ \t]+(?:[067][ \t]+)?)(\S+)/gi,
  /(\bpre-shared-key[ \t]+(?:local[ \t]+|remote[ \t]+)?(?:[06][ \t]+)?)(\S+)/gi,
  // Fortinet/VyOS PSKs, e.g. "set psksecret ENC xxxx" / "ike psksecret ENC xxxx"
  /(\bpsksecret[ \t]+(?:ENC[ \t]+)?)(\S+)/gi,
  /(\bset[ \t]+passwd[ \t]+(?:ENC[ \t]+)?)(\S+)/gi,
  /(\bset[ \t]+key[ \t]+(?:ENC[ \t]+)?)(\S+)/gi,
  /(\bset[ \t]+secret[ \t]+(?:ENC[ \t]+)?)(\S+)/gi,
  /(\bapi[-_ ]?key[ \t]*[=:][ \t]*)(\S+)/gi,
  /(\btoken[ \t]*[=:][ \t]*)(\S+)/gi,
  // Typed bare key lines inside new-style Cisco tacacs/radius server blocks, e.g. "key 7 0822455D0A16"
  /(^[ \t]*key[ \t]+[067][ \t]+)(\S+)/gim,
  // Key-chain key-string entries, e.g. "key-string 7 104D000A0618"
  /(\bkey-string[ \t]+(?:[07][ \t]+)?)(\S+)/gi,
  // OSPF interface MD5 auth, e.g. "ip ospf message-digest-key 1 md5 SECRET"
  /(\bmessage-digest-key[ \t]+\d+[ \t]+md5[ \t]+(?:[07][ \t]+)?)(\S+)/gi,
  // Site-to-site VPN PSKs, e.g. "crypto isakmp key SECRET address 1.2.3.4"
  /(\bcrypto[ \t]+isakmp[ \t]+key[ \t]+(?:[06][ \t]+)?)(\S+)/gi,
  // NTP authentication, e.g. "ntp authentication-key 1 md5 SECRET"
  /(\bntp[ \t]+authentication-key[ \t]+\d+[ \t]+md5[ \t]+)(\S+)/gi,
  // HSRP/VRRP plain-text auth, e.g. "standby 1 authentication text SECRET"
  /(\bauthentication[ \t]+text[ \t]+)(\S+)/gi
];

const pemBlockPattern = /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;

export const demoInventory: IpamInventory = {
  sites: [
    { id: "site-branch", name: "Branch", region: "Jamaica", role: "Branch", origin: "demo" },
    { id: "site-hq", name: "HQ", region: "Jamaica", role: "HQ", origin: "demo" },
    { id: "site-provider", name: "Provider MPLS", region: "Service Provider", role: "Provider", origin: "demo" }
  ],
  vrfs: [
    { id: "vrf-cust-a", name: "CUST-A", rd: "65000:100", description: "Customer production VPN / corporate routing domain", origin: "demo" },
    { id: "vrf-global", name: "Global", description: "Provider/global transport table", origin: "demo" }
  ],
  vlans: [
    { id: "vlan-20", vlanId: 20, name: "Branch-Users", siteId: "site-branch", vrfId: "vrf-cust-a", origin: "demo" },
    { id: "vlan-120", vlanId: 120, name: "HQ-Database", siteId: "site-hq", vrfId: "vrf-cust-a", origin: "demo" }
  ],
  prefixes: [
    { id: "prefix-10-20-30", cidr: "10.20.30.0/24", siteId: "site-branch", vrfId: "vrf-cust-a", vlanId: "vlan-20", gateway: "10.20.30.1", purpose: "Branch user access", status: "active", origin: "demo" },
    { id: "prefix-10-120-10", cidr: "10.120.10.0/24", siteId: "site-hq", vrfId: "vrf-cust-a", vlanId: "vlan-120", gateway: "10.120.10.1", purpose: "HQ database segment", status: "active", origin: "demo" },
    { id: "prefix-172-16-0", cidr: "172.16.0.0/30", siteId: "site-provider", vrfId: "vrf-global", purpose: "Provider PE-P core link", status: "active", origin: "demo" }
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
  let sanitized = text.replace(pemBlockPattern, "<redacted-pem-block>");
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (_match, keptPrefix: string) => `${keptPrefix}<redacted>`);
  }
  return sanitized;
}

export function detectVendor(text: string, fileName = ""): VendorKind {
  const haystack = `${fileName}\n${text}`.toLowerCase();

  if (/fortigate|fortios|config firewall|config system interface|set allowaccess/.test(haystack)) return "Fortinet";
  if (/checkpoint|check point|clish|fw ctl|set interface .* ipv4-address|gaia/.test(haystack)) return "Check Point";
  if (/unifi|ubiquiti|edgeos|interfaces ethernet|ubnt|switch-port profile|config\.boot|ethernet eth\d+\s*\{|host-name\s/.test(haystack)) return "Ubiquiti";
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
  const ubiquiti = text.match(/host-name\s+"?([A-Za-z0-9._-]+)"?/i)?.[1];
  if (ubiquiti) return ubiquiti;
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
      const cidr = gateway && netmask ? normalizeFortinetValue(derivePrefixFromIp(gateway, netmask)) : undefined;

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


type ServerParserContext = {
  rawText: string;
  sourceFile: string;
  hostname?: string;
  facts: ImportFact[];
};

function normalizeParsedValue(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const cleaned = value.trim().replace(/^"|"$/g, "");
  if (!cleaned || cleaned.toLowerCase() === "none" || cleaned.toLowerCase() === "null" || cleaned.toLowerCase() === "n/a") return undefined;
  return cleaned;
}

function normalizeWindowsAdapterName(name: string | undefined): string | undefined {
  const cleaned = normalizeParsedValue(name);
  if (!cleaned) return undefined;
  return cleaned
    .replace(/^Ethernet adapter\s+/i, "")
    .replace(/^Wireless LAN adapter\s+/i, "")
    .replace(/^Unknown adapter\s+/i, "")
    .replace(/:$/, "")
    .trim();
}

function normalizeLinuxInterfaceName(name: string | undefined): string | undefined {
  const cleaned = normalizeParsedValue(name);
  if (!cleaned) return undefined;
  return cleaned.replace(/@.*$/, "").replace(/:$/, "");
}

function prefixLengthToNetmask(prefixLength: string | number): string | undefined {
  const length = typeof prefixLength === "number" ? prefixLength : Number(prefixLength);
  if (!Number.isInteger(length) || length < 0 || length > 32) return undefined;
  const mask = length === 0 ? 0 : (0xffffffff << (32 - length)) >>> 0;
  return intToIpv4(mask);
}

function derivePrefixFromIpSafe(ip: string | undefined, maskOrCidr: string | undefined): string | undefined {
  if (!ip || !maskOrCidr) return undefined;
  return normalizeParsedValue(derivePrefixFromIp(ip, maskOrCidr));
}

function pushServerIpFacts(
  facts: ImportFact[],
  vendor: "Windows" | "Linux",
  sourceFile: string,
  hostname: string | undefined,
  interfaceName: string | undefined,
  ip: string | undefined,
  cidr: string | undefined,
  evidence: string,
  labelPrefix: string
) {
  if (!ip) return;

  pushFact(facts, {
    type: "ip-address",
    vendor,
    label: `${labelPrefix} interface IP`,
    value: ip,
    device: hostname,
    interfaceName,
    ip,
    cidr,
    prefix: cidr,
    confidence: "high",
    sourceFile,
    sanitizedEvidence: evidence
  });

  if (cidr) {
    pushFact(facts, {
      type: "prefix",
      vendor,
      label: `${labelPrefix} connected prefix`,
      value: cidr,
      device: hostname,
      interfaceName,
      cidr,
      prefix: cidr,
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: evidence
    });
  }
}

function pushServerRouteFact(
  facts: ImportFact[],
  vendor: "Windows" | "Linux",
  sourceFile: string,
  hostname: string | undefined,
  interfaceName: string | undefined,
  gateway: string | undefined,
  destination: string | undefined,
  evidence: string,
  label: string
) {
  if (!gateway && !destination) return;
  pushFact(facts, {
    type: "route",
    vendor,
    label,
    value: [destination || "0.0.0.0/0", gateway ? `via ${gateway}` : undefined, interfaceName ? `dev ${interfaceName}` : undefined].filter(Boolean).join(" "),
    device: hostname,
    interfaceName,
    ip: gateway,
    cidr: destination,
    prefix: destination,
    confidence: gateway ? "medium" : "low",
    sourceFile,
    sanitizedEvidence: evidence
  });
}

function parseWindowsFacts({ rawText, sourceFile, hostname, facts }: ServerParserContext) {
  const lines = rawText.split(/\r?\n/);
  let currentAdapter = "Windows NIC";
  let pendingIp: string | undefined;
  let pendingMask: string | undefined;

  const osName = rawText.match(/^\s*OS Name\s*:\s*(.+)$/im)?.[1] || rawText.match(/^\s*OS Version\s*:\s*(.+)$/im)?.[1];
  if (osName) {
    pushFact(facts, {
      type: "device",
      vendor: "Windows",
      label: "Windows server OS evidence",
      value: normalizeParsedValue(osName) || osName,
      device: hostname,
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: osName.trim()
    });
  }

  for (const line of lines) {
    const adapterMatch = line.match(/^\s*([^:\n]+adapter[^:\n]*):\s*$/i);
    if (adapterMatch) {
      currentAdapter = normalizeWindowsAdapterName(adapterMatch[1]) || currentAdapter;
      pendingIp = undefined;
      pendingMask = undefined;
      pushFact(facts, {
        type: "interface",
        vendor: "Windows",
        label: "Windows network adapter",
        value: currentAdapter,
        device: hostname,
        interfaceName: currentAdapter,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const interfaceAlias = line.match(/^\s*InterfaceAlias\s*[:=]\s*(.+)$/i)?.[1];
    if (interfaceAlias) {
      currentAdapter = normalizeWindowsAdapterName(interfaceAlias) || currentAdapter;
      pushFact(facts, {
        type: "interface",
        vendor: "Windows",
        label: "Windows PowerShell interface alias",
        value: currentAdapter,
        device: hostname,
        interfaceName: currentAdapter,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const ipconfigIp = line.match(/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (ipconfigIp) {
      pendingIp = ipconfigIp;
      const cidr = derivePrefixFromIpSafe(pendingIp, pendingMask);
      pushServerIpFacts(facts, "Windows", sourceFile, hostname, currentAdapter, pendingIp, cidr, line.trim(), "Windows NIC");
      continue;
    }

    const mask = line.match(/Subnet Mask[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (mask) {
      pendingMask = mask;
      const cidr = derivePrefixFromIpSafe(pendingIp, pendingMask);
      if (pendingIp && cidr) pushServerIpFacts(facts, "Windows", sourceFile, hostname, currentAdapter, pendingIp, cidr, `adapter ${currentAdapter} ${pendingIp} ${mask}`, "Windows NIC");
      continue;
    }

    const psIp = line.match(/^\s*IPv4Address\s*[:=]\s*(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?/i);
    if (psIp) {
      const prefixLength = psIp[2] || rawText.match(/^\s*PrefixLength\s*[:=]\s*(\d+)/im)?.[1];
      const cidr = prefixLength ? derivePrefixFromIpSafe(psIp[1], prefixLength) : undefined;
      pushServerIpFacts(facts, "Windows", sourceFile, hostname, currentAdapter, psIp[1], cidr, line.trim(), "Windows PowerShell");
      continue;
    }

    const gateway = line.match(/Default Gateway[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1] || line.match(/^\s*IPv4DefaultGateway\s*[:=]\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (gateway) {
      pushServerRouteFact(facts, "Windows", sourceFile, hostname, currentAdapter, gateway, "0.0.0.0/0", line.trim(), "Windows default gateway");
      continue;
    }

    const dhcp = line.match(/DHCP Server[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (dhcp) {
      pushFact(facts, {
        type: "ip-address",
        vendor: "Windows",
        label: "Windows DHCP server",
        value: dhcp,
        device: hostname,
        interfaceName: currentAdapter,
        ip: dhcp,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const dns = line.match(/(?:DNS Servers|DNSServer|ServerAddresses)[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (dns) {
      pushFact(facts, {
        type: "ip-address",
        vendor: "Windows",
        label: "Windows DNS server",
        value: dns,
        device: hostname,
        interfaceName: currentAdapter,
        ip: dns,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const routePrint = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+\d+/);
    if (routePrint) {
      const destination = derivePrefixFromIpSafe(routePrint[1], routePrint[2]);
      pushServerRouteFact(facts, "Windows", sourceFile, hostname, currentAdapter, routePrint[3], destination, line.trim(), "Windows route print entry");
      continue;
    }

    const dhcpScope = line.match(/ScopeId\s*[:=]\s*(\d+\.\d+\.\d+\.\d+).*?SubnetMask\s*[:=]\s*(\d+\.\d+\.\d+\.\d+)/i);
    if (dhcpScope) {
      const cidr = derivePrefixFromIpSafe(dhcpScope[1], dhcpScope[2]);
      if (cidr) {
        pushFact(facts, {
          type: "prefix",
          vendor: "Windows",
          label: "Windows DHCP scope prefix",
          value: cidr,
          device: hostname,
          cidr,
          prefix: cidr,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }
    }
  }
}

function parseLinuxFacts({ rawText, sourceFile, hostname, facts }: ServerParserContext) {
  const lines = rawText.split(/\r?\n/);
  let currentInterface: string | undefined;
  let ifcfgDevice: string | undefined;
  let ifcfgIp: string | undefined;
  let ifcfgMaskOrPrefix: string | undefined;

  const osPrettyName = rawText.match(/^PRETTY_NAME="?([^"\n]+)"?/im)?.[1] || rawText.match(/^\s*Operating System:\s*(.+)$/im)?.[1];
  if (osPrettyName) {
    pushFact(facts, {
      type: "device",
      vendor: "Linux",
      label: "Linux OS evidence",
      value: normalizeParsedValue(osPrettyName) || osPrettyName,
      device: hostname,
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: osPrettyName.trim()
    });
  }

  for (const line of lines) {
    const interfaceHeader = line.match(/^\s*\d+:\s*([^:@]+)(?:@[^:]+)?:\s*<([^>]*)>/);
    if (interfaceHeader) {
      currentInterface = normalizeLinuxInterfaceName(interfaceHeader[1]);
      pushFact(facts, {
        type: "interface",
        vendor: "Linux",
        label: "Linux ip addr interface",
        value: `${currentInterface || interfaceHeader[1]} ${interfaceHeader[2]}`,
        device: hostname,
        interfaceName: currentInterface,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const ipAddr = line.match(/\binet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)\b(?:[^\n]*\sdev\s+(\S+))?/i);
    if (ipAddr) {
      const interfaceName = normalizeLinuxInterfaceName(ipAddr[3]) || currentInterface;
      const cidr = derivePrefixFromIpSafe(ipAddr[1], ipAddr[2]);
      pushServerIpFacts(facts, "Linux", sourceFile, hostname, interfaceName, ipAddr[1], cidr, line.trim(), "Linux");
      continue;
    }

    const defaultRoute = line.match(/^default\s+via\s+(\d+\.\d+\.\d+\.\d+)(?:\s+dev\s+(\S+))?/i);
    if (defaultRoute) {
      pushServerRouteFact(facts, "Linux", sourceFile, hostname, normalizeLinuxInterfaceName(defaultRoute[2]) || currentInterface, defaultRoute[1], "0.0.0.0/0", line.trim(), "Linux default route");
      continue;
    }

    const connectedRoute = line.match(/^(\d+\.\d+\.\d+\.\d+\/\d+)\s+dev\s+(\S+)(?:.*?\ssrc\s+(\d+\.\d+\.\d+\.\d+))?/i);
    if (connectedRoute) {
      const interfaceName = normalizeLinuxInterfaceName(connectedRoute[2]);
      pushFact(facts, {
        type: "prefix",
        vendor: "Linux",
        label: "Linux connected route prefix",
        value: connectedRoute[1],
        device: hostname,
        interfaceName,
        cidr: connectedRoute[1],
        prefix: connectedRoute[1],
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      if (connectedRoute[3]) pushServerIpFacts(facts, "Linux", sourceFile, hostname, interfaceName, connectedRoute[3], connectedRoute[1], line.trim(), "Linux route src");
      continue;
    }

    const nmcliAddress = line.match(/^\s*IP4\.ADDRESS\[\d+\]:\s*(\d+\.\d+\.\d+\.\d+)\/(\d+)/i);
    if (nmcliAddress) {
      const cidr = derivePrefixFromIpSafe(nmcliAddress[1], nmcliAddress[2]);
      pushServerIpFacts(facts, "Linux", sourceFile, hostname, currentInterface, nmcliAddress[1], cidr, line.trim(), "Linux NetworkManager");
      continue;
    }

    const nmcliGateway = line.match(/^\s*IP4\.GATEWAY:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (nmcliGateway) {
      pushServerRouteFact(facts, "Linux", sourceFile, hostname, currentInterface, nmcliGateway, "0.0.0.0/0", line.trim(), "Linux NetworkManager gateway");
      continue;
    }

    const nmcliDns = line.match(/^\s*IP4\.DNS\[\d+\]:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (nmcliDns) {
      pushFact(facts, {
        type: "ip-address",
        vendor: "Linux",
        label: "Linux DNS server",
        value: nmcliDns,
        device: hostname,
        interfaceName: currentInterface,
        ip: nmcliDns,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const ifcfgDeviceLine = line.match(/^DEVICE=(.+)$/i)?.[1] || line.match(/^NAME=(.+)$/i)?.[1];
    if (ifcfgDeviceLine) {
      ifcfgDevice = normalizeLinuxInterfaceName(ifcfgDeviceLine);
      currentInterface = ifcfgDevice || currentInterface;
      pushFact(facts, {
        type: "interface",
        vendor: "Linux",
        label: "Linux ifcfg interface",
        value: ifcfgDevice || ifcfgDeviceLine,
        device: hostname,
        interfaceName: ifcfgDevice,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: line.trim()
      });
      continue;
    }

    const ifcfgIpLine = line.match(/^IPADDR=(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (ifcfgIpLine) {
      ifcfgIp = ifcfgIpLine;
      const cidr = derivePrefixFromIpSafe(ifcfgIp, ifcfgMaskOrPrefix);
      pushServerIpFacts(facts, "Linux", sourceFile, hostname, ifcfgDevice || currentInterface, ifcfgIp, cidr, line.trim(), "Linux ifcfg");
      continue;
    }

    const ifcfgPrefix = line.match(/^PREFIX=(\d+)/i)?.[1] || line.match(/^NETMASK=(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (ifcfgPrefix) {
      ifcfgMaskOrPrefix = ifcfgPrefix;
      const cidr = derivePrefixFromIpSafe(ifcfgIp, ifcfgMaskOrPrefix);
      if (ifcfgIp && cidr) pushServerIpFacts(facts, "Linux", sourceFile, hostname, ifcfgDevice || currentInterface, ifcfgIp, cidr, `ifcfg ${ifcfgIp}/${ifcfgPrefix}`, "Linux ifcfg");
      continue;
    }

    const ifcfgGateway = line.match(/^GATEWAY=(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (ifcfgGateway) {
      pushServerRouteFact(facts, "Linux", sourceFile, hostname, ifcfgDevice || currentInterface, ifcfgGateway, "0.0.0.0/0", line.trim(), "Linux ifcfg gateway");
      continue;
    }

    const netplanAddress = line.match(/addresses:\s*\[?\s*["']?(\d+\.\d+\.\d+\.\d+\/\d+)/i)?.[1];
    if (netplanAddress) {
      const [ip, prefixLength] = netplanAddress.split("/");
      const cidr = derivePrefixFromIpSafe(ip, prefixLength);
      pushServerIpFacts(facts, "Linux", sourceFile, hostname, currentInterface, ip, cidr, line.trim(), "Linux netplan");
      continue;
    }

    const netplanGateway = line.match(/gateway4:\s*(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    if (netplanGateway) {
      pushServerRouteFact(facts, "Linux", sourceFile, hostname, currentInterface, netplanGateway, "0.0.0.0/0", line.trim(), "Linux netplan gateway");
      continue;
    }
  }
}



type GaiaUbntParserContext = {
  rawText: string;
  sourceFile: string;
  hostname: string | undefined;
  facts: ImportFact[];
};

/** Check Point Gaia clish "set ..." configuration parser. */
function parseCheckPointFacts({ rawText, sourceFile, hostname, facts }: GaiaUbntParserContext) {
  // Interfaces with addresses: set interface eth0 ipv4-address 10.1.1.1 mask-length 24
  const addressPattern = /^set\s+interface\s+(\S+)\s+ipv4-address\s+(\d+\.\d+\.\d+\.\d+)\s+mask-length\s+(\d+)/gim;
  for (const match of rawText.matchAll(addressPattern)) {
    const [, interfaceName, ip, maskLength] = match;
    const cidr = derivePrefixFromIp(ip, maskLength) || undefined;

    pushFact(facts, {
      type: "interface",
      vendor: "Check Point",
      label: "Check Point interface",
      value: interfaceName,
      device: hostname,
      interfaceName,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });

    pushFact(facts, {
      type: "ip-address",
      vendor: "Check Point",
      label: "Check Point interface address",
      value: `${ip}/${maskLength}`,
      device: hostname,
      interfaceName,
      ip,
      cidr,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });

    if (cidr) {
      pushFact(facts, {
        type: "prefix",
        vendor: "Check Point",
        label: "Check Point connected prefix",
        value: cidr,
        device: hostname,
        interfaceName,
        cidr,
        prefix: cidr,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText(match[0])
      });
    }
  }

  // Interface descriptions: set interface eth0 comments "External uplink"
  const commentPattern = /^set\s+interface\s+(\S+)\s+comments?\s+"?([^"\n]+)"?/gim;
  for (const match of rawText.matchAll(commentPattern)) {
    pushFact(facts, {
      type: "neighbor",
      vendor: "Check Point",
      label: "Check Point interface description",
      value: `${match[1]}: ${match[2].trim()}`,
      device: hostname,
      interfaceName: match[1],
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }

  // Disabled interfaces: set interface eth3 state off
  const statePattern = /^set\s+interface\s+(\S+)\s+state\s+off/gim;
  for (const match of rawText.matchAll(statePattern)) {
    pushFact(facts, {
      type: "warning",
      vendor: "Check Point",
      label: "Check Point interface administratively down",
      value: match[1],
      device: hostname,
      interfaceName: match[1],
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }

  // Static routes: set static-route 10.50.0.0/16 nexthop gateway address 10.1.1.254 on
  const routePattern = /^set\s+static-route\s+(default|\d+\.\d+\.\d+\.\d+\/\d+)\s+nexthop\s+gateway\s+(?:address|logical)\s+(\S+)/gim;
  for (const match of rawText.matchAll(routePattern)) {
    const cidr = match[1] === "default" ? "0.0.0.0/0" : match[1];
    pushFact(facts, {
      type: "route",
      vendor: "Check Point",
      label: cidr === "0.0.0.0/0" ? "Check Point default route" : "Check Point static route",
      value: `${cidr} via ${match[2]}`,
      device: hostname,
      ip: /\d+\.\d+\.\d+\.\d+/.test(match[2]) ? match[2] : undefined,
      cidr,
      prefix: cidr,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }

  // DNS: add dns primary 10.1.1.10 / set dns primary 10.1.1.10
  const dnsPattern = /^(?:add|set)\s+dns\s+(primary|secondary|tertiary)\s+(\d+\.\d+\.\d+\.\d+)/gim;
  for (const match of rawText.matchAll(dnsPattern)) {
    pushFact(facts, {
      type: "ip-address",
      vendor: "Check Point",
      label: `Check Point ${match[1]} DNS server`,
      value: match[2],
      device: hostname,
      ip: match[2],
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }
}

/** Ubiquiti EdgeOS parser - handles both "set ..." command form and hierarchical config blocks. */
function parseUbiquitiFacts({ rawText, sourceFile, hostname, facts }: GaiaUbntParserContext) {
  function pushUbiquitiAddress(interfaceName: string, address: string, vlan: string | undefined, evidence: string) {
    if (!/\d+\.\d+\.\d+\.\d+\/\d+/.test(address)) {
      if (address.toLowerCase() === "dhcp") {
        pushFact(facts, {
          type: "interface",
          vendor: "Ubiquiti",
          label: "Ubiquiti DHCP client interface",
          value: interfaceName,
          device: hostname,
          interfaceName,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: sanitizeConfigText(evidence)
        });
      }
      return;
    }

    const [ip, maskLength] = address.split("/");
    const cidr = derivePrefixFromIp(ip, maskLength) || undefined;

    pushFact(facts, {
      type: "interface",
      vendor: "Ubiquiti",
      label: "Ubiquiti interface",
      value: interfaceName,
      device: hostname,
      interfaceName,
      vlan,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(evidence)
    });

    pushFact(facts, {
      type: "ip-address",
      vendor: "Ubiquiti",
      label: "Ubiquiti interface address",
      value: address,
      device: hostname,
      interfaceName,
      ip,
      cidr,
      vlan,
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(evidence)
    });

    if (cidr) {
      pushFact(facts, {
        type: "prefix",
        vendor: "Ubiquiti",
        label: "Ubiquiti connected prefix",
        value: cidr,
        device: hostname,
        interfaceName,
        cidr,
        prefix: cidr,
        vlan,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText(evidence)
      });
    }

    if (vlan) {
      pushFact(facts, {
        type: "vlan",
        vendor: "Ubiquiti",
        label: "Ubiquiti VLAN subinterface (vif)",
        value: `VLAN ${vlan} on ${interfaceName}`,
        device: hostname,
        interfaceName,
        vlan,
        cidr,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText(evidence)
      });
    }
  }

  // ---- Set-command form ----
  for (const match of rawText.matchAll(/^set\s+interfaces\s+(?:ethernet|switch|bridge)\s+(\S+)\s+address\s+(\S+)/gim)) {
    pushUbiquitiAddress(match[1], match[2], undefined, match[0]);
  }
  for (const match of rawText.matchAll(/^set\s+interfaces\s+(?:ethernet|switch|bridge)\s+(\S+)\s+vif\s+(\d+)\s+address\s+(\S+)/gim)) {
    pushUbiquitiAddress(`${match[1]}.${match[2]}`, match[3], match[2], match[0]);
  }
  for (const match of rawText.matchAll(/^set\s+interfaces\s+(?:ethernet|switch|bridge)\s+(\S+)\s+description\s+"?([^"\n]+)"?/gim)) {
    pushFact(facts, {
      type: "neighbor",
      vendor: "Ubiquiti",
      label: "Ubiquiti interface description",
      value: `${match[1]}: ${match[2].trim()}`,
      device: hostname,
      interfaceName: match[1],
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }
  for (const match of rawText.matchAll(/^set\s+protocols\s+static\s+route\s+(\S+)\s+next-hop\s+(\d+\.\d+\.\d+\.\d+)/gim)) {
    pushFact(facts, {
      type: "route",
      vendor: "Ubiquiti",
      label: match[1] === "0.0.0.0/0" ? "Ubiquiti default route" : "Ubiquiti static route",
      value: `${match[1]} via ${match[2]}`,
      device: hostname,
      ip: match[2],
      cidr: match[1],
      prefix: match[1],
      confidence: "high",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }
  for (const match of rawText.matchAll(/^set\s+firewall\s+name\s+(\S+)\s+rule\s+(\d+)\s+action\s+(\S+)/gim)) {
    pushFact(facts, {
      type: "firewall-policy",
      vendor: "Ubiquiti",
      label: "Ubiquiti firewall rule",
      value: `${match[1]} rule ${match[2]} ${match[3]}`,
      device: hostname,
      confidence: "medium",
      sourceFile,
      sanitizedEvidence: sanitizeConfigText(match[0])
    });
  }

  // ---- Hierarchical form ----
  const lines = rawText.split("\n");
  let currentInterface: string | undefined;
  let currentVif: string | undefined;
  let currentRoute: string | undefined;
  let interfaceDepth = -1;
  let vifDepth = -1;
  let routeDepth = -1;
  let depth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const ifaceOpen = line.match(/^(?:ethernet|switch|bridge)\s+(\S+)\s*\{/);
    const vifOpen = line.match(/^vif\s+(\d+)\s*\{/);
    const routeOpen = line.match(/^route\s+(\d+\.\d+\.\d+\.\d+\/\d+)\s*\{/);

    if (ifaceOpen) {
      currentInterface = ifaceOpen[1];
      interfaceDepth = depth;
    } else if (vifOpen && currentInterface) {
      currentVif = vifOpen[1];
      vifDepth = depth;
    } else if (routeOpen) {
      currentRoute = routeOpen[1];
      routeDepth = depth;
    } else if (currentInterface) {
      const address = line.match(/^address\s+(\S+)/)?.[1];
      if (address) {
        const interfaceName = currentVif ? `${currentInterface}.${currentVif}` : currentInterface;
        pushUbiquitiAddress(interfaceName, address, currentVif, line);
      }
      const description = line.match(/^description\s+"?([^"\n]+)"?/)?.[1];
      if (description) {
        const interfaceName = currentVif ? `${currentInterface}.${currentVif}` : currentInterface;
        pushFact(facts, {
          type: "neighbor",
          vendor: "Ubiquiti",
          label: "Ubiquiti interface description",
          value: `${interfaceName}: ${description.trim()}`,
          device: hostname,
          interfaceName,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: sanitizeConfigText(line)
        });
      }
    }

    if (currentRoute) {
      const nextHop = line.match(/^next-hop\s+(\d+\.\d+\.\d+\.\d+)/)?.[1];
      if (nextHop) {
        pushFact(facts, {
          type: "route",
          vendor: "Ubiquiti",
          label: currentRoute === "0.0.0.0/0" ? "Ubiquiti default route" : "Ubiquiti static route",
          value: `${currentRoute} via ${nextHop}`,
          device: hostname,
          ip: nextHop,
          cidr: currentRoute,
          prefix: currentRoute,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: sanitizeConfigText(line)
        });
      }
    }

    for (const char of line) {
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth <= vifDepth) { currentVif = undefined; vifDepth = -1; }
        if (depth <= interfaceDepth) { currentInterface = undefined; interfaceDepth = -1; }
        if (depth <= routeDepth) { currentRoute = undefined; routeDepth = -1; }
      }
    }
  }
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
    parseWindowsFacts({ rawText, sourceFile, hostname, facts });
  }

  if (vendor === "Linux" || vendor === "Unknown") {
    parseLinuxFacts({ rawText, sourceFile, hostname, facts });
  }

  if (vendor === "Check Point" || vendor === "Unknown") {
    parseCheckPointFacts({ rawText, sourceFile, hostname, facts });
  }

  if (vendor === "Ubiquiti" || vendor === "Unknown") {
    parseUbiquitiFacts({ rawText, sourceFile, hostname, facts });
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
      next.vrfs.push({ id: createId("vrf", fact.value), name: fact.value, description: `Imported from ${fact.sourceFile}`, origin: "imported" });
    }

    if (fact.type === "vlan" && fact.vlan) {
      const vlanId = Number(fact.vlan);
      if (Number.isInteger(vlanId) && !next.vlans.some((vlan) => vlan.vlanId === vlanId && vlan.siteId === defaultSite)) {
        next.vlans.push({ id: createId("vlan", `${defaultSite}-${vlanId}`), vlanId, name: `Imported VLAN ${vlanId}`, siteId: defaultSite, vrfId: defaultVrf, origin: "imported" });
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
        status: "active",
        origin: "imported"
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
