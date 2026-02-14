import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { MobileNavigation } from "@/components/mobile-navigation";
import { ShareFAB } from "@/components/share-fab";
import { StoryReadsProvider } from "@/components/story-reads-provider";
import Home from "@/pages/home";
import Submit from "@/pages/submit";
import Churches from "@/pages/churches";
import ChurchProfile from "@/pages/church-profile";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import SearchPage from "@/pages/search";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={Submit} />
      <Route path="/churches" component={Churches} />
      <Route path="/churches/:slug" component={ChurchProfile} />
      <Route path="/search" component={SearchPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sanctuary-voice-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StoryReadsProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <div className="pt-safe flex-1 pb-16 md:pb-0">
                <Header />
                <Router />
              </div>
              <MobileNavigation />
            </div>
            <ShareFAB />
          </StoryReadsProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
