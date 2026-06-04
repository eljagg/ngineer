export type DocSource = {
  vendor: string;
  area: string;
  title: string;
  url: string;
  useCase: string;
};

export const docsCatalog: DocSource[] = [
  {
    vendor: "Cisco",
    area: "Switching/Routing/Firewall",
    title: "Cisco IOS XE, Catalyst, Nexus, ISR, ASA and Secure Firewall documentation",
    url: "https://www.cisco.com/c/en/us/support/index.html",
    useCase: "Official platform and protocol guidance for Cisco configs, diagrams, hardware references, and troubleshooting."
  },
  {
    vendor: "Fortinet",
    area: "FortiGate/FortiSwitch",
    title: "Fortinet Documentation Library",
    url: "https://docs.fortinet.com/",
    useCase: "FortiGate, FortiSwitch, FortiOS, security policies, interfaces, routing, and VPN documentation."
  },
  {
    vendor: "Palo Alto Networks",
    area: "Next-Generation Firewall",
    title: "Palo Alto Networks Documentation",
    url: "https://docs.paloaltonetworks.com/",
    useCase: "PAN-OS firewall administration, interfaces, zones, routing, NAT, policies, and hardware references."
  },
  {
    vendor: "Dell",
    area: "Switching",
    title: "Dell Networking SmartFabric OS10 documentation",
    url: "https://www.dell.com/support/home/",
    useCase: "Dell switch OS10 setup, interface, VLAN, routing, CLI, and troubleshooting documentation."
  },
  {
    vendor: "Red Hat",
    area: "Linux Networking",
    title: "Red Hat Enterprise Linux networking documentation",
    url: "https://docs.redhat.com/",
    useCase: "NetworkManager, routing, firewall, bonding, VLANs, bridges, and server network troubleshooting."
  },
  {
    vendor: "Linux Mint",
    area: "Linux Desktop/Server Support",
    title: "Linux Mint Documentation",
    url: "https://linuxmint.com/documentation.php",
    useCase: "Linux Mint platform documentation and user support references."
  },
  {
    vendor: "Microsoft",
    area: "Windows Server / AD / GPO / IPAM",
    title: "Microsoft Learn Windows Server documentation",
    url: "https://learn.microsoft.com/windows-server/",
    useCase: "Active Directory, Group Policy, DNS, DHCP, IPAM, Windows firewall, and server networking."
  },
  {
    vendor: "Netgate",
    area: "pfSense",
    title: "Netgate pfSense Documentation",
    url: "https://docs.netgate.com/pfsense/en/latest/",
    useCase: "pfSense interfaces, firewall rules, NAT, VPN, routing, diagnostics, and FRR routing package."
  }
];
