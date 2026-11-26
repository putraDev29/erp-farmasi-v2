"use client";

import React, { useState, useEffect } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showPrefix?: boolean;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
}

/**
 * Formats a number in Indonesian Rupiah style (e.g. "Rp 50.000" or "Rp 8.548,99").
 */
export const formatRupiahInput = (num: number, showPrefix = true): string => {
  const safe = Number.isFinite(num) ? num : 0;
  const hasDecimal = Math.abs(safe % 1) > 0.0001;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safe);
  return showPrefix ? `Rp ${formatted}` : formatted;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "Rp 0",
  showPrefix = true,
  onClick,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    if (!isFocused) {
      setRawText(formatRupiahInput(value, showPrefix));
    }
  }, [value, isFocused, showPrefix]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const safe = Number.isFinite(value) ? value : 0;
    setRawText(safe === 0 ? "" : String(safe));
    setTimeout(() => e.target.select(), 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow digits, dot, comma, minus while typing
    const cleaned = input.replace(/[^0-9.,-]/g, "");
    setRawText(cleaned);

    // Parse Indonesian or standard decimal format:
    // If user typed comma as decimal (e.g. "8548,99"), convert comma to dot
    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      onChange(Math.max(0, parsed));
    } else if (cleaned === "") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setRawText(formatRupiahInput(value, showPrefix));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={isFocused ? rawText : formatRupiahInput(value, showPrefix)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      placeholder={placeholder}
      className={className}
    />
  );
};
