import neo4j from "neo4j-driver";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const uri = required("NEO4J_URI");
const username = required("NEO4J_USERNAME");
const password = required("NEO4J_PASSWORD");
const database = process.env.NEO4J_DATABASE || "neo4j";

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
const session = driver.session({ database });

const cypher = `
CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT site_id_unique IF NOT EXISTS FOR (s:Site) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT device_id_unique IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT interface_id_unique IF NOT EXISTS FOR (i:Interface) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT vrf_id_unique IF NOT EXISTS FOR (v:VRF) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT prefix_id_unique IF NOT EXISTS FOR (p:Prefix) REQUIRE p.id IS UNIQUE;

MERGE (tenant:Tenant {id: 'tenant-default'})
  SET tenant.name = 'Default Tenant'
MERGE (branch:Site {id: 'site-branch'})
  SET branch.name = 'Branch', branch.type = 'branch'
MERGE (hq:Site {id: 'site-hq'})
  SET hq.name = 'HQ', hq.type = 'headquarters'
MERGE (provider:Site {id: 'site-provider'})
  SET provider.name = 'Service Provider', provider.type = 'provider'
MERGE (tenant)-[:HAS_SITE]->(branch)
MERGE (tenant)-[:HAS_SITE]->(hq)
MERGE (tenant)-[:HAS_SITE]->(provider)

MERGE (brAccess:Device {id: 'br-access-01'})
  SET brAccess.name = 'BR-ACCESS-01', brAccess.vendor = 'Cisco', brAccess.role = 'Access'
MERGE (brCe:Device {id: 'br-ce-01'})
  SET brCe.name = 'BR-CE-01', brCe.vendor = 'Cisco', brCe.role = 'Customer Edge'
MERGE (spPe:Device {id: 'sp-pe-01'})
  SET spPe.name = 'SP-PE-01', spPe.vendor = 'Cisco', spPe.role = 'Provider Edge'
MERGE (spP:Device {id: 'sp-p-01'})
  SET spP.name = 'SP-P-01', spP.vendor = 'Cisco', spP.role = 'Provider Core'
MERGE (hqPe:Device {id: 'hq-pe-01'})
  SET hqPe.name = 'HQ-PE-01', hqPe.vendor = 'Cisco', hqPe.role = 'Provider Edge'
MERGE (hqFw:Device {id: 'hq-fw-01'})
  SET hqFw.name = 'HQ-FW-01', hqFw.vendor = 'Palo Alto', hqFw.role = 'Firewall'
MERGE (hqDb:Device {id: 'hq-db-01'})
  SET hqDb.name = 'HQ-DB-01', hqDb.vendor = 'Red Hat', hqDb.role = 'Server'

MERGE (branch)-[:HAS_DEVICE]->(brAccess)
MERGE (branch)-[:HAS_DEVICE]->(brCe)
MERGE (provider)-[:HAS_DEVICE]->(spPe)
MERGE (provider)-[:HAS_DEVICE]->(spP)
MERGE (hq)-[:HAS_DEVICE]->(hqPe)
MERGE (hq)-[:HAS_DEVICE]->(hqFw)
MERGE (hq)-[:HAS_DEVICE]->(hqDb)

MERGE (custA:VRF {id: 'vrf-cust-a'}) SET custA.name = 'CUST-A'
MERGE (global:VRF {id: 'vrf-global'}) SET global.name = 'Global'
MERGE (tenant)-[:HAS_VRF]->(custA)
MERGE (tenant)-[:HAS_VRF]->(global)

MERGE (p1:Prefix {id: 'prefix-10-20-30-0-24'}) SET p1.cidr = '10.20.30.0/24', p1.purpose = 'Branch users'
MERGE (p2:Prefix {id: 'prefix-10-120-10-0-24'}) SET p2.cidr = '10.120.10.0/24', p2.purpose = 'HQ database segment'
MERGE (custA)-[:CONTAINS_PREFIX]->(p1)
MERGE (custA)-[:CONTAINS_PREFIX]->(p2)
`;

try {
  for (const statement of cypher.split(";")) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) await session.run(trimmed);
  }
  console.log("Neo4j seed completed for ngineer v0.1.0.");
} finally {
  await session.close();
  await driver.close();
}
