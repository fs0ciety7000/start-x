import "server-only";

const baseUrl = () => (process.env.RAIL_API_BASE_URL ?? "https://reseau.fs0ciety.org").replace(/\/$/, "");

export async function railFetch(path: string) {
  const url = new URL(path, `${baseUrl()}/`);
  return fetch(url, {
    cache: "no-store",
    redirect: "error",
    headers: { accept: "application/json, application/octet-stream", "accept-encoding": "identity" },
    signal: AbortSignal.timeout(8_000),
  });
}

export function railError(message = "Le service ferroviaire ne répond pas.") {
  return Response.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
}
