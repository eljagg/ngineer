import { NextRequest, NextResponse } from "next/server";
import { getMissingNeo4jEnv, getServerEnv } from "@/lib/env";
import { getNeo4jDriver } from "@/lib/neo4j";
import { apiErrorResponse, requireIpamApiToken } from "@/lib/api-auth";
import { sanitizeConfigText, type ImportFact, type IpamInventory } from "@/lib/ipam-model";

type CommitRequestBody = {
  inventory?: IpamInventory;
  approvedFacts?: ImportFact[];
};

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;
const MAX_IMPORT_JOBS = 50;
const MAX_FACTS = 2000;

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** Demo seed records must never be persisted as source of truth. */
function dropDemoRows<T extends { origin?: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.origin !== "demo");
}

export async function POST(request: NextRequest) {
  const unauthorized = requireIpamApiToken(request);
  if (unauthorized) return unauthorized;

  const missing = getMissingNeo4jEnv();
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: "Missing Neo4j environment variables", missing }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to read request body" }, { status: 400 });
  }

  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Commit payload exceeds ${MAX_BODY_BYTES} bytes. Split the commit into smaller batches.` },
      { status: 413 }
    );
  }

  let body: CommitRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const env = getServerEnv();
  const inventory = body.inventory;
  const approvedFacts = asArray(body.approvedFacts).filter((fact) => fact.approved);

  if (asArray(inventory?.importJobs).length > MAX_IMPORT_JOBS) {
    return NextResponse.json({ ok: false, error: `Too many import jobs in one commit (max ${MAX_IMPORT_JOBS}).` }, { status: 413 });
  }

  if (approvedFacts.length > MAX_FACTS) {
    return NextResponse.json({ ok: false, error: `Too many approved facts in one commit (max ${MAX_FACTS}).` }, { status: 413 });
  }

  const sites = dropDemoRows(asArray(inventory?.sites));
  const vrfs = dropDemoRows(asArray(inventory?.vrfs));
  const vlans = dropDemoRows(asArray(inventory?.vlans));
  const prefixes = dropDemoRows(asArray(inventory?.prefixes));
  const addresses = asArray(inventory?.addresses).filter((row) => row.source !== "demo");

  if (!inventory && approvedFacts.length === 0) {
    return NextResponse.json({ ok: false, error: "No IPAM inventory or approved import facts supplied" }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: env.neo4jDatabase });

  try {
    const importJobRows = asArray(inventory?.importJobs).map((job) => ({
      id: job.id,
      vendor: job.vendor,
      sourceName: job.sourceName,
      createdAt: job.createdAt,
      sanitizedPreview: sanitizeConfigText(job.sanitizedPreview || "").slice(0, 12000)
    }));

    const factRows = approvedFacts.map((fact) => ({
      id: fact.id,
      type: fact.type,
      vendor: fact.vendor,
      label: fact.label,
      value: fact.value,
      device: fact.device || null,
      interfaceName: fact.interfaceName || null,
      siteHint: fact.siteHint || null,
      vrf: fact.vrf || null,
      vlan: fact.vlan || null,
      cidr: fact.cidr || null,
      ip: fact.ip || null,
      prefix: fact.prefix || null,
      confidence: fact.confidence,
      sourceFile: fact.sourceFile,
      sanitizedEvidence: sanitizeConfigText(fact.sanitizedEvidence || "").slice(0, 4000)
    }));

    const result = await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MERGE (app:AppSystem {id: $appId})
        SET app.name = $appName,
            app.lastIpamCommitAt = datetime(),
            app.ipamCommitCount = coalesce(app.ipamCommitCount, 0) + 1
        `,
        { appId: "ngineer", appName: env.appName }
      );

      await tx.run(
        `
        UNWIND $sites AS row
        MERGE (s:Site {id: row.id})
        SET s.name = row.name,
            s.region = row.region,
            s.role = row.role,
            s.updatedAt = datetime()
        `,
        { sites }
      );

      await tx.run(
        `
        UNWIND $vrfs AS row
        MERGE (v:VRF {id: row.id})
        SET v.name = row.name,
            v.rd = row.rd,
            v.description = row.description,
            v.updatedAt = datetime()
        `,
        { vrfs }
      );

      await tx.run(
        `
        UNWIND $vlans AS row
        MERGE (vlan:VLAN {id: row.id})
        SET vlan.vlanId = row.vlanId,
            vlan.name = row.name,
            vlan.updatedAt = datetime()
        WITH vlan, row
        MATCH (s:Site {id: row.siteId})
        MATCH (vrf:VRF {id: row.vrfId})
        MERGE (s)-[:HAS_VLAN]->(vlan)
        MERGE (vlan)-[:IN_VRF]->(vrf)
        `,
        { vlans }
      );

      await tx.run(
        `
        UNWIND $prefixes AS row
        MERGE (p:Prefix {id: row.id})
        SET p.cidr = row.cidr,
            p.gateway = row.gateway,
            p.purpose = row.purpose,
            p.status = row.status,
            p.updatedAt = datetime()
        WITH p, row
        MATCH (s:Site {id: row.siteId})
        MATCH (vrf:VRF {id: row.vrfId})
        MERGE (s)-[:HAS_PREFIX]->(p)
        MERGE (p)-[:IN_VRF]->(vrf)
        WITH p, row
        OPTIONAL MATCH (vlan:VLAN {id: row.vlanId})
        FOREACH (_ IN CASE WHEN vlan IS NULL THEN [] ELSE [1] END | MERGE (vlan)-[:USES_PREFIX]->(p))
        `,
        { prefixes }
      );

      await tx.run(
        `
        UNWIND $addresses AS row
        MERGE (ip:IPAddress {id: row.id})
        SET ip.address = row.address,
            ip.hostname = row.hostname,
            ip.device = row.device,
            ip.interfaceName = row.interfaceName,
            ip.role = row.role,
            ip.source = row.source,
            ip.updatedAt = datetime()
        WITH ip, row
        OPTIONAL MATCH (p:Prefix {id: row.prefixId})
        OPTIONAL MATCH (s:Site {id: row.siteId})
        OPTIONAL MATCH (vrf:VRF {id: row.vrfId})
        FOREACH (_ IN CASE WHEN p IS NULL THEN [] ELSE [1] END | MERGE (ip)-[:IN_PREFIX]->(p))
        FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END | MERGE (s)-[:HAS_IP]->(ip))
        FOREACH (_ IN CASE WHEN vrf IS NULL THEN [] ELSE [1] END | MERGE (ip)-[:IN_VRF]->(vrf))
        FOREACH (_ IN CASE WHEN row.device IS NULL OR row.device = "" THEN [] ELSE [1] END |
          MERGE (d:Device {name: row.device})
          MERGE (i:Interface {device: row.device, name: coalesce(row.interfaceName, "unknown")})
          MERGE (d)-[:HAS_INTERFACE]->(i)
          MERGE (i)-[:HAS_IP]->(ip)
        )
        `,
        { addresses }
      );

      await tx.run(
        `
        UNWIND $jobs AS row
        MERGE (j:ImportJob {id: row.id})
        SET j.vendor = row.vendor,
            j.sourceName = row.sourceName,
            j.createdAt = datetime(row.createdAt),
            j.sanitizedPreview = row.sanitizedPreview,
            j.updatedAt = datetime()
        `,
        { jobs: importJobRows }
      );

      await tx.run(
        `
        UNWIND $facts AS row
        MERGE (f:ImportedFact {id: row.id})
        SET f.type = row.type,
            f.vendor = row.vendor,
            f.label = row.label,
            f.value = row.value,
            f.device = row.device,
            f.interfaceName = row.interfaceName,
            f.siteHint = row.siteHint,
            f.vrf = row.vrf,
            f.vlan = row.vlan,
            f.cidr = row.cidr,
            f.ip = row.ip,
            f.prefix = row.prefix,
            f.confidence = row.confidence,
            f.sourceFile = row.sourceFile,
            f.sanitizedEvidence = row.sanitizedEvidence,
            f.approved = true,
            f.updatedAt = datetime()
        WITH f, row
        OPTIONAL MATCH (d:Device {name: row.device})
        OPTIONAL MATCH (p:Prefix {cidr: row.cidr})
        OPTIONAL MATCH (ip:IPAddress {address: row.ip})
        FOREACH (_ IN CASE WHEN d IS NULL THEN [] ELSE [1] END | MERGE (f)-[:MAPS_TO]->(d))
        FOREACH (_ IN CASE WHEN p IS NULL THEN [] ELSE [1] END | MERGE (f)-[:MAPS_TO]->(p))
        FOREACH (_ IN CASE WHEN ip IS NULL THEN [] ELSE [1] END | MERGE (f)-[:MAPS_TO]->(ip))
        `,
        { facts: factRows }
      );

      return {
        importJobs: importJobRows.length,
        facts: factRows.length,
        sites: sites.length,
        vrfs: vrfs.length,
        vlans: vlans.length,
        prefixes: prefixes.length,
        addresses: addresses.length,
        demoRowsExcluded:
          asArray(inventory?.sites).length - sites.length +
          asArray(inventory?.vrfs).length - vrfs.length +
          asArray(inventory?.vlans).length - vlans.length +
          asArray(inventory?.prefixes).length - prefixes.length +
          (asArray(inventory?.addresses).length - addresses.length)
      };
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return apiErrorResponse("IPAM commit", error);
  } finally {
    await session.close();
  }
}
