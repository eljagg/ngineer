export type DeviceRole = "Core" | "Distribution" | "Access" | "Firewall" | "Server" | "Provider Edge" | "Provider Core" | "Customer Edge";

export type DeviceNode = {
  id: string;
  name: string;
  vendor: string;
  model: string;
  role: DeviceRole;
  site: string;
  x: number;
  y: number;
  ports: string[];
};

export type NetworkLink = {
  id: string;
  a: string;
  aPort: string;
  b: string;
  bPort: string;
  purpose: string;
  vlan?: string;
  vrf?: string;
  protocol?: string;
};

export type TrafficHop = {
  order: number;
  device: string;
  ingress: string;
  egress: string;
  domain: string;
  decision: "forward" | "inspect" | "route" | "label-switch" | "deliver";
  notes: string;
};

export const devices: DeviceNode[] = [
  { id: "br-access-01", name: "BR-ACCESS-01", vendor: "Cisco", model: "Catalyst", role: "Access", site: "Branch", x: 8, y: 62, ports: ["Gi1/0/10", "Gi1/0/48"] },
  { id: "br-ce-01", name: "BR-CE-01", vendor: "Cisco", model: "ISR", role: "Customer Edge", site: "Branch", x: 21, y: 46, ports: ["Gi0/0/0", "Gi0/0/1"] },
  { id: "sp-pe-01", name: "SP-PE-01", vendor: "Cisco", model: "ASR", role: "Provider Edge", site: "Provider", x: 36, y: 30, ports: ["Gi0/0/0", "Gi0/0/2"] },
  { id: "sp-p-01", name: "SP-P-01", vendor: "Cisco", model: "Core", role: "Provider Core", site: "Provider", x: 50, y: 22, ports: ["Te0/0/0", "Te0/0/1"] },
  { id: "hq-pe-01", name: "HQ-PE-01", vendor: "Cisco", model: "ASR", role: "Provider Edge", site: "HQ", x: 64, y: 30, ports: ["Gi0/0/0", "Gi0/0/2"] },
  { id: "hq-fw-01", name: "HQ-FW-01", vendor: "Palo Alto", model: "PA-Series", role: "Firewall", site: "HQ", x: 77, y: 46, ports: ["ethernet1/1", "ethernet1/2"] },
  { id: "hq-db-01", name: "HQ-DB-01", vendor: "Linux", model: "RHEL", role: "Server", site: "HQ", x: 90, y: 62, ports: ["ens192"] }
];

export const links: NetworkLink[] = [
  { id: "l1", a: "br-access-01", aPort: "Gi1/0/48", b: "br-ce-01", bPort: "Gi0/0/1", purpose: "Branch user VLAN uplink", vlan: "20", vrf: "CUST-A", protocol: "802.1Q/STP" },
  { id: "l2", a: "br-ce-01", aPort: "Gi0/0/0", b: "sp-pe-01", bPort: "Gi0/0/0", purpose: "Customer handoff", vrf: "CUST-A", protocol: "eBGP CE-PE" },
  { id: "l3", a: "sp-pe-01", aPort: "Gi0/0/2", b: "sp-p-01", bPort: "Te0/0/0", purpose: "MPLS provider core", vrf: "Global", protocol: "MPLS LDP/IGP" },
  { id: "l4", a: "sp-p-01", aPort: "Te0/0/1", b: "hq-pe-01", bPort: "Gi0/0/2", purpose: "MPLS provider core", vrf: "Global", protocol: "MPLS LDP/IGP" },
  { id: "l5", a: "hq-pe-01", aPort: "Gi0/0/0", b: "hq-fw-01", bPort: "ethernet1/1", purpose: "HQ customer edge security handoff", vrf: "CUST-A", protocol: "eBGP/Firewall zone" },
  { id: "l6", a: "hq-fw-01", aPort: "ethernet1/2", b: "hq-db-01", bPort: "ens192", purpose: "Application server segment", vlan: "120", vrf: "CUST-A", protocol: "Security policy/NAT" }
];

export const sampleTrafficPath: TrafficHop[] = [
  { order: 1, device: "BR-ACCESS-01", ingress: "Gi1/0/10", egress: "Gi1/0/48", domain: "Layer 2 / STP", decision: "forward", notes: "User endpoint enters VLAN 20; STP forwarding state required on uplink." },
  { order: 2, device: "BR-CE-01", ingress: "Gi0/0/1.20", egress: "Gi0/0/0", domain: "VRF CUST-A / BGP", decision: "route", notes: "Default gateway routes from Branch VLAN 20 toward MPLS CE-PE handoff." },
  { order: 3, device: "SP-PE-01", ingress: "Gi0/0/0", egress: "Gi0/0/2", domain: "MPLS L3VPN", decision: "label-switch", notes: "Customer route enters VRF CUST-A; VPN label and transport label are imposed." },
  { order: 4, device: "SP-P-01", ingress: "Te0/0/0", egress: "Te0/0/1", domain: "MPLS Core", decision: "label-switch", notes: "Provider core switches labels; it should not need customer routes." },
  { order: 5, device: "HQ-PE-01", ingress: "Gi0/0/2", egress: "Gi0/0/0", domain: "MPLS L3VPN", decision: "route", notes: "VPN label is removed; route is exported toward HQ security edge." },
  { order: 6, device: "HQ-FW-01", ingress: "ethernet1/1", egress: "ethernet1/2", domain: "Firewall / NAT", decision: "inspect", notes: "Security policy must allow Branch VLAN 20 to DB segment VLAN 120 on approved ports." },
  { order: 7, device: "HQ-DB-01", ingress: "ens192", egress: "local", domain: "Linux Server", decision: "deliver", notes: "Server firewall, route table, and listening service must match the application requirement." }
];
