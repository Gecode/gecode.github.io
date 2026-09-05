export const site = {
  name: "Gecode",
  title: "Gecode — Generic Constraint Development Environment",
  description:
    "Gecode is an open source C++ toolkit for developing constraint-based systems and applications.",
  url: "https://www.gecode.dev",
  email: "info@gecode.dev",
} as const;

export const versions = {
  release: "6.4.0",
  releaseDate: "2026-07-15",
  releaseDateLong: "15 July 2026",
  documentation: "6.4.0",
} as const;

export const navigation = [
  [
    { label: "home", href: "/" },
    { label: "download", href: "/download/" },
  ],
  [
    { label: "documentation", href: "/documentation/" },
    { label: "community", href: "/community/" },
    { label: "news", href: "/news/" },
  ],
  [
    { label: "publications", href: "/publications/" },
    { label: "interfaces", href: "/interfaces/" },
    { label: "projects", href: "/projects/" },
  ],
] as const;

export const activePageSlugs = [
  "community",
  "disclaimer",
  "documentation",
  "download",
  "flatzinc",
  "interfaces",
  "license",
  "logo",
  "news",
  "projects",
  "publications",
] as const;

export function canonicalSitePath(pathname: string): string {
  if (pathname === "/index.html" || pathname === "/index") return "/";
  if (pathname.endsWith(".html")) return `${pathname.slice(0, -".html".length)}/`;
  return pathname === "/" || pathname.endsWith("/") ? pathname : `${pathname}/`;
}
