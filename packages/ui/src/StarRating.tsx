"use client";

import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readonly?: boolean;
}

export function StarRating({
  value,
  onChange,
  max = 10,
  size = 20,
  readonly = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const displayValue = hovered || value;

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayValue;
        const halfFilled =
          !filled && starValue - 0.5 <= displayValue && Number.isInteger(value) === false;

        return (
          <button
            key={starValue}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHovered(starValue)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className="group relative flex flex-col items-center"
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            role="radio"
            aria-checked={starValue === value}
          >
            <span
              className={`pointer-events-none mb-0.5 text-[11px] font-bold leading-none transition-opacity duration-100 text-rating ${
                hovered === starValue ? "opacity-100" : "opacity-0"
              }`}
            >
              {starValue}
            </span>
            <Star
              size={size}
              className={`transition-all duration-150 ${
                filled
                  ? "fill-rating text-rating"
                  : halfFilled
                    ? "fill-rating/50 text-rating"
                    : "fill-none text-rating-empty"
              }`}
            />
          </button>
        );
      })}
      <span className="ml-2 min-w-[2ch] text-sm tabular-nums text-muted">
        {value > 0 ? value : "—"}
      </span>
    </div>
  );
}
