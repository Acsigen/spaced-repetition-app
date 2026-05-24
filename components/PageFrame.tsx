import type { ComponentChildren } from "preact";

type ActivePage = "study" | "words" | "stats" | "settings";

const navItems: Array<{ href: string; key: ActivePage; label: string }> = [
  { href: "/", key: "study", label: "Repetiții" },
  { href: "/words", key: "words", label: "Cuvinte" },
  { href: "/stats", key: "stats", label: "Statistici" },
  { href: "/settings", key: "settings", label: "Setări" },
];

interface PageFrameProps {
  active: ActivePage;
  children: ComponentChildren;
  title: string;
}

export function PageFrame({ active, children, title }: PageFrameProps) {
  return (
    <div class="app-frame">
      <header class="topbar">
        <a class="brand" href="/" aria-label="Pagina principală">
          <span class="brand-mark" aria-hidden="true">ES</span>
          <span>
            <strong>Vocabular spaniol</strong>
            <small>Română</small>
          </span>
        </a>
        <nav class="desktop-nav" aria-label="Navigație principală">
          {navItems.map((item) => (
            <a
              class={item.key === active ? "active" : ""}
              href={item.href}
              aria-current={item.key === active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main class="page">
        <h1>{title}</h1>
        {children}
      </main>
      <nav class="bottom-nav" aria-label="Navigație principală">
        {navItems.map((item) => (
          <a
            class={item.key === active ? "active" : ""}
            href={item.href}
            aria-current={item.key === active ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
