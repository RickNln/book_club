"use client";
import { useState } from "react";

/** ★★★★☆ — оценка для показа; дробная (средняя клуба) округляется до половины в подписи. */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`whitespace-nowrap tracking-[0.08em] text-lamp ${className}`} role="img"
      aria-label={`Оценка ${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} из 5`}>
      {"★".repeat(full)}<span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** Выбор оценки 1–5: радиокнопки под звёздами, работает с клавиатуры. */
export function StarInput({ name = "rating", defaultValue = 0, required }: { name?: string; defaultValue?: number; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "не моё", "так себе", "неплохо", "хорошо", "в сердечко"];
  return (
    <fieldset className="min-w-0">
      <legend className="label mb-1">Оценка{required ? "" : " (необязательно)"}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
              <input type="radio" name={name} value={n} checked={value === n} required={required}
                onChange={() => setValue(n)} className="peer sr-only" />
              <span aria-hidden="true"
                className={`block text-[32px] leading-none transition peer-focus-visible:rounded peer-focus-visible:ring-2 peer-focus-visible:ring-teal/60 ${n <= shown ? "text-lamp" : "text-line"}`}>★</span>
              <span className="sr-only">{n} из 5</span>
            </label>
          ))}
        </div>
        <span className="text-[13px] text-muted" aria-live="polite">{words[shown]}</span>
      </div>
    </fieldset>
  );
}
