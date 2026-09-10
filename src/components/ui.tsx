import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

export function PrimaryButton({
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn btn--primary" {...rest}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn btn--secondary" {...rest}>
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? "toggle--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  );
}

export function Avatar({
  src,
  alt,
  size = 56,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <img
      className="avatar"
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}

export function Chip({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: "sage" | "water" | "warn";
}) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}
