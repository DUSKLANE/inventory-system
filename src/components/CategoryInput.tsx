"use client";

import Combobox from "@/components/Combobox";

const CATEGORY_OPTIONS = [
  "电阻", "电容", "电感", "二极管", "三极管", "IC", "连接器", "晶振", "LED", "其他",
];

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CategoryInput({ value, onChange, placeholder = "选择或输入分类" }: CategoryInputProps) {
  return <Combobox value={value} onChange={onChange} options={CATEGORY_OPTIONS} placeholder={placeholder} />;
}
