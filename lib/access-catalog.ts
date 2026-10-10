import { enterpriseExtensions } from "@/enterprise/registry";
export const moduleCatalog = {
  erp: {
    key: "erp",
    title: "ERP Modülü",
    description: "Stok, ürün reçeteleri, giderler, ciro ve satış içgörüleri.",
    available: true,
  },
} as const;
export type ModuleKey = keyof typeof moduleCatalog;
export const packageCatalog = Object.values(enterpriseExtensions).map(
  (entry) => ({ key: entry.key, title: entry.title }),
);
export type AccessGrant = {
  id: string;
  key: string;
  userId: string;
  cafeId: string | null;
  status: "active" | "revoked";
  expiresAt: string | null;
  updatedAt: string;
};
export type AccessCatalogResponse = {
  configured: boolean;
  packages: { key: string; title: string }[];
  modules: {
    key: string;
    title: string;
    description: string;
    available: boolean;
  }[];
  enterprise: AccessGrant[];
  modulesAssigned: AccessGrant[];
};
export { grantActive, missingAccessTable } from "./grant-status";
