import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Constant-time token comparison. Length mismatch returns false immediately,
 * which leaks only token length, never content.
 */
export function safeTokenEqual(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}

/**
 * Extract a token from Authorization: Bearer or x-api-token header.
 * Query-string tokens are deliberately NOT supported: they leak into
 * access logs, proxies, and browser history.
 */
export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim() || null;
  }

  const headerToken = request.headers.get("x-api-token");
  if (headerToken) return headerToken.trim() || null;

  return null;
}

/**
 * Gate for IPAM write/read APIs until full auth/RBAC lands.
 * Fails closed and loud: missing server config is a 503, bad/missing
 * client token is a 401. Returns null when the request is authorized.
 */
export function requireIpamApiToken(request: NextRequest): NextResponse | null {
  const configured = process.env.IPAM_API_TOKEN;

  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "IPAM API token is not configured on the server. Set IPAM_API_TOKEN." },
      { status: 503 }
    );
  }

  const supplied = getBearerToken(request);
  if (!supplied || !safeTokenEqual(supplied, configured)) {
    return NextResponse.json({ ok: false, error: "Unauthorized. Supply a valid IPAM API token." }, { status: 401 });
  }

  return null;
}

/**
 * Log full error detail server-side, return only a generic message and a
 * short correlation reference to the client. Prevents Neo4j driver errors
 * from leaking connection URIs or internals.
 */
export function apiErrorResponse(scope: string, error: unknown, status = 500): NextResponse {
  const reference = Math.random().toString(36).slice(2, 10);
  console.error(`[${scope}] error ref=${reference}`, error);
  return NextResponse.json({ ok: false, error: `${scope} failed. Reference: ${reference}` }, { status });
}
