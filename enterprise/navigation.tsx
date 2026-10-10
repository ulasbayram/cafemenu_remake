"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client-api";
import styles from "./navigation.module.css";

export default function EnterpriseNavigation() {
  const [entries, setEntries] = useState<
    { key: string; title: string; href: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    api<typeof entries>("/api/enterprise/access")
      .then((value) => {
        if (active) setEntries(value);
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
        <Link key={entry.key} href={entry.href}>
          <Crown size={17} />
          <span>{entry.title}</span>
          <ArrowUpRight size={14} />
        </Link>
      ))}
    </div>
  );
}
