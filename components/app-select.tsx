"use client";
import {
  Children,
  isValidElement,
  Fragment,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Select } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./app-select.module.css";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};
type OptionProps = {
  value?: string | number;
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
};
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? text(child.props.children)
          : "",
    )
    .join("");
}
function optionsFromChildren(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionProps>(child)) return [];
    if (child.type === Fragment)
      return optionsFromChildren(child.props.children);
    if (child.type !== "option") return [];
    const label =
      child.props.label ??
      text(child.props.children).replace(/\s+/g, " ").trim();
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: child.props.disabled,
      },
    ];
  });
}
const empty = "__fincan_empty_option__";
export default function AppSelect({
  value,
  onValueChange,
  options,
  children,
  theme = "standard",
  label,
  placeholder,
  disabled,
  className = "",
  style,
  name,
  required,
  id,
}: {
  value: string | number;
  onValueChange: (value: string) => void;
  options?: SelectOption[];
  children?: ReactNode;
  theme?: "standard" | "admin" | "customer" | "enterprise";
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  name?: string;
  required?: boolean;
  id?: string;
}) {
  const entries = options ?? optionsFromChildren(children);
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const [palette, setPalette] = useState<CSSProperties>({});
  const [open, setOpen] = useState(false);
  function changeOpen(next: boolean) {
    if (next && trigger.current) {
      const computed = getComputedStyle(trigger.current);
      const values: Record<string, string> = {};
      for (const variable of [
        "--as-surface",
        "--as-text",
        "--as-border",
        "--as-accent",
        "--as-muted",
        "--as-highlight",
      ])
        values[variable] = computed.getPropertyValue(variable).trim();
      setPalette(values as CSSProperties);
      setContainer(trigger.current.closest("dialog") ?? undefined);
    }
    setOpen(next);
  }
  return (
    <Select.Root
      value={String(value)}
      onValueChange={(next) => onValueChange(next === empty ? "" : next)}
      disabled={disabled || !entries.length}
      open={open}
      onOpenChange={changeOpen}
      name={name}
      required={required}
    >
      <Select.Trigger
        ref={trigger}
        id={id}
        type="button"
        data-app-select
        data-skin={theme}
        aria-label={label}
        className={`${styles.trigger} ${styles.control} ${className}`}
        style={style}
      >
        <Select.Value
          placeholder={
            placeholder ??
            entries.find((entry) => entry.value === "")?.label ??
            "Seçin"
          }
        />
        <Select.Icon className={styles.caret}>
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}>
        <Select.Content
          className={styles.content}
          style={palette}
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className={styles.scroll}>
            <ChevronUp size={15} />
          </Select.ScrollUpButton>
          <Select.Viewport className={styles.viewport}>
            {entries.map((entry) => (
              <Select.Item
                key={entry.value || empty}
                value={entry.value || empty}
                disabled={entry.disabled}
                textValue={entry.label}
                className={styles.option}
              >
                <Select.ItemText>
                  <span className={styles.optionLabel}>{entry.label}</span>
                  {entry.description && (
                    <span className={styles.description}>
                      {entry.description}
                    </span>
                  )}
                </Select.ItemText>
                <Select.ItemIndicator className={styles.check}>
                  <Check size={15} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className={styles.scroll}>
            <ChevronDown size={15} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
