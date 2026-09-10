import { NavLink } from "react-router-dom";
import { Sprout, Plus, History, Settings2 } from "lucide-react";
import "./TabBar.css";

const TABS = [
  { to: "/", label: "Plants", Icon: Sprout, end: true },
  { to: "/add", label: "Add", Icon: Plus, end: false },
  { to: "/history", label: "History", Icon: History, end: false },
  { to: "/settings", label: "Settings", Icon: Settings2, end: false },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar__bar">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `tab ${isActive ? "tab--active" : ""}`
            }
          >
            <span className="tab__icon">
              <Icon size={20} aria-hidden />
            </span>
            <span className="tab__label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
