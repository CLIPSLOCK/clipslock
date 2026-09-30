// Cloudflare Worker. Set NOVA_POSHTA_API_KEY as a Secret in Settings.
const ORIGIN = "https://clipslock.github.io";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };
    const reply = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });
    const origin = request.headers.get("Origin");
    if (origin && origin !== ORIGIN) return reply({ error: "Forbidden" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") return reply({ error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.pathname !== "/") return reply({ error: "Not found" }, 404);
    const action = url.searchParams.get("action");
    if (!action) return reply({ service: "clipslock-nova-poshta", configured: !!env.NOVA_POSHTA_API_KEY });
    const query = (url.searchParams.get("q") || "").trim();
    if (query.length > 80) return reply({ error: "Query too long" }, 400);
    let method, properties;
    if (action === "cities") {
      if (query.length < 2) return reply({ items: [] });
      method = "searchSettlements";
      properties = { CityName: query, Limit: "20", Page: "1" };
    } else if (action === "warehouses") {
      const city = url.searchParams.get("city") || "";
      if (!UUID.test(city)) return reply({ error: "Invalid city" }, 400);
      const page = Number(url.searchParams.get("page") || "1");
      if (!Number.isInteger(page) || page < 1 || page > 100) return reply({ error: "Invalid page" }, 400);
      method = "getWarehouses";
      properties = { CityRef: city, FindByString: query, Limit: "100", Page: String(page), Language: "UA" };
    } else return reply({ error: "Unknown action" }, 400);
    if (!env.NOVA_POSHTA_API_KEY) return reply({ error: "Delivery service not configured" }, 503);
    try {
      const upstream = await fetch("https://api.novaposhta.ua/v2.0/json/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: env.NOVA_POSHTA_API_KEY, modelName: "Address", calledMethod: method, methodProperties: properties }),
        signal: AbortSignal.timeout(10000)
      });
      if (!upstream.ok) return reply({ error: "Delivery service unavailable" }, 502);
      const data = await upstream.json();
      if (!data.success) return reply({ error: "Delivery service request failed" }, 502);
      const items = action === "cities"
        ? (data.data?.[0]?.Addresses || []).filter(item => item.DeliveryCity && Number(item.Warehouses) > 0)
            .map(item => ({ ref: item.DeliveryCity, settlementRef: item.Ref, label: item.Present }))
        : (data.data || []).map(item => ({ ref: item.Ref, number: item.Number, label: item.Description, address: item.ShortAddress }));
      return reply({ items, hasMore: action === "warehouses" && items.length === 100 });
    } catch {
      return reply({ error: "Delivery service unavailable" }, 502);
    }
  }
};
