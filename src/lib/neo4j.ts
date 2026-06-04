import neo4j, { type Driver } from "neo4j-driver";
import { getServerEnv } from "./env";

let cachedDriver: Driver | undefined;

export function getNeo4jDriver(): Driver {
  if (cachedDriver) return cachedDriver;

  const env = getServerEnv();
  if (!env.neo4jUri || !env.neo4jUsername || !env.neo4jPassword) {
    throw new Error("Missing Neo4j environment variables. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in .env.local.");
  }

  cachedDriver = neo4j.driver(env.neo4jUri, neo4j.auth.basic(env.neo4jUsername, env.neo4jPassword));
  return cachedDriver;
}
