import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-200">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you requested does not exist in RouteForge.
      </p>
      <Button
        asChild
        className="mt-6 bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
      >
        <Link to="/">Back Home</Link>
      </Button>
    </div>
  );
}
