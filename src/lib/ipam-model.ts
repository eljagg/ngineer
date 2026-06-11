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
    const interfaceBlocks = rawText.split(/\n(?=interface\s+)/i);
    for (const block of interfaceBlocks) {
      const interfaceName = block.match(/^interface\s+([^\n]+)/i)?.[1]?.trim();
      if (!interfaceName) continue;

      pushFact(facts, {
        type: "interface",
        vendor: "Cisco",
        label: "Cisco interface",
        value: interfaceName,
        device: hostname,
        interfaceName,
        confidence: "high",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText(block.split("\n").slice(0, 8).join("\n"))
      });

      const description = block.match(/description\s+([^\n]+)/i)?.[1]?.trim();
      const vlanAccess = block.match(/switchport\s+access\s+vlan\s+(\d+)/i)?.[1];
      const nativeVlan = block.match(/switchport\s+trunk\s+native\s+vlan\s+(\d+)/i)?.[1];
      const ipMatch = block.match(/ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i);
      const vrf = block.match(/vrf\s+forwarding\s+(\S+)/i)?.[1] || block.match(/ip\s+vrf\s+forwarding\s+(\S+)/i)?.[1];

      if (description) {
        pushFact(facts, {
          type: "neighbor",
          vendor: "Cisco",
          label: "Interface description / possible peer",
          value: description,
          device: hostname,
          interfaceName,
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: `interface ${interfaceName}\n description ${description}`
        });
      }

      if (vlanAccess || nativeVlan) {
        const vlan = vlanAccess || nativeVlan || "unknown";
        pushFact(facts, {
          type: "vlan",
          vendor: "Cisco",
          label: vlanAccess ? "Access VLAN" : "Native VLAN",
          value: vlan,
          device: hostname,
          interfaceName,
          vlan,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `interface ${interfaceName}\n switchport vlan ${vlan}`
        });
      }

      if (vrf) {
        pushFact(facts, {
          type: "vrf",
          vendor: "Cisco",
          label: "Interface VRF",
          value: vrf,
          device: hostname,
          interfaceName,
          vrf,
          confidence: "high",
          sourceFile,
          sanitizedEvidence: `interface ${interfaceName}\n vrf forwarding ${vrf}`
        });
      }

      if (ipMatch) {
        const ip = ipMatch[1];
        const cidr = derivePrefixFromIp(ip, ipMatch[2]);
        if (cidr) {
          pushFact(facts, {
            type: "prefix",
            vendor: "Cisco",
            label: "Connected prefix",
            value: cidr,
            device: hostname,
            interfaceName,
            cidr,
            prefix: cidr,
            vrf,
            vlan: interfaceName.toLowerCase().startsWith("vlan") ? interfaceName.replace(/\D+/g, "") : undefined,
            confidence: "high",
            sourceFile,
            sanitizedEvidence: `interface ${interfaceName}\n ip address ${ip} ${ipMatch[2]}`
          });
          pushFact(facts, {
            type: "ip-address",
            vendor: "Cisco",
            label: "Interface IP address",
            value: ip,
            device: hostname,
            interfaceName,
            ip,
            cidr,
            prefix: cidr,
            vrf,
            confidence: "high",
            sourceFile,
            sanitizedEvidence: `interface ${interfaceName}\n ip address ${ip} ${ipMatch[2]}`
          });
        }
      }
    }

    for (const line of rawText.split("\n")) {
      const showIpBrief = line.match(/^\s*(\S+)\s+(\d+\.\d+\.\d+\.\d+)\s+\S+\s+\S+\s+\S+\s+(up|down|administratively down)/i);
      if (showIpBrief) {
        pushFact(facts, {
          type: "ip-address",
          vendor: "Cisco",
          label: "show ip interface brief address",
          value: showIpBrief[2],
          device: hostname,
          interfaceName: showIpBrief[1],
          ip: showIpBrief[2],
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }

      const vlanBrief = line.match(/^\s*(\d+)\s+([A-Za-z0-9_.-]+)\s+(active|suspended|act\/lshut)/i);
      if (vlanBrief) {
        pushFact(facts, {
          type: "vlan",
          vendor: "Cisco",
          label: "VLAN from vlan brief",
          value: `${vlanBrief[1]} ${vlanBrief[2]}`,
          device: hostname,
          vlan: vlanBrief[1],
          confidence: "medium",
          sourceFile,
          sanitizedEvidence: line.trim()
        });
      }
    }
  }

  if (vendor === "Fortinet" || vendor === "Unknown") {
    const interfaceBlocks = rawText.split(/\n\s*edit\s+"/i);
    for (const block of interfaceBlocks) {
      const firstLine = block.split("\n")[0];
      const interfaceName = firstLine.replace(/"/g, "").trim();
      const ipMatch = block.match(/set\s+ip\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i);
      const alias = block.match(/set\s+alias\s+"([^"]+)"/i)?.[1];
      const vlan = block.match(/set\s+vlanid\s+(\d+)/i)?.[1];
      if (!interfaceName || (!ipMatch && !vlan && !alias)) continue;

      pushFact(facts, {
        type: "interface",
        vendor: "Fortinet",
        label: "Fortinet interface",
        value: interfaceName,
        device: hostname,
        interfaceName,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: sanitizeConfigText(block.split("\n").slice(0, 8).join("\n"))
      });

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
    }

    const policyMatches = rawText.matchAll(/edit\s+(\d+)[\s\S]*?set\s+srcintf\s+([^\n]+)[\s\S]*?set\s+dstintf\s+([^\n]+)[\s\S]*?set\s+action\s+(accept|deny)/gi);
    for (const match of policyMatches) {
      pushFact(facts, {
        type: "firewall-policy",
        vendor: "Fortinet",
        label: "Firewall policy",
        value: `policy ${match[1]} ${match[4]}`,
        device: hostname,
        confidence: "medium",
        sourceFile,
        sanitizedEvidence: `policy ${match[1]} ${match[2].trim()} -> ${match[3].trim()} ${match[4]}`
      });
    }
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
