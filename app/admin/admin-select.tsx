"use client";
import AppSelect, { type SelectOption } from "@/components/app-select";
export default function AdminSelect({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <AppSelect
      {...rest}
      value={value}
      onValueChange={onChange}
      theme="admin"
      style={{ width: "100%" }}
    />
  );
}
