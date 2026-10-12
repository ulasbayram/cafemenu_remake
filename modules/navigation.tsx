"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageOpen, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client-api";
import styles from "@/enterprise/navigation.module.css";
export default function ModuleNavigation() {
  const [erp, setErp] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ modules: { erp: boolean } }>("/api/access")
      .then((v) => {
        if (active) setErp(v.modules.erp);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!erp) return null;
  return (
    <div className={styles.links}>
      <span>MODÜLLER</span>
      <Link href="/modules/erp">
        <PackageOpen size={17} />
        <span>Stok · ERP</span>
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
