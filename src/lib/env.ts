export type ServerEnv = {
  appName: string;
  appEnv: string;
  appUrl: string;
  neo4jUri?: string;
  neo4jUsername?: string;
  neo4jPassword?: string;
  neo4jDatabase: string;
  neo4jKeepAliveToken?: string;
  neo4jKeepAliveEnabled: boolean;
  aiProvider?: string;
  openaiApiKey?: string;
  adminEmail?: string;
  adminName?: string;
};

function readBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on", "enabled"].includes(value.toLowerCase());
}

export function getServerEnv(): ServerEnv {
  return {
    appName: process.env.APP_NAME || "NGINEER",
    appEnv: process.env.APP_ENV || "development",
    appUrl: process.env.APP_URL || "http://localhost:3000",
    neo4jUri: process.env.NEO4J_URI,
    neo4jUsername: process.env.NEO4J_USERNAME,
    neo4jPassword: process.env.NEO4J_PASSWORD,
    neo4jDatabase: process.env.NEO4J_DATABASE || "neo4j",
    neo4jKeepAliveToken: process.env.NEO4J_KEEPALIVE_TOKEN,
    neo4jKeepAliveEnabled: readBooleanEnv(process.env.NEO4J_KEEPALIVE_ENABLED, true),
    aiProvider: process.env.AI_PROVIDER,
    openaiApiKey: process.env.OPENAI_API_KEY,
    adminEmail: process.env.ADMIN_EMAIL,
    adminName: process.env.ADMIN_NAME
  };
}

export function getMissingNeo4jEnv(): string[] {
  const required = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"];
  return required.filter((key) => !process.env[key]);
}

export function getMissingNeo4jKeepAliveEnv(): string[] {
  const missing = getMissingNeo4jEnv();
  if (!process.env.NEO4J_KEEPALIVE_TOKEN) missing.push("NEO4J_KEEPALIVE_TOKEN");
  return missing;
}
