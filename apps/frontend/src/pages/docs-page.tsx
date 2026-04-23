import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { docsSections } from "@/lib/mock";

export function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Developer Docs
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Fast onboarding path with OpenAI-compatible APIs and typed Elysia
        integrations.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {docsSections.map((section) => (
          <Card
            key={section.title}
            className="border-border bg-card/60 py-2"
          >
            <CardHeader>
              <CardTitle className="text-foreground">{section.title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                Implementation checklist for this topic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point}>- {point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
