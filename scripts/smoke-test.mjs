import assert from "node:assert/strict";
const origin = "http://localhost:5173";
const headers = {
  "Content-Type": "application/json",
  Origin: origin,
  Cookie: "__sites_local_auth=1",
};
const request = async (path, method = "GET", body, custom = headers) => {
  const r = await fetch(origin + path, {
    method,
    headers: custom,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
};
assert.equal(
  (await request("/api/cafes", "GET", null, {})).status,
  401,
  "Anonymous admin blocked",
);
assert.equal(
  (
    await request("/api/cafes", "GET", null, {
      "oai-authenticated-user-id": "forged",
      "oai-authenticated-user-email": "forged@example.test",
    })
  ).status,
  401,
  "Forged identity headers blocked",
);
const list = await request("/api/cafes");
assert.equal(list.status, 200);
const c = list.data.find((c) => c.slug === "mola-coffee-test");
assert.ok(c, "Create the UI test cafe first");
assert.equal(
  (
    await request(`/api/cafes/${c.id}`, "PUT", c, {
      ...headers,
      Origin: "https://evil.invalid",
    })
  ).status,
  403,
  "Cross-origin mutation blocked",
);
assert.equal(
  (await request("/api/cafes", "POST", c)).status,
  409,
  "Duplicate slug rejected",
);
assert.equal(
  (
    await request(`/api/cafes/${c.id}`, "PUT", {
      ...c,
      items: [{ ...c.items[0], price: -1 }],
    })
  ).status,
  400,
  "Negative price rejected",
);
assert.equal(
  (await request("/api/cafes/not-owned", "PUT", c)).status,
  404,
  "Unknown or non-owned record rejected",
);
const published = { ...c, published: true };
assert.equal(
  (await request(`/api/cafes/${c.id}`, "PUT", published)).status,
  200,
);
assert.equal(
  (await fetch(`${origin}/${c.slug}`)).status,
  200,
  "Anonymous public menu resolves",
);
const visitor = crypto.randomUUID();
const before = (await request("/api/stats")).data
  .filter((x) => x.cafe === c.id)
  .reduce((a, x) => a + x.count, 0);
for (let i = 0; i < 2; i++)
  assert.equal(
    (
      await request(
        "/api/visit",
        "POST",
        { cafe: c.id, visitor },
        { "Content-Type": "application/json", Origin: origin },
      )
    ).status,
    204,
  );
const after = (await request("/api/stats")).data
  .filter((x) => x.cafe === c.id)
  .reduce((a, x) => a + x.count, 0);
assert.equal(after - before, 1, "Same-day visitor deduplicated");
const r = await request("/api/rates");
assert.equal(r.status, 200);
assert.ok(r.data.USD > 0 && r.data.EUR > 0);
assert.match(r.data.date, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(
  (
    await request(`/api/cafes/${c.id}`, "PUT", {
      ...published,
      slug: "changed-slug",
    })
  ).status,
  400,
  "QR address immutable",
);
console.log(
  "PASS: authentication, forged headers, origin checks, slug uniqueness, price validation, ownership lookup, publishing, visit deduplication, live rates, stable QR URL.",
);
