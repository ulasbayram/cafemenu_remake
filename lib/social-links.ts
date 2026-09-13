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
] as const;
export type SocialKey = (typeof socialFields)[number]["key"];
const domains = {
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
};
export function normalizeSocialLink(value: string, key: SocialKey): string {
  const input = value.trim();
  if (!input) return "";
  let address = input;
  if (
    key !== "website" &&
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
      `${socialFields.find((f) => f.key === key)?.label} hesabınızın bağlantısını girin.`,
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
});
