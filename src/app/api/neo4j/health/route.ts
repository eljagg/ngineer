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
    const result = await session.run("RETURN 1 AS healthy, datetime() AS checkedAt");
    const record = result.records[0];
    return NextResponse.json({
      ok: true,
      database: env.neo4jDatabase,
      healthy: record.get("healthy").toNumber ? record.get("healthy").toNumber() : record.get("healthy"),
      checkedAt: record.get("checkedAt").toString()
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Neo4j health-check error"
    }, { status: 500 });
  } finally {
    await session.close();
  }
}
