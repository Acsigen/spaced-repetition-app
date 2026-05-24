import type { Context } from "fresh";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function sameOriginGuard(
  ctx: Context<unknown>,
): Response | Promise<Response> {
  if (
    !ctx.url.pathname.startsWith("/api/") ||
    !MUTATING_METHODS.has(ctx.req.method)
  ) {
    return ctx.next();
  }

  const origin = ctx.req.headers.get("Origin");
  if (!origin) return ctx.next();

  const expected = Deno.env.get("PUBLIC_ORIGIN") ?? requestOrigin(ctx);
  if (normalizeOrigin(origin) !== normalizeOrigin(expected)) {
    return Response.json(
      { error: "Originea cererii nu este permisă." },
      { status: 403 },
    );
  }

  return ctx.next();
}

function requestOrigin(ctx: Context<unknown>): string {
  const host = ctx.req.headers.get("Host") ?? ctx.url.host;
  return `${ctx.url.protocol}//${host}`;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}
