import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { compactNumber, usd } from "@/lib/format";
import { pricingPlans } from "@/lib/mock";
import { Link } from "react-router-dom";

export function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Pricing
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Flexible credits with provider-aware routing and no vendor lock-in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.name}
            className="border-border bg-card/60 py-2"
          >
            <CardHeader>
              <CardTitle className="text-foreground">{plan.name}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {plan.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-semibold text-foreground">
                {usd(plan.price)}
              </p>
              <p className="text-xs uppercase tracking-wide text-cyan-600 dark:text-cyan-200">
                {compactNumber(plan.monthlyCredits)} monthly credits
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                className="w-full bg-cyan-500 text-white hover:bg-cyan-400 dark:text-slate-950"
              >
                <Link to="/auth">Choose {plan.name}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
