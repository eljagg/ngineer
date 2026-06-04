export type ServerEnv = {
  appName: string;
  appEnv: string;
  appUrl: string;
  neo4jUri?: string;
  neo4jUsername?: string;
  neo4jPassword?: string;
  neo4jDatabase: string;
  aiProvider?: string;
  openaiApiKey?: string;
  adminEmail?: string;
  adminName?: string;
};

export function getServerEnv(): ServerEnv {
  return {
    appName: process.env.APP_NAME || "NGINEER",
    appEnv: process.env.APP_ENV || "development",
    appUrl: process.env.APP_URL || "http://localhost:3000",
    neo4jUri: process.env.NEO4J_URI,
    neo4jUsername: process.env.NEO4J_USERNAME,
    neo4jPassword: process.env.NEO4J_PASSWORD,
    neo4jDatabase: process.env.NEO4J_DATABASE || "neo4j",
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
