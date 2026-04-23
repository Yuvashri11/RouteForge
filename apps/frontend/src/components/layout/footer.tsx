import { Link } from "react-router-dom";

const columns = [
  {
    title: "Product",
    items: [
      { label: "Models", to: "/models" },
      { label: "Rankings", to: "/rankings" },
      { label: "Pricing", to: "/pricing" },
      { label: "Chat", to: "/chat" },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Docs", to: "/docs" },
      { label: "API Keys", to: "/keys" },
      { label: "Profile", to: "/profile" },
      { label: "Status", to: "/status" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", to: "/about" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Support", to: "/support" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/70 transition-colors duration-300">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <p className="text-lg font-semibold text-foreground">RouteForge</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Unified interface for model routing and provider optimization.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-foreground">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.items.map((item) => (
                <li key={item.to}>
                  <Link
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
