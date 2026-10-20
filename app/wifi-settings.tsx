"use client";
import AppSelect from "@/components/app-select";
import type { Cafe } from "@/lib/menu";
export default function WifiSettings({
  value,
  onChange,
  theme = "standard",
}: {
  value: Cafe["wifi"];
  onChange: (wifi: NonNullable<Cafe["wifi"]>) => void;
  theme?: "standard" | "admin";
}) {
  const wifi = value ?? { ssid: "", password: "", visibility: "everyone" };
  return (
    <fieldset className="wifi-settings">
      <legend>Misafir Wi-Fi · isteğe bağlı</legend>
      <label>
        Ağ adı
        <input
          maxLength={64}
          autoComplete="off"
          value={wifi.ssid}
          onChange={(e) => onChange({ ...wifi, ssid: e.target.value })}
        />
      </label>
      <label>
        Wi-Fi şifresi
        <input
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={wifi.password}
          onChange={(e) => onChange({ ...wifi, password: e.target.value })}
        />
        <small className="muted">
          Boş bırakırsanız menüde Wi-Fi bölümü gösterilmez.
        </small>
      </label>
      <label>
        Kimler görebilsin?
        <AppSelect
          theme={theme}
          value={wifi.visibility}
          onValueChange={(v) =>
            onChange({ ...wifi, visibility: v as "everyone" | "after-order" })
          }
        >
          <option value="everyone">Menüye giren herkes</option>
          <option value="after-order">Sipariş verdikten sonra</option>
        </AppSelect>
      </label>
      {wifi.visibility === "after-order" && (
        <p className="muted small-text">
          Sipariş özelliği ve masa erişimi açık olmalı. Şifre, bu tarayıcıdan
          sipariş veren misafire 12 saat boyunca gösterilir.
        </p>
      )}
    </fieldset>
  );
}
