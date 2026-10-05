import type { Metadata } from "next";
import LandingPrototype from "./prototype";

export const metadata: Metadata = {
  title: "Fincan · Bir QR, bütün menünüz",
  description:
    "Menünüzü tasarlayın, ürünlerinizi güncelleyin ve masalardan gelen siparişleri tek bir yerden yönetin.",
};

export default function LandingPage() {
  return <LandingPrototype />;
}
