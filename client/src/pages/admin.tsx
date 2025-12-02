import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  Eye,
  Loader2,
  MapPin,
  Church,
  User,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, TIMEFRAMES, type Submission, type Status } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AdminSubmission extends Submission {
  churchName: string | null;
  pastorName: string | null;
  location: string | null;
}

interface AdminSubmissionsResponse {
  submissions: AdminSubmission[];
  total: number;
}

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function getTimeframeLabel(value: string): string {
  return TIMEFRAMES.find((t) => t.value === value)?.label || value;
}

function getStatusBadge(status: Status) {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="bg-absolve/10 text-absolve border-absolve/30">Active</Badge>;
    case "under_review":
      return <Badge variant="outline" className="bg-gold/10 text-gold-foreground border-gold/30">Under Review</Badge>;
    case "removed":
      return <Badge variant="outline" className="bg-condemn/10 text-condemn border-condemn/30">Removed</Badge>;
  }
}

function AdminSubmissionCard({
  submission,
  onUpdateStatus,
  isUpdating,
}: {
  submission: AdminSubmission;
  onUpdateStatus: (id: string, status: Status) => void;
  isUpdating: boolean;
}) {
  return (
    <Card className={cn(
      "transition-shadow",
      submission.status === "under_review" && "border-gold/50",
      submission.flagCount >= 3 && "border-flag/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getCategoryLabel(submission.category)}</Badge>
            {getStatusBadge(submission.status)}
            {submission.flagCount > 0 && (
              <Badge variant="outline" className="bg-flag/10 text-flag border-flag/30 gap-1">
                <Flag className="h-3 w-3" />
                {submission.flagCount} flags
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {getTimeframeLabel(submission.timeframe)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {(submission.churchName || submission.pastorName || submission.location) && (
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Admin-Only Information</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              {submission.churchName && (
                <div className="flex items-center gap-2">
                  <Church className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.churchName}</span>
                </div>
              )}
              {submission.pastorName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.pastorName}</span>
                </div>
              )}
              {submission.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="font-serif text-base leading-relaxed whitespace-pre-wrap">
          {submission.content}
        </p>

        {submission.denomination && (
          <p className="text-sm text-muted-foreground">
            Denomination: <span className="font-medium">{submission.denomination}</span>
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Condemn: {submission.condemnCount}</span>
          <span>Absolve: {submission.absolveCount}</span>
          <span>Created: {new Date(submission.createdAt).toLocaleDateString()}</span>
        </div>

        <Separator />

        <div className="flex items-center gap-2 flex-wrap">
          {submission.status !== "active" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-absolve hover:bg-absolve/10"
              onClick={() => onUpdateStatus(submission.id, "active")}
              disabled={isUpdating}
              data-testid={`button-approve-${submission.id}`}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          )}
          {submission.status !== "removed" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-condemn hover:bg-condemn/10"
              onClick={() => onUpdateStatus(submission.id, "removed")}
              disabled={isUpdating}
              data-testid={`button-remove-${submission.id}`}
            >
              <XCircle className="h-4 w-4" />
              Remove
            </Button>
          )}
          {submission.status !== "under_review" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-gold-foreground hover:bg-gold/10"
              onClick={() => onUpdateStatus(submission.id, "under_review")}
              disabled={isUpdating}
              data-testid={`button-review-${submission.id}`}
            >
              <Eye className="h-4 w-4" />
              Mark for Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "flagged" | "review">("all");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<AdminSubmissionsResponse>({
    queryKey: ["/api/admin/submissions"],
    enabled: isAuthenticated,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const response = await apiRequest("PATCH", `/api/admin/submissions/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/submissions")
      });
      toast({
        title: "Status updated",
        description: "The submission status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Unable to update the submission status.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setAuthError("Invalid password");
      }
    } catch {
      setAuthError("Invalid password");
    }
  };

  const handleUpdateStatus = (id: string, status: Status) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access
            </CardTitle>
            <CardDescription>
              Enter the admin password to access the moderation dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-admin-password"
              />
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button type="submit" className="w-full" data-testid="button-admin-login">
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allSubmissions = data?.submissions || [];
  const flaggedSubmissions = allSubmissions.filter((s) => s.flagCount >= 3);
  const reviewSubmissions = allSubmissions.filter((s) => s.status === "under_review");

  const displaySubmissions = 
    activeTab === "flagged" ? flaggedSubmissions :
    activeTab === "review" ? reviewSubmissions :
    allSubmissions;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage submissions and moderation
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{allSubmissions.length}</div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card className={flaggedSubmissions.length > 0 ? "border-flag/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-flag" />
                <div className="text-2xl font-bold">{flaggedSubmissions.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">Flagged (3+ reports)</p>
            </CardContent>
          </Card>
          <Card className={reviewSubmissions.length > 0 ? "border-gold/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gold" />
                <div className="text-2xl font-bold">{reviewSubmissions.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">Under Review</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({allSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="flagged" data-testid="tab-flagged">
              Flagged ({flaggedSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">
              Under Review ({reviewSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displaySubmissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No submissions in this category.</p>
              </div>
            ) : (
              displaySubmissions.map((submission) => (
                <AdminSubmissionCard
                  key={submission.id}
                  submission={submission}
                  onUpdateStatus={handleUpdateStatus}
                  isUpdating={updateStatusMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
