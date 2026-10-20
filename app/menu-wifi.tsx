"use client";
import { useState } from "react";
import { Wifi, Eye, EyeOff, Copy, Check } from "lucide-react";
import type { Cafe } from "@/lib/menu";
export default function MenuWifi({
  wifi,
  english,
}: {
  wifi: Cafe["wifi"];
  english: boolean;
}) {
  const [visible, setVisible] = useState(false),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  if (!wifi || (!wifi.password && wifi.visibility !== "after-order"))
    return null;
  return (
    <aside className="menu-wifi">
      <div>
        <Wifi size={21} />
        <strong>
          {wifi.ssid || (english ? "Guest Wi-Fi" : "Misafir Wi-Fi")}
        </strong>
      </div>
      {wifi.password ? (
        <>
          <div className="menu-wifi-password">
            <code>{visible ? wifi.password : "••••••••"}</code>
            <button
              type="button"
              aria-label={
                english
                  ? visible
                    ? "Hide password"
                    : "Show password"
                  : visible
                    ? "Şifreyi gizle"
                    : "Şifreyi göster"
              }
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <button
              type="button"
              aria-label={
                english ? "Copy Wi-Fi password" : "Wi-Fi şifresini kopyala"
              }
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(wifi.password);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                  setVisible(true);
                }
              }}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          {copyError && (
            <small>
              {english
                ? "Select and copy the password above."
                : "Yukarıdaki şifreyi seçip kopyalayabilirsiniz."}
            </small>
          )}
        </>
      ) : (
        <p>
          {english
            ? "Your Wi-Fi password will appear here after you place an order."
            : "Sipariş verdikten sonra Wi-Fi şifresi burada açılır."}
        </p>
      )}
    </aside>
  );
}
