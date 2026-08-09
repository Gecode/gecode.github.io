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
    { label: "download", href: "/download.html" },
  ],
  [
    { label: "documentation", href: "/documentation.html" },
    { label: "community", href: "/community.html" },
    { label: "news", href: "/news.html" },
  ],
  [
    { label: "publications", href: "/publications.html" },
    { label: "interfaces", href: "/interfaces.html" },
    { label: "projects", href: "/projects.html" },
  ],
] as const;
