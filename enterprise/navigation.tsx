"use client";
import { useEffect, useState } from "react";
import NavLink from "@/components/nav-link";
import { Crown, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client-api";
import styles from "./navigation.module.css";

export default function EnterpriseNavigation() {
  const [entries, setEntries] = useState<
    { key: string; title: string; href: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    api<{ packages: { key: string; title: string; href: string }[] }>(
      "/api/access",
    )
      .then((value) => {
        if (active) setEntries(value.packages);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!entries.length) return null;
  return (
    <div className={styles.links}>
      <span>ÖZEL ÇALIŞMA ALANI</span>
      {entries.map((entry) => (
        <NavLink key={entry.key} href={entry.href}>
          <Crown size={17} />
          <span>{entry.title}</span>
          <ArrowUpRight size={14} />
        </NavLink>
      ))}
    </div>
  );
}
