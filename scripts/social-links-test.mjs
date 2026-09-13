import assert from "node:assert/strict";
import { normalizeSocialLink, socialLinksSchema } from "../lib/social-links.ts";
assert.equal(
  normalizeSocialLink("@mola.coffee", "instagram"),
  "https://instagram.com/mola.coffee",
);
assert.equal(
  normalizeSocialLink("@mola", "youtube"),
  "https://youtube.com/@mola",
);
assert.equal(normalizeSocialLink("mola", "x"), "https://x.com/mola");
assert.equal(
  normalizeSocialLink("example.com", "website"),
  "https://example.com/",
);
assert.equal(normalizeSocialLink("   ", "instagram"), "");
assert.ok(socialLinksSchema.safeParse({}).success);
for (const address of [
  "javascript:alert(1)",
  "data:text/html,hi",
  "https://user:pass@example.com",
])
  assert.throws(() => normalizeSocialLink(address, "website"));
assert.throws(() =>
  normalizeSocialLink("https://instagram.com.evil.test/account", "instagram"),
);
assert.ok(
  !socialLinksSchema.safeParse({ website: "javascript:alert(1)" }).success,
);
console.log(
  "PASS: optional fields, handle/URL normalization, protocol and platform validation",
);
assert.equal(
  normalizeSocialLink("g.page/r/example/review", "googleReviews"),
  "https://g.page/r/example/review",
);
assert.ok(socialLinksSchema.safeParse({ googleReviews: "" }).success);
assert.ok(
  socialLinksSchema.safeParse({
    googleReviews: "https://maps.app.goo.gl/example",
  }).success,
);
assert.ok(
  !socialLinksSchema.safeParse({
    googleReviews: "https://google.com.evil.test/review",
  }).success,
);
assert.ok(
  !socialLinksSchema.safeParse({ googleReviews: "javascript:alert(1)" })
    .success,
);
console.log(
  "PASS: optional Google review links and invalid destination rejection",
);
assert.equal(
  normalizeSocialLink("0532 123 45 67", "whatsapp"),
  "https://wa.me/905321234567",
);
assert.equal(
  normalizeSocialLink("+90 (532) 123-45-67", "whatsapp"),
  "https://wa.me/905321234567",
);
assert.equal(
  normalizeSocialLink("https://wa.me/905321234567", "whatsapp"),
  "https://wa.me/905321234567",
);
assert.equal(
  normalizeSocialLink("+44 7700 900123", "whatsapp"),
  "https://wa.me/447700900123",
);
assert.ok(socialLinksSchema.safeParse({ whatsapp: "" }).success);
assert.ok(!socialLinksSchema.safeParse({ whatsapp: "123" }).success);
assert.ok(
  !socialLinksSchema.safeParse({ whatsapp: "javascript:alert(1)" }).success,
);
console.log(
  "PASS: WhatsApp local/international numbers, saved URL, empty and invalid input",
);
