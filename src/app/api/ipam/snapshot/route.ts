import { NextResponse } from "next/server";
import { getMissingNeo4jEnv, getServerEnv } from "@/lib/env";
import { getNeo4jDriver } from "@/lib/neo4j";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = getMissingNeo4jEnv();
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: "Missing Neo4j environment variables", missing }, { status: 400 });
  }

  const env = getServerEnv();
  const driver = getNeo4jDriver();
  const session = driver.session({ database: env.neo4jDatabase });

  try {
    const result = await session.executeRead((tx) =>
      tx.run(
        `
        RETURN
          count { MATCH (:Site) } AS sites,
          count { MATCH (:VRF) } AS vrfs,
          count { MATCH (:VLAN) } AS vlans,
          count { MATCH (:Prefix) } AS prefixes,
          count { MATCH (:IPAddress) } AS addresses,
          count { MATCH (:ImportJob) } AS importJobs,
          count { MATCH (:ImportedFact) } AS importedFacts
        `
      )
    );

    const record = result.records[0];
    const read = (key: string) => {
      const value = record.get(key);
      return value?.toNumber ? value.toNumber() : value;
    };

    return NextResponse.json({
      ok: true,
      app: env.appName,
      database: env.neo4jDatabase,
      snapshot: {
        sites: read("sites"),
        vrfs: read("vrfs"),
        vlans: read("vlans"),
        prefixes: read("prefixes"),
        addresses: read("addresses"),
        importJobs: read("importJobs"),
        importedFacts: read("importedFacts")
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown IPAM snapshot error" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
