import type { ReactNode } from "react";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="screen">
      <div className="screen__content">{children}</div>
    </div>
  );
}
