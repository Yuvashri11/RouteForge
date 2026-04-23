import { Footer } from "@/components/layout/footer";
import { TopNav } from "@/components/layout/top-nav";
import { useTheme } from "@/lib/theme";
import { Outlet, useLocation } from "react-router-dom";

export function AppShell() {
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const hideFooter = pathname === "/chat";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {theme === "dark" && (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(20,184,166,0.16),transparent_30%),linear-gradient(to_bottom,rgba(15,23,42,1),rgba(2,6,23,1))]" />
      )}
      {theme === "light" && (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.06),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(20,184,166,0.06),transparent_30%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(241,245,249,1))]" />
      )}
      <TopNav />
      <main>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
