export type ConfigPlan = {
  title: string;
  summary: string;
  localDevice: string;
  localPort: string;
  remoteDevice: string;
  remotePort: string;
  vlan: string;
  vrf: string;
  config: string;
  rollback: string;
  validation: string[];
};

export const sampleCiscoAccessPlan: ConfigPlan = {
  title: "Branch CCTV Access Port Build",
  summary: "Creates VLAN 30, assigns an access port, documents the connected endpoint, and prepares a safe rollback.",
  localDevice: "BR-ACCESS-01",
  localPort: "Gi1/0/10",
  remoteDevice: "CCTV-CAM-010",
  remotePort: "eth0",
  vlan: "30",
  vrf: "CUST-A",
  config: `! Change: Branch CCTV access port
! Local:  BR-ACCESS-01 Gi1/0/10
! Remote: CCTV-CAM-010 eth0
vlan 30
 name CCTV
!
interface GigabitEthernet1/0/10
 description CCTV-CAM-010 eth0 | VLAN30 | CUST-A
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
!`,
  rollback: `interface GigabitEthernet1/0/10
 description ROLLBACK - previous state required from backup
 shutdown
 no switchport access vlan 30
!
no vlan 30`,
  validation: [
    "Confirm VLAN 30 does not conflict with existing site VLANs.",
    "Confirm Gi1/0/10 is not already allocated in the source of truth.",
    "Confirm CCTV-CAM-010 MAC/IP reservation exists in IPAM.",
    "Confirm trunk uplinks carry VLAN 30 from access to gateway.",
    "Confirm firewall policy allows only approved CCTV/NVR flows."
  ]
};
