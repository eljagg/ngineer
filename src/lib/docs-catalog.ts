export type DocCategory = "Vendor" | "Operating System" | "Protocol" | "Discipline";

export type DocSource = {
  id: string;
  category: DocCategory;
  vendor: string;
  area: string;
  title: string;
  url: string;
  useCase: string;
  topics: string[];
};

/**
 * Curated official-documentation catalog. URLs deliberately point at stable
 * vendor documentation roots and IETF datatracker pages rather than deep
 * links, so the catalog survives vendor site reorganizations. This is the
 * source list the future RAG/AI Assistant layer will index and cite.
 */
export const docsCatalog: DocSource[] = [
  // ---- Vendors ----
  {
    id: "cisco-switching",
    category: "Vendor",
    vendor: "Cisco",
    area: "Switches",
    title: "Cisco Catalyst / Nexus switching documentation",
    url: "https://www.cisco.com/c/en/us/support/switches/index.html",
    useCase: "Catalyst and Nexus platform configuration guides: VLANs, trunking, STP, stacking, port security, QoS.",
    topics: ["VLAN", "Trunking", "STP", "Port security", "Stacking"]
  },
  {
    id: "cisco-routing",
    category: "Vendor",
    vendor: "Cisco",
    area: "Routers",
    title: "Cisco ISR / ASR / IOS XE routing documentation",
    url: "https://www.cisco.com/c/en/us/support/routers/index.html",
    useCase: "Router platform guides: interfaces, routing protocols, VRFs, NAT, QoS, WAN and SD-WAN features.",
    topics: ["Routing", "VRF", "NAT", "WAN", "IOS XE"]
  },
  {
    id: "cisco-security",
    category: "Vendor",
    vendor: "Cisco",
    area: "Firewalls",
    title: "Cisco ASA / Secure Firewall (FTD) documentation",
    url: "https://www.cisco.com/c/en/us/support/security/index.html",
    useCase: "ASA and Firepower/Secure Firewall: access policies, NAT, VPN, HA, and migration guidance.",
    topics: ["ASA", "FTD", "Access policy", "VPN", "NAT"]
  },
  {
    id: "fortinet-fortigate",
    category: "Vendor",
    vendor: "Fortinet",
    area: "Firewalls",
    title: "FortiGate / FortiOS administration guides",
    url: "https://docs.fortinet.com/product/fortigate",
    useCase: "FortiGate interfaces, zones, policies, routing, SD-WAN, IPsec/SSL VPN, and HA configuration.",
    topics: ["FortiOS", "Policies", "SD-WAN", "IPsec", "HA"]
  },
  {
    id: "fortinet-fortiswitch",
    category: "Vendor",
    vendor: "Fortinet",
    area: "Switches",
    title: "FortiSwitch administration guides",
    url: "https://docs.fortinet.com/product/fortiswitch",
    useCase: "FortiSwitch standalone and FortiLink-managed switching: VLANs, trunks, PoE, 802.1X.",
    topics: ["FortiLink", "VLAN", "PoE", "802.1X"]
  },
  {
    id: "paloalto-panos",
    category: "Vendor",
    vendor: "Palo Alto Networks",
    area: "Firewalls",
    title: "PAN-OS administration documentation",
    url: "https://docs.paloaltonetworks.com/pan-os",
    useCase: "PAN-OS zones, security/NAT policy, App-ID, User-ID, virtual routers, GlobalProtect, HA.",
    topics: ["PAN-OS", "Zones", "App-ID", "GlobalProtect", "HA"]
  },
  {
    id: "dell-networking",
    category: "Vendor",
    vendor: "Dell",
    area: "Switches",
    title: "Dell Networking / SmartFabric OS10 documentation",
    url: "https://www.dell.com/support/home/",
    useCase: "Dell PowerSwitch and OS10: CLI reference, VLANs, LAG/VLT, routing, and firmware guidance. Search the support portal for 'SmartFabric OS10'.",
    topics: ["OS10", "VLT", "PowerSwitch", "CLI"]
  },
  {
    id: "pfsense",
    category: "Vendor",
    vendor: "Netgate",
    area: "Firewalls",
    title: "pfSense official documentation",
    url: "https://docs.netgate.com/pfsense/en/latest/",
    useCase: "pfSense interfaces, firewall rules, NAT, VPN (IPsec/OpenVPN/WireGuard), HA/CARP, packages.",
    topics: ["pfSense", "Rules", "NAT", "CARP", "VPN"]
  },

  // ---- Operating systems ----
  {
    id: "redhat-rhel",
    category: "Operating System",
    vendor: "Red Hat",
    area: "Linux",
    title: "Red Hat Enterprise Linux documentation",
    url: "https://docs.redhat.com/en",
    useCase: "RHEL networking (NetworkManager, nmcli, bonding, firewalld), storage, identity, and hardening guides.",
    topics: ["RHEL", "nmcli", "firewalld", "Bonding", "SELinux"]
  },
  {
    id: "linux-mint",
    category: "Operating System",
    vendor: "Linux Mint",
    area: "Linux",
    title: "Linux Mint official documentation",
    url: "https://linuxmint.com/documentation.php",
    useCase: "Mint installation, user, and troubleshooting guides for desktop/edge Linux endpoints on the network.",
    topics: ["Mint", "Installation", "Troubleshooting"]
  },
  {
    id: "windows-server",
    category: "Operating System",
    vendor: "Microsoft",
    area: "Windows Server",
    title: "Windows Server documentation",
    url: "https://learn.microsoft.com/en-us/windows-server/",
    useCase: "Windows Server roles and networking: DNS, DHCP, NPS, failover clustering, and server core management.",
    topics: ["DNS", "DHCP", "NPS", "Clustering"]
  },
  {
    id: "windows-adds",
    category: "Operating System",
    vendor: "Microsoft",
    area: "Active Directory",
    title: "Active Directory Domain Services documentation",
    url: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/",
    useCase: "AD DS design and operations: domains, sites and subnets, replication, FSMO, trusts, and DC deployment.",
    topics: ["AD DS", "Sites", "Replication", "FSMO", "Trusts"]
  },
  {
    id: "windows-gpo",
    category: "Operating System",
    vendor: "Microsoft",
    area: "Group Policy",
    title: "Group Policy overview and management",
    url: "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/hh831791(v=ws.11)",
    useCase: "GPO creation, linking, inheritance, security filtering, and preference vs. policy behavior.",
    topics: ["GPO", "Inheritance", "Security filtering", "ADMX"]
  },

  // ---- Protocols ----
  {
    id: "ospf",
    category: "Protocol",
    vendor: "IETF / Cisco",
    area: "OSPF",
    title: "OSPFv2 - RFC 2328 + Cisco IP routing configuration",
    url: "https://datatracker.ietf.org/doc/html/rfc2328",
    useCase: "OSPF areas, LSA types, DR/BDR, stub/NSSA, authentication, and cost tuning. Pair with Cisco: cisco.com/c/en/us/tech/ip/ip-routing/",
    topics: ["Areas", "LSA", "DR/BDR", "NSSA", "Authentication"]
  },
  {
    id: "bgp",
    category: "Protocol",
    vendor: "IETF / Cisco",
    area: "BGP",
    title: "BGP-4 - RFC 4271 + vendor configuration guides",
    url: "https://datatracker.ietf.org/doc/html/rfc4271",
    useCase: "eBGP/iBGP peering, path attributes, route filtering, communities, route reflectors, and MP-BGP for VPNs.",
    topics: ["eBGP", "iBGP", "Attributes", "Communities", "Route reflector"]
  },
  {
    id: "eigrp",
    category: "Protocol",
    vendor: "IETF / Cisco",
    area: "EIGRP",
    title: "EIGRP - RFC 7868 + Cisco configuration guides",
    url: "https://datatracker.ietf.org/doc/html/rfc7868",
    useCase: "EIGRP metrics (K-values), feasible successors, stub routing, summarization, named mode, authentication.",
    topics: ["DUAL", "Feasible successor", "Stub", "Named mode"]
  },
  {
    id: "stp",
    category: "Protocol",
    vendor: "IEEE / Cisco",
    area: "STP",
    title: "Spanning Tree (802.1D/802.1w) - Cisco STP technology guides",
    url: "https://www.cisco.com/c/en/us/tech/lan-switching/spanning-tree-protocol/index.html",
    useCase: "STP/RSTP/RPVST+/MST: root election, port roles, PortFast, BPDU Guard, Root Guard, loop prevention.",
    topics: ["RPVST+", "MST", "PortFast", "BPDU Guard", "Root Guard"]
  },
  {
    id: "mpls",
    category: "Protocol",
    vendor: "IETF / Cisco",
    area: "MPLS",
    title: "MPLS architecture - RFC 3031 + Cisco MPLS technology guides",
    url: "https://datatracker.ietf.org/doc/html/rfc3031",
    useCase: "Label switching, LDP, L3VPN (VRF/RD/RT, MP-BGP), CE/PE/P roles, and traffic engineering concepts.",
    topics: ["LDP", "L3VPN", "RD/RT", "PE/P/CE", "TE"]
  },

  // ---- Disciplines ----
  {
    id: "ipam",
    category: "Discipline",
    vendor: "IETF",
    area: "IPAM",
    title: "IP address management foundations - RFC 1918 + RFC 4632 (CIDR)",
    url: "https://datatracker.ietf.org/doc/html/rfc1918",
    useCase: "Private addressing, CIDR planning, subnetting discipline, and allocation strategy. NGINEER's IPAM workspace implements these practices.",
    topics: ["RFC1918", "CIDR", "Subnetting", "Allocation"]
  }
];

export const docCategories: DocCategory[] = ["Vendor", "Operating System", "Protocol", "Discipline"];
