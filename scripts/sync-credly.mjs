import fs from "node:fs/promises";
const target = new URL("../src/credly-badges.json", import.meta.url);
const username = "fcocantu";
const profile = "https://www.credly.com/users/fcocantu/badges/credly";
const badges = [];
const seen = new Set();
let next = "https://www.credly.com/users/" + username + "/badges.json";
try {
  for (let page = 0; page < 8 && next; page++) {
    const response = await fetch(next, {headers:{"Accept":"application/json","User-Agent":"Portfolio-Credly-Sync/1.0"},signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error("Credly responded HTTP " + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error("Unexpected Credly response");
    for (const badge of payload.data) {
      const name = badge?.badge_template?.name;
      const id = badge?.id;
      if (!name || !id || seen.has(id)) continue;
      seen.add(id);
      const image = badge?.badge_template?.image_url || null;
      const issuer = badge?.issuer?.name || badge?.badge_template?.issuer?.name ||
        badge?.badge_template?.issuer?.entities?.[0]?.entity?.name || "Credly issuer";
      badges.push({
        name,issuer,
        issued:badge.issued_at_date || null,
        expires:badge.expires_at_date || null,
        image: typeof image==="string" && /^https:\/\/images\.credly\.com\//.test(image) ? image : null,
        url:"https://www.credly.com/badges/" + encodeURIComponent(id)
      });
    }
    const upcoming = payload?.metadata?.next_page_url;
    next = upcoming ? new URL(upcoming,"https://www.credly.com").href : null;
    if (next && !next.startsWith("https://www.credly.com/users/")) next = null;
  }
  if (badges.length === 0) throw new Error("No public Credly badges returned");
  await fs.writeFile(target,JSON.stringify(badges,null,2)+"\n");
  console.log("Synced " + badges.length + " Credly badges with original image and verification links.");
} catch(err) {
  console.warn("Credly sync unavailable; retaining checked-in fallback cards: "+err.message);
}
