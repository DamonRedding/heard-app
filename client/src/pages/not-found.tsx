import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button className="gap-2" data-testid="button-return-home">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
