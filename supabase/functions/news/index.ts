const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" } });
  try {
    const url = new URL(req.url);
    let issuers = (url.searchParams.get("q") || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!issuers.length && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (Array.isArray(b.issuers)) issuers = b.issuers;
    }
    issuers = [...new Set(issuers)].slice(0, 12);
    if (!issuers.length) return json({ items: [] });

    const names = issuers.map((n) => `"${n.replace(/["()]/g, "")}"`).join(" OR ");
    // Broad: anything that could move these economies, not just bond-specific news.
    const macro = `(economy OR economic OR bond OR bonds OR sukuk OR eurobond OR inflation OR IMF OR "credit rating" OR rating OR downgrade OR upgrade OR debt OR default OR currency OR devaluation OR deficit OR budget OR "central bank" OR "interest rate" OR GDP OR growth OR fiscal OR sanctions OR election OR reserves OR "foreign investment" OR oil OR "sovereign wealth")`;
    const exclude = `-baseball -"home run" -"Barry Bonds" -NBA -NFL -NHL -Pickford -footballer -soccer`;
    const query = `(${names}) ${macro} ${exclude}`;
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    const r = await fetch(rss, { headers: { "User-Agent": "Mozilla/5.0 (compatible; BondBook/1.0)" } });
    const xml = await r.text();

    const decode = (s) =>
      s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").trim();

    // Google News RSS ignores query exclusions, so drop sports stragglers here.
    const SPORTS = /\b(baseball|home run|derby|NBA|NFL|NHL|MLB|cardinals|dodgers|yankees|Barry Bonds|Jordan Walker|footballer|soccer|Pickford|Premier League|touchdown|playoff|striker|midfielder)\b/i;
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) && items.length < 15) {
      const blk = m[1];
      const pick = (tag) => {
        const mm = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return mm ? decode(mm[1]) : "";
      };
      let title = pick("title");
      const link = pick("link");
      const pubDate = pick("pubDate");
      const srcM = blk.match(/<source url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
      const source = srcM ? decode(srcM[2]) : pick("source");
      const domain = srcM ? srcM[1].replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : "";
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)).trim();
      if (title && link && !SPORTS.test(title)) items.push({ title, link, pubDate, source, domain });
    }
    return json({ items });
  } catch (e) {
    return json({ items: [], error: String(e) });
  }
});
