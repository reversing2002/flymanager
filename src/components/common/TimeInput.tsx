import React, { useState, useEffect } from 'react';
import { parseTime, formatTime } from '../../lib/utils/timeFormat';

interface TimeInputProps {
  value: number;
  onChange: (value: number) => void;
  format: "DECIMAL" | "CLASSIC";
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  format,
  label,
  required = false,
  disabled = false,
  className = "",
  placeholder = "",
  step = 0.01,
  min,
  max,
}) => {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Met à jour l'affichage quand la valeur ou le format change
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatTime(value, format));
    }
  }, [value, format, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Si l'input est vide, on ne fait rien
    if (!inputValue) return;

    // Parse la valeur selon le format
    const numericValue = parseTime(inputValue);
    
    // Vérifie les limites min/max
    if (min !== undefined && numericValue < min) return;
    if (max !== undefined && numericValue > max) return;
    
    onChange(numericValue);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Reformate la valeur selon le format choisi
    setDisplayValue(formatTime(value, format));
  };

  const handleFocus = () => {
    setIsEditing(true);
    // En mode édition, on affiche la valeur brute
    setDisplayValue(format === "DECIMAL" ? value.toString() : displayValue);
  };

  return (
    <div className="flex flex-col">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={`rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500 ${
          disabled ? "bg-slate-50 text-slate-500" : ""
        } ${className}`}
      />
      {format === "CLASSIC" && !disabled && (
        <p className="mt-1 text-xs text-slate-500">
          Format: 1h30 ou 1:30
        </p>
      )}
      {format === "DECIMAL" && !disabled && (
        <p className="mt-1 text-xs text-slate-500">
          Format: 1.5
        </p>
      )}
    </div>
  );
};

export default TimeInput;
