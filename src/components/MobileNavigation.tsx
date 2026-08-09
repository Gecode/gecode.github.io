import { useState } from "react";

type Item = { label: string; href: string };

export default function MobileNavigation({
  groups,
  currentPath,
}: {
  groups: readonly (readonly Item[])[];
  currentPath: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-navigation">
      <button
        type="button"
        className="mobile-navigation-trigger"
        aria-expanded={open}
        aria-controls="mobile-navigation-links"
        onClick={() => setOpen((value) => !value)}
      >
        <span>Explore Gecode</span>
        <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
      </button>
      <nav id="mobile-navigation-links" aria-label="Primary" hidden={!open}>
        {groups.map((group, groupIndex) => (
          <ul className="mobile-navigation-group" key={groupIndex}>
            {group.map((item) => {
              const active =
                (item.href === "/" && currentPath === "/") || currentPath === item.href;
              return (
                <li key={item.href}>
                  <a href={item.href} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
    </div>
  );
}
