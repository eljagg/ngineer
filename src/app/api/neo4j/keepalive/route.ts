import { NextRequest, NextResponse } from "next/server";
import { getMissingNeo4jKeepAliveEnv, getServerEnv } from "@/lib/env";
import { getNeo4jDriver } from "@/lib/neo4j";

export const dynamic = "force-dynamic";

type KeepAliveNodeShape = {
  app: string;
  kind: string;
  lastPingAt: string;
  source: string;
};

function getRequestToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim();
  }

  const headerToken = request.headers.get("x-keepalive-token");
  if (headerToken) return headerToken.trim();

  return request.nextUrl.searchParams.get("token");
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (!env.neo4jKeepAliveEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "Neo4j keep-alive is disabled" }, { status: 409 });
  }

  const missing = getMissingNeo4jKeepAliveEnv();
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: "Missing Neo4j keep-alive environment variables", missing }, { status: 400 });
  }

  const requestToken = getRequestToken(request);
  if (!requestToken || requestToken !== env.neo4jKeepAliveToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized keep-alive request" }, { status: 401 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: env.neo4jDatabase });

  try {
    const result = await session.executeWrite((tx) =>
      tx.run(
        `
        MERGE (k:NgineerSystem {id: $id})
        ON CREATE SET
          k.createdAt = datetime(),
          k.app = $app,
          k.kind = $kind
        SET
          k.lastPingAt = datetime(),
          k.lastPingSource = $source,
          k.totalPings = coalesce(k.totalPings, 0) + 1
        RETURN k.app AS app,
               k.kind AS kind,
               k.lastPingAt AS lastPingAt,
               k.lastPingSource AS source,
               k.totalPings AS totalPings
        `,
        {
          id: "neo4j-keepalive",
          app: env.appName,
          kind: "neo4j-keepalive",
          source: request.headers.get("user-agent") || "scheduled-curl"
        }
      )
    );

    const record = result.records[0];
    const totalPings = record.get("totalPings");
    const payload: KeepAliveNodeShape & { database: string; totalPings: number | string } = {
      app: record.get("app"),
      kind: record.get("kind"),
      lastPingAt: record.get("lastPingAt").toString(),
      source: record.get("source"),
      database: env.neo4jDatabase,
      totalPings: totalPings?.toNumber ? totalPings.toNumber() : totalPings
    };

    return NextResponse.json({ ok: true, keepAlive: payload });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Neo4j keep-alive error"
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
