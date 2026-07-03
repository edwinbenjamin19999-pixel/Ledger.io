import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PreviewRouteFallbackProps { title: string;
  description: string;
}

export const PreviewRouteFallback = ({ title, description }: PreviewRouteFallbackProps) => { return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">Till startsidan</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://north-ledger-ai.lovable.app" target="_blank" rel="noreferrer">
              Öppna publicerad app
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};