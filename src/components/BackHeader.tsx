import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./BackHeader.css";

export function BackHeader({ title, to }: { title: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <header className="backheader">
      <button
        type="button"
        className="backheader__back"
        aria-label="Go back"
        onClick={() => (to ? navigate(to) : navigate(-1))}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>
      <h1 className="backheader__title">{title}</h1>
    </header>
  );
}
