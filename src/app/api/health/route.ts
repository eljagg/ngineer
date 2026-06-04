import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export function GET() {
  const env = getServerEnv();
  return NextResponse.json({
    ok: true,
    app: env.appName,
    environment: env.appEnv,
    timestamp: new Date().toISOString(),
    features: {
      aiAssistant: process.env.ENABLE_AI_ASSISTANT === "true",
      ipam: process.env.ENABLE_IPAM === "true",
      trafficPathVisualizer: process.env.ENABLE_TRAFFIC_PATH_VISUALIZER === "true",
      mplsModule: process.env.ENABLE_MPLS_MODULE === "true",
      configGenerator: process.env.ENABLE_CONFIG_GENERATOR === "true"
    }
  });
}
