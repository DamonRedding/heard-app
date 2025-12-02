import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Heart, Users, Lock, Scale, Eye } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">About Sanctuary Voice</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Why This Exists</h2>
            <p className="text-muted-foreground leading-relaxed">
              Church members who witness or experience misconduct, manipulation, financial impropriety, 
              or toxic culture often have no safe outlet. Internal reporting risks retaliation, social 
              isolation, or gaslighting. There's no "Glassdoor for churches" — until now.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Sanctuary Voice provides a platform where congregation members can anonymously share 
              experiences from their churches and receive community validation or pushback — creating 
              crowdsourced accountability for pastoral leadership and church culture.
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-5 w-5 text-primary" />
                  Anonymous & Safe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No account required. No identifying information collected. Share your story without fear.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Community Validated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Others who have been through similar experiences can validate or provide perspective on submissions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-5 w-5 text-primary" />
                  Balanced Judgment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our voting system allows both condemnation of wrong behavior and absolution where warranted.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-5 w-5 text-primary" />
                  Pattern Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Admin-only details help us identify patterns of behavior across multiple reports.
                </p>
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Share Your Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe what happened, categorize it, and optionally provide details that help us track patterns.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Community Responds</h3>
                  <p className="text-sm text-muted-foreground">
                    Others can vote to condemn behavior they find wrong or absolve situations they find justified.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Accountability Grows</h3>
                  <p className="text-sm text-muted-foreground">
                    As more experiences are shared, patterns emerge and accountability becomes possible.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-muted/50 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Our Commitment</h3>
                <p className="text-sm text-muted-foreground">
                  We are committed to creating a safe space for healing and accountability. We moderate 
                  content to prevent abuse of the platform, but we do not censor legitimate experiences. 
                  All submissions are reviewed, and those that violate our community guidelines may be removed.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-primary/5 p-6 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Heart className="h-6 w-6 text-condemn flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Need Support?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you're experiencing abuse or are in crisis, please reach out to these resources:
                </p>
                <ul className="text-sm space-y-1">
                  <li><strong>National Abuse Hotline:</strong> 1-800-799-7233</li>
                  <li><strong>RAINN Sexual Assault Hotline:</strong> 1-800-656-4673</li>
                  <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/submit">
            <Button size="lg" className="gap-2" data-testid="button-share-experience-about">
              Share Your Experience
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
