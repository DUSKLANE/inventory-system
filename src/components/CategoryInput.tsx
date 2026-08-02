"use client";

import { useEffect, useState } from "react";
import Combobox from "@/components/Combobox";

const FALLBACK_OPTIONS = [
  "电阻", "电容", "电感", "二极管", "三极管", "IC", "连接器", "晶振", "LED", "其他",
];

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export default function CategoryInput({ value, onChange, placeholder = "选择或输入分类", inputClassName }: CategoryInputProps) {
  const [options, setOptions] = useState<string[]>(FALLBACK_OPTIONS);

  useEffect(() => {
    fetch("/api/parts/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setOptions(data as string[]);
        }
      })
      .catch(() => {});
  }, []);

  return <Combobox value={value} onChange={onChange} options={options} placeholder={placeholder} inputClassName={inputClassName} />;
}
