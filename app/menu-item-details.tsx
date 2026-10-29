"use client";
/* eslint-disable @next/next/no-img-element -- Uses the existing public product photo. */
import { useEffect, useRef, useId } from "react";
import { X, Plus } from "lucide-react";
import type { Item } from "@/lib/menu";
import {
  itemName,
  itemDescription,
  type MenuLanguage,
} from "@/lib/menu-language";
import ItemLabels from "./item-labels";

export default function MenuItemDetails({
  item,
  language,
  price,
  onClose,
  onAdd,
}: {
  item: Item;
  language: MenuLanguage;
  price: string;
  onClose: () => void;
  onAdd?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      className="menu-item-details"
      ref={dialog}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="menu-item-details-body">
        <header>
          <h2 id={title}>{itemName(item, language)}</h2>
          <button
            type="button"
            className="menu-detail-close"
            onClick={onClose}
            aria-label={language === "en" ? "Close" : "Kapat"}
          >
            <X size={20} />
          </button>
        </header>
        {item.photo && (
          <img
            className="menu-detail-photo"
            src={item.photo}
            alt={itemName(item, language)}
          />
        )}
        <p>{itemDescription(item, language)}</p>
        <ItemLabels item={item} language={language} />
        <footer>
          <strong>{price}</strong>
          {onAdd && (
            <button type="button" className="menu-order-add" onClick={onAdd}>
              <Plus size={16} />
              {language === "en" ? "Add to order" : "Siparişe ekle"}
            </button>
          )}
        </footer>
      </div>
    </dialog>
  );
}
