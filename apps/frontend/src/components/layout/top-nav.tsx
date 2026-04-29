import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/api/client";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Menu, Moon, Sun, User, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { label: "Models", to: "/models" },
  { label: "Chat", to: "/chat" },
  { label: "Rankings", to: "/rankings" },
  { label: "Pricing", to: "/pricing" },
  { label: "Docs", to: "/docs" },
];

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    retry: false,
    staleTime: 30_000,
  });

  const isLoggedIn = !!profileQuery.data;

  const links = useMemo(
    () =>
      navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      )),
    [],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-500 dark:text-cyan-300">
            <Share2 className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">
            RouteForge
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>

          {isLoggedIn ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Link to="/profile" className="inline-flex items-center gap-1.5">
                  <User className="size-4" />
                  {profileQuery.data?.email}
                </Link>
              </Button>
              <Button
                asChild
                className="bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
              >
                <Link to="/keys">Get API key</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Link to="/signin">Sign in</Link>
              </Button>
              <Button
                asChild
                className="bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
              >
                <Link to="/keys">Get API key</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border p-2 text-muted-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">{links}</nav>
          <div className="mt-3 flex gap-2">
            {isLoggedIn ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="flex-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Link to="/profile" className="inline-flex items-center gap-1.5">
                    <User className="size-4" />
                    {profileQuery.data?.email}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
                >
                  <Link to="/keys">Get API key</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="flex-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Link to="/signin">Sign in</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
                >
                  <Link to="/keys">Get API key</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
