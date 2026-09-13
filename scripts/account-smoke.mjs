import assert from "node:assert/strict";
const origin = "http://localhost:5173";
async function req(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {}
  return {
    response,
    status: response.status,
    data,
    text,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function account(email, name) {
  const body = { email, name, password: "Fincan-QA-Only-2026!" };
  let r = await req("/api/auth/register", { method: "POST", body });
  if (r.status === 409)
    r = await req("/api/auth/login", { method: "POST", body });
  assert.ok([200, 201].includes(r.status), JSON.stringify(r.data));
  assert.ok(r.response.headers.get("set-cookie").includes("HttpOnly"));
  assert.ok(r.response.headers.get("set-cookie").includes("SameSite=Lax"));
  return r;
}
assert.equal((await req("/api/cafes")).status, 401);
assert.equal(
  (
    await req("/api/cafes", {
      headers: {
        "oai-authenticated-user-id": "forged",
        "oai-authenticated-user-email": "forged@test.invalid",
      },
    })
  ).status,
  401,
);
const a = await account("qa-preview@fincan.invalid", "Fincan QA"),
  b = await account("qa-second@fincan.invalid", "İkinci hesap");
assert.notEqual(a.cookie, b.cookie);
const slug = "qa-menu-" + Date.now();
const cafe = {
  name: "Mola Coffee",
  slug,
  subtitle: "Güzel bir mola.",
  location: "Kadıköy, İstanbul",
  accent: "#245b46",
  style: "classic",
  published: true,
  showBranding: false,
  items: [
    {
      id: "qa-espresso",
      name: "Espresso",
      description: "Taze çekilmiş kahve.",
      price: 105.5,
      category: "Kahveler",
      available: true,
    },
    {
      id: "qa-latte",
      name: "Latte",
      description: "Espresso ve süt.",
      price: 145,
      category: "Kahveler",
      available: true,
    },
    {
      id: "qa-brownie",
      name: "Brownie",
      description: "Yoğun çikolata.",
      price: 175,
      category: "Tatlılar",
      available: true,
    },
  ],
};
const created = await req("/api/cafes", {
  method: "POST",
  body: cafe,
  cookie: a.cookie,
});
assert.equal(created.status, 201, JSON.stringify(created.data));
assert.equal(
  created.data.showBranding,
  undefined,
  "Client cannot disable watermark",
);
const id = created.data.id;
const aList = (await req("/api/cafes", { cookie: a.cookie })).data,
  bList = (await req("/api/cafes", { cookie: b.cookie })).data;
assert.ok(aList.some((c) => c.id === id));
assert.ok(!bList.some((c) => c.id === id));
assert.equal(
  (
    await req(`/api/cafes/${id}`, {
      method: "PUT",
      body: cafe,
      cookie: b.cookie,
    })
  ).status,
  404,
  "Other account cannot write",
);
assert.equal(
  (await req(`/editor/${id}`, { cookie: b.cookie })).status,
  404,
  "Other account cannot open editor",
);
assert.equal(
  (
    await req(`/api/cafes/${id}`, {
      method: "PUT",
      body: cafe,
      cookie: a.cookie,
      headers: { Origin: "https://evil.invalid" },
    })
  ).status,
  403,
);
assert.equal(
  (
    await req(`/api/cafes/${id}`, {
      method: "PUT",
      body: { ...cafe, items: [{ ...cafe.items[0], price: -1 }] },
      cookie: a.cookie,
    })
  ).status,
  400,
);
const logo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5N8AAAAASUVORK5CYII=";
const branded = await req(`/api/cafes/${id}`, {
  method: "PUT",
  cookie: a.cookie,
  body: {
    ...cafe,
    logo,
    logoPalette: {
      accent: "#56382a",
      background: "#faf7f4",
      textColor: "#18110c",
    },
  },
});
assert.equal(branded.status, 200);
assert.equal(branded.data.logo, logo);
for (const invalidLogo of [
  "https://example.com/logo.svg",
  "data:image/svg+xml;base64,PHN2Zz4=",
  "data:image/png;base64," + "A".repeat(120001),
]) {
  assert.equal(
    (
      await req(`/api/cafes/${id}`, {
        method: "PUT",
        cookie: a.cookie,
        body: { ...cafe, logo: invalidLogo },
      })
    ).status,
    400,
  );
}
const page = await req("/" + slug);
assert.ok(page.text.includes(logo), "Saved logo renders on public menu");
assert.equal(page.status, 200);
assert.ok(
  page.text.includes("fincan ile hazırlandı"),
  "Watermark always rendered",
);
const wrong = await req("/api/auth/login", {
  method: "POST",
  body: {
    email: "qa-preview@fincan.invalid",
    password: "Not-The-Password-2026!",
  },
});
assert.equal(wrong.status, 401);
assert.equal(
  (
    await req("/api/auth/logout", {
      method: "POST",
      body: {},
      cookie: b.cookie,
    })
  ).status,
  200,
);
assert.equal(
  (await req("/api/cafes", { cookie: b.cookie })).status,
  401,
  "Logout revokes server session",
);
console.log(
  "PASS: email registration/login, cookies, invalid password, account isolation, editor authorization, origin check, price validation, permanent watermark, logout revocation.",
);
console.log(
  "Preview account: qa-preview@fincan.invalid (local test only); created cafe: " +
    id,
);
