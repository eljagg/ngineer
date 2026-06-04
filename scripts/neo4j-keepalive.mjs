import neo4j from "neo4j-driver";

const required = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required Neo4j environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const database = process.env.NEO4J_DATABASE || "neo4j";
const appName = process.env.APP_NAME || "NGINEER";
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session({ database });

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
             k.lastPingAt AS lastPingAt,
             k.totalPings AS totalPings
      `,
      {
        id: "neo4j-keepalive",
        app: appName,
        kind: "neo4j-keepalive",
        source: "npm-script"
      }
    )
  );

  const record = result.records[0];
  const totalPings = record.get("totalPings");
  console.log(
    JSON.stringify(
      {
        ok: true,
        app: record.get("app"),
        database,
        lastPingAt: record.get("lastPingAt").toString(),
        totalPings: totalPings?.toNumber ? totalPings.toNumber() : totalPings
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("Neo4j keep-alive failed:", error);
  process.exit(1);
} finally {
  await session.close();
  await driver.close();
}
