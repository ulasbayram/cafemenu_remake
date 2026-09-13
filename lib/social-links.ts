import { z } from "zod";
export const socialFields = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@kafeniz veya instagram.com/kafeniz",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "@kafeniz veya youtube.com/@kafeniz",
  },
  { key: "x", label: "X", placeholder: "@kafeniz veya x.com/kafeniz" },
  { key: "website", label: "Web sitesi", placeholder: "www.kafeniz.com" },
  {
    key: "whatsapp",
    label: "WhatsApp sipariş hattı",
    placeholder: "+90 5XX XXX XX XX",
  },
  {
    key: "googleReviews",
    label: "Google yorumlar",
    placeholder: "https://g.page/r/…/review",
  },
] as const;
export type SocialKey = (typeof socialFields)[number]["key"];
const domains = {
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  googleReviews: [
    "google.com",
    "google.com.tr",
    "g.page",
    "maps.app.goo.gl",
    "goo.gl",
    "share.google",
  ],
};
export function normalizeSocialLink(value: string, key: SocialKey): string {
  const input = value.trim();
  if (!input) return "";
  if (key === "whatsapp") {
    let phone = input;
    if (/^(?:https?:\/\/)?wa\.me\//i.test(phone)) {
      const url = new URL(
        /^https?:\/\//i.test(phone) ? phone : `https://${phone}`,
      );
      if (url.hostname !== "wa.me" || url.username || url.password)
        throw new Error("Geçerli bir WhatsApp numarası girin.");
      phone = "+" + url.pathname.slice(1);
    }
    if (!/^\+?[\d\s().-]+$/.test(phone))
      throw new Error(
        "WhatsApp numarasını ülke koduyla girin. Örnek: +90 5XX XXX XX XX.",
      );
    const international = phone.startsWith("+") || phone.startsWith("00");
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (!international && /^05\d{9}$/.test(digits))
      digits = "90" + digits.slice(1);
    else if (!international && /^5\d{9}$/.test(digits)) digits = "90" + digits;
    if (!/^[1-9]\d{7,14}$/.test(digits))
      throw new Error("WhatsApp numarasını ülke koduyla eksiksiz girin.");
    return `https://wa.me/${digits}`;
  }
  let address = input;
  if (
    key !== "website" &&
    key !== "googleReviews" &&
    /^@?[\w.-]+$/.test(input) &&
    (!input.includes(".") || input.startsWith("@"))
  ) {
    const handle = input.replace(/^@/, "");
    address = `https://${domains[key][0]}/${key === "youtube" ? "@" : ""}${handle}`;
  }
  if (!/^[a-z][a-z\d+.-]*:/i.test(address)) address = "https://" + address;
  const url = new URL(address);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname.includes(".")
  )
    throw new Error("Geçerli bir web bağlantısı girin.");
  if (
    key !== "website" &&
    !domains[key].some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith("." + domain),
    )
  )
    throw new Error(
      `${socialFields.find((f) => f.key === key)?.label} bağlantısını girin.`,
    );
  return url.href;
}
const link = (key: SocialKey) =>
  z
    .string()
    .trim()
    .max(500)
    .transform((value, ctx) => {
      try {
        return normalizeSocialLink(value, key);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message:
            error instanceof Error ? error.message : "Bağlantı geçersiz.",
        });
        return z.NEVER;
      }
    })
    .optional();
export const socialLinksSchema = z.object({
  instagram: link("instagram"),
  youtube: link("youtube"),
  x: link("x"),
  website: link("website"),
  googleReviews: link("googleReviews"),
  whatsapp: link("whatsapp"),
});
