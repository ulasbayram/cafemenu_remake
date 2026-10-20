import type { Cafe } from "./menu";
export const wifiCookieName = (id: string) => `fincan-wifi-${id}`;
/** Never serialize an order-gated secret into the pre-order page payload. */
export function publicCafeData<T extends { wifi?: Cafe["wifi"] }>(
  data: T,
  ordered: boolean,
): T {
  if (!data.wifi?.password) return { ...data, wifi: undefined };
  return {
    ...data,
    wifi: {
      ...data.wifi,
      password:
        data.wifi.visibility === "everyone" || ordered
          ? data.wifi.password
          : "",
    },
  };
}
