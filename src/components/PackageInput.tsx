"use client";

import Combobox from "@/components/Combobox";

const PACKAGE_OPTIONS = [
  "0201", "0402", "0603", "0805", "1206", "1210", "2010", "2512",
  "SOT-23", "SOT-23-5", "SOT-23-6", "SOT-223", "SOT-89",
  "SOIC-8", "SOIC-14", "SOIC-16", "SOIC-20", "SOIC-28",
  "TSSOP-8", "TSSOP-14", "TSSOP-16", "TSSOP-20",
  "QFP-32", "QFP-44", "QFP-48", "QFP-64", "QFP-100",
  "QFN-16", "QFN-20", "QFN-24", "QFN-32", "QFN-48",
  "BGA", "DIP-8", "DIP-14", "DIP-16", "DIP-20", "DIP-28",
  "TO-220", "TO-220F", "TO-252", "TO-263", "TO-92",
  "LQFP-32", "LQFP-48", "LQFP-64", "LQFP-100",
  "MSOP-8", "SC-70", "SOD-123", "SOD-323",
];

interface PackageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PackageInput({ value, onChange, placeholder = "如 SOT-23, QFP-48" }: PackageInputProps) {
  return <Combobox value={value} onChange={onChange} options={PACKAGE_OPTIONS} placeholder={placeholder} />;
}
