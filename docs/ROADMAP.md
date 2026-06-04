# NGINEER Roadmap

## v0.1.0 Foundation

- App shell
- Visual dashboard
- Neo4j environment structure
- Neo4j health endpoint
- Sample network graph data model
- Visual topology starter
- IPAM starter
- Traffic path analyzer starter
- Config builder starter with port mapping and rollback
- AI assistant workspace starter
- Documentation catalog starter
- Admin control center starter

## Next recommended versions

### v0.2.0 Auth and admin access
- Add login/signup
- Add admin and engineer roles
- Add protected admin routes
- Add bootstrap admin from `.env.local`

### v0.3.0 Real Neo4j graph views
- Read devices/sites/interfaces from Neo4j
- Add create/update/delete for source-of-truth objects
- Add port and link editor

### v0.4.0 Real IPAM
- Prefix CRUD
- IP address reservations
- VRF-aware overlap checks
- Duplicate IP checks
- VLAN-to-prefix mapping

### v0.5.0 Traffic path engine v1
- Source/destination selector
- Path calculation from graph relationships
- Hop table
- Blocked/allowed status
- Troubleshooting commands

### v0.6.0 Cisco config generator v1
- Interface templates
- Access/trunk ports
- VLANs
- OSPF basics
- BGP basics
- Diff and rollback

### v0.7.0 Documentation RAG foundation
- Official source catalog
- Document ingestion metadata
- Citation-aware answers
- Diagram metadata and app-owned schematic generation

### v0.8.0 MPLS service-provider foundation
- CE/PE/P modeling
- VRFs, RD, RT
- MP-BGP relationship modeling
- MPLS path visualization starter
