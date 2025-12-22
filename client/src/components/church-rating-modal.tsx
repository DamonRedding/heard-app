import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronLeft, ChevronRight, Check, Loader2, Search, MapPin, Church, CheckCircle2, Share2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  CHURCH_CONNECTION_OPTIONS,
  ATTENDANCE_DURATION_OPTIONS,
  BELONGING_SCALE_OPTIONS,
  LEADERSHIP_SCALE_OPTIONS,
  CONFLICT_HANDLING_OPTIONS,
  GROWTH_SCALE_OPTIONS,
  RECOMMEND_SCALE_OPTIONS,
  DENOMINATIONS,
  type ChurchConnection,
  type AttendanceDuration,
  type BelongingScale,
  type LeadershipScale,
  type ConflictHandling,
  type GrowthScale,
  type RecommendScale,
} from "@shared/schema";

const ratingFormSchema = z.object({
  churchName: z.string().min(2, "Church name is required"),
  location: z.string().optional(),
  denomination: z.string().optional(),
  googlePlaceId: z.string().optional().nullable(),
  churchConnection: z.enum(["attending_regularly", "attending_occasionally", "attended_past_year", "attended_1_5_years_ago", "attended_5_plus_years_ago", "visited_never_regular"] as const),
  attendanceDuration: z.enum(["less_than_6_months", "6_months_to_2_years", "2_to_5_years", "5_to_10_years", "more_than_10_years", "not_applicable"] as const),
  belongingScale: z.enum(["never", "rarely", "sometimes", "usually", "always", "prefer_not_to_answer"] as const),
  belongingComment: z.string().max(280).optional(),
  leadershipScale: z.enum(["deeply_concerning", "concerning", "neutral_mixed", "trustworthy", "exemplary", "not_enough_interaction"] as const),
  conflictHandling: z.enum(["harmfully", "poorly", "inconsistently", "constructively", "very_well", "did_not_observe"] as const),
  growthScale: z.enum(["felt_stuck", "minimal_growth", "some_growth", "significant_growth", "profound_transformation", "not_applicable"] as const),
  recommendScale: z.enum(["would_actively_discourage", "probably_would_not", "uncertain", "probably_would", "would_strongly_recommend"] as const),
  additionalComment: z.string().max(280).optional(),
});

type RatingFormData = z.infer<typeof ratingFormSchema>;

interface ChurchRatingModalProps {
  open: boolean;
  onClose: () => void;
  defaultChurchName?: string;
}

const TOTAL_STEPS = 6;

interface ChurchSuggestion {
  name: string;
  location: string | null;
  ratingCount: number;
  googlePlaceId?: string | null;
  source?: "local" | "google";
}

// Generate a unique session token for Google Places API cost optimization
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function ChurchRatingModal({ open, onClose, defaultChurchName = "" }: ChurchRatingModalProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState(defaultChurchName);
  const [debouncedQuery, setDebouncedQuery] = useState(defaultChurchName);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<ChurchSuggestion | null>(null);
  const [sessionToken] = useState(() => generateSessionToken());
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedChurchId, setSubmittedChurchId] = useState<number | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize selectedChurch when modal opens with a defaultChurchName
  useEffect(() => {
    if (open && defaultChurchName) {
      setSelectedChurch({ name: defaultChurchName, location: null, ratingCount: 0 });
      setSearchQuery(defaultChurchName);
    }
  }, [open, defaultChurchName]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<RatingFormData>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: {
      churchName: defaultChurchName,
      location: "",
      denomination: "",
      googlePlaceId: null,
      churchConnection: undefined,
      attendanceDuration: undefined,
      belongingScale: undefined,
      belongingComment: "",
      leadershipScale: undefined,
      conflictHandling: undefined,
      growthScale: undefined,
      recommendScale: undefined,
      additionalComment: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: RatingFormData) => {
      const response = await apiRequest("POST", "/api/church-ratings", data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      if (data?.churchId) {
        setSubmittedChurchId(data.churchId);
      }
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to submit",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  const progress = (step / TOTAL_STEPS) * 100;

  const canProceed = () => {
    const values = form.getValues();
    switch (step) {
      case 1:
        return selectedChurch !== null && values.churchName?.length >= 2;
      case 2:
        return values.churchConnection && values.attendanceDuration;
      case 3:
        return values.belongingScale;
      case 4:
        return values.leadershipScale && values.conflictHandling;
      case 5:
        return values.growthScale;
      case 6:
        return values.recommendScale;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    submitMutation.mutate(data);
  });

  const handleClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    onClose();
    setStep(1);
    form.reset();
    setSelectedChurch(null);
    setSearchQuery("");
    setIsSuccess(false);
    setSubmittedChurchId(null);
  };

  const handleShare = async () => {
    const shareData = {
      title: "Rate Your Church Experience",
      text: "Help others discover great churches by sharing your experience",
      url: window.location.origin,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch church suggestions
  const { data: suggestionsData, isLoading: isSearching } = useQuery<{ churches: ChurchSuggestion[] }>({
    queryKey: ["/api/churches/search", debouncedQuery, sessionToken],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        return { churches: [] };
      }
      const res = await fetch(`/api/churches/search?q=${encodeURIComponent(debouncedQuery)}&limit=8&sessionToken=${encodeURIComponent(sessionToken)}`);
      if (!res.ok) throw new Error("Failed to search churches");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2 && showSuggestions,
    staleTime: 30000,
  });

  const suggestions = suggestionsData?.churches || [];

  const handleSelectChurch = useCallback((church: ChurchSuggestion) => {
    setSelectedChurch(church);
    setSearchQuery(church.name);
    form.setValue("churchName", church.name);
    if (church.location) {
      form.setValue("location", church.location);
    }
    if (church.googlePlaceId) {
      form.setValue("googlePlaceId", church.googlePlaceId);
    }
    setShowSuggestions(false);
  }, [form]);

  const handleUseCustomChurch = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      const customChurch: ChurchSuggestion = { name: searchQuery.trim(), location: null, ratingCount: 0 };
      setSelectedChurch(customChurch);
      form.setValue("churchName", searchQuery.trim());
      setShowSuggestions(false);
    }
  }, [searchQuery, form]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (searchQuery.trim().length >= 2 ? 1 : 0);
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && showSuggestions) {
      e.preventDefault();
      if (selectedIndex === 0 && searchQuery.trim().length >= 2) {
        handleUseCustomChurch();
      } else if (selectedIndex > 0 && suggestions[selectedIndex - 1]) {
        handleSelectChurch(suggestions[selectedIndex - 1]);
      } else if (searchQuery.trim().length >= 2) {
        handleUseCustomChurch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [suggestions, selectedIndex, searchQuery, showSuggestions, handleSelectChurch, handleUseCustomChurch]);

  const clearSelection = useCallback(() => {
    setSelectedChurch(null);
    setSearchQuery("");
    form.setValue("churchName", "");
    form.setValue("location", "");
    inputRef.current?.focus();
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="py-6 text-center space-y-6" data-testid="rating-success-view">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-success-title">
                Thanks! Your rating helps seekers find great churches
              </h2>
              <p className="text-sm text-muted-foreground">
                Your anonymous feedback makes a difference.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleClose} 
                className="w-full"
                data-testid="button-done"
              >
                Done
              </Button>
              
              {submittedChurchId && (
                <Link 
                  href={`/churches/${submittedChurchId}`}
                  className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  onClick={handleClose}
                  data-testid="link-view-rating"
                >
                  <ExternalLink className="h-4 w-4" />
                  View your rating
                </Link>
              )}
            </div>

            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                Help others discover great churches
              </button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Rate Your Church Experience</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                  data-testid="button-close-rating-modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">Step {step} of {TOTAL_STEPS}</p>
            </DialogHeader>

            <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Help others by sharing your experience at a church. All responses are anonymous.</p>
                
                <div className="space-y-2">
                  <FormLabel>Search for a Church *</FormLabel>
                  
                  {selectedChurch ? (
                    <div 
                      className="flex items-center justify-between p-3 rounded-md border bg-muted/50"
                      data-testid="selected-church-display"
                    >
                      <div className="flex items-center gap-3">
                        <Church className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{selectedChurch.name}</p>
                          {selectedChurch.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {selectedChurch.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearSelection}
                        data-testid="button-clear-church"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div ref={searchContainerRef} className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={inputRef}
                          type="text"
                          placeholder="Type to search churches..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onKeyDown={handleKeyDown}
                          className="pl-10"
                          autoComplete="off"
                          data-testid="input-church-search"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>

                      {showSuggestions && searchQuery.trim().length >= 2 && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto"
                          role="listbox"
                          data-testid="church-suggestions-dropdown"
                        >
                          <button
                            type="button"
                            onClick={handleUseCustomChurch}
                            className={cn(
                              "flex items-center gap-3 w-full px-3 py-3 text-left border-b",
                              selectedIndex === 0 ? "bg-accent" : "hover-elevate"
                            )}
                            role="option"
                            aria-selected={selectedIndex === 0}
                            data-testid="button-use-custom-church"
                          >
                            <Church className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Use "{searchQuery.trim()}"</p>
                              <p className="text-xs text-muted-foreground">Add as new church</p>
                            </div>
                          </button>

                          {isSearching && (
                            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Searching...
                            </div>
                          )}

                          {!isSearching && suggestions.length > 0 && (
                            <div className="py-1">
                              {suggestions.filter(c => c.source === "local").length > 0 && (
                                <>
                                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Churches with ratings</p>
                                  {suggestions.filter(c => c.source === "local").map((church, idx) => (
                                    <button
                                      key={`local-${church.name}-${church.location || idx}`}
                                      type="button"
                                      onClick={() => handleSelectChurch(church)}
                                      className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5 text-left",
                                        selectedIndex === idx + 1 ? "bg-accent" : "hover-elevate"
                                      )}
                                      role="option"
                                      aria-selected={selectedIndex === idx + 1}
                                      data-testid={`suggestion-church-local-${idx}`}
                                    >
                                      <Church className="h-4 w-4 text-primary shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{church.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {church.location && (
                                            <span className="flex items-center gap-1 truncate">
                                              <MapPin className="h-3 w-3 shrink-0" />
                                              {church.location}
                                            </span>
                                          )}
                                          <span>{church.ratingCount} rating{church.ratingCount !== 1 ? 's' : ''}</span>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </>
                              )}
                              {suggestions.filter(c => c.source === "google").length > 0 && (
                                <>
                                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">From Google Maps</p>
                                  {suggestions.filter(c => c.source === "google").map((church, idx) => {
                                    const localCount = suggestions.filter(c => c.source === "local").length;
                                    return (
                                      <button
                                        key={`google-${church.googlePlaceId || idx}`}
                                        type="button"
                                        onClick={() => handleSelectChurch(church)}
                                        className={cn(
                                          "flex items-center gap-3 w-full px-3 py-2.5 text-left",
                                          selectedIndex === localCount + idx + 1 ? "bg-accent" : "hover-elevate"
                                        )}
                                        role="option"
                                        aria-selected={selectedIndex === localCount + idx + 1}
                                        data-testid={`suggestion-church-google-${idx}`}
                                      >
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{church.name}</p>
                                          {church.location && (
                                            <p className="text-xs text-muted-foreground truncate">{church.location}</p>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          )}

                          {!isSearching && suggestions.length === 0 && (
                            <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                              No existing churches found. You can add a new one.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="churchName"
                    render={() => (
                      <FormItem className="hidden">
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedChurch && (
                  <>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location {selectedChurch.googlePlaceId ? "" : "(optional)"}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="City, State" 
                              {...field} 
                              disabled={!!selectedChurch.googlePlaceId}
                              data-testid="input-location"
                            />
                          </FormControl>
                          {selectedChurch.googlePlaceId && (
                            <p className="text-xs text-muted-foreground">Location from Google Maps</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="denomination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Denomination (optional)</FormLabel>
                          <FormControl>
                            <select
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              {...field}
                              data-testid="select-denomination"
                            >
                              <option value="">Select denomination</option>
                              {DENOMINATIONS.map((denom) => (
                                <option key={denom} value={denom}>{denom}</option>
                              ))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="font-medium">Part 1: Your Experience</h3>
                
                <FormField
                  control={form.control}
                  name="churchConnection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Which best describes your connection to this church? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {CHURCH_CONNECTION_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`connection-${option.value}`}
                                data-testid={`radio-connection-${option.value}`}
                              />
                              <label 
                                htmlFor={`connection-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendanceDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>If you attended regularly, for how long? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {ATTENDANCE_DURATION_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`duration-${option.value}`}
                                data-testid={`radio-duration-${option.value}`}
                              />
                              <label 
                                htmlFor={`duration-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="font-medium">Part 2: Sense of Belonging</h3>
                
                <FormField
                  control={form.control}
                  name="belongingScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>During your time there, how much did you feel you belonged? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {BELONGING_SCALE_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`belonging-${option.value}`}
                                data-testid={`radio-belonging-${option.value}`}
                              />
                              <label 
                                htmlFor={`belonging-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="belongingComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What contributed most to this feeling? (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share what made you feel this way..."
                          maxLength={280}
                          {...field}
                          data-testid="textarea-belonging-comment"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {field.value?.length || 0}/280
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h3 className="font-medium">Part 3: Leadership & Culture</h3>
                
                <FormField
                  control={form.control}
                  name="leadershipScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How would you describe the leadership? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {LEADERSHIP_SCALE_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`leadership-${option.value}`}
                                data-testid={`radio-leadership-${option.value}`}
                              />
                              <label 
                                htmlFor={`leadership-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conflictHandling"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When disagreements or conflicts occurred, how were they typically handled? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {CONFLICT_HANDLING_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`conflict-${option.value}`}
                                data-testid={`radio-conflict-${option.value}`}
                              />
                              <label 
                                htmlFor={`conflict-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <h3 className="font-medium">Part 4: Personal Impact</h3>
                
                <FormField
                  control={form.control}
                  name="growthScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Did you experience personal growth during your time there? *</FormLabel>
                      <p className="text-sm text-muted-foreground mb-2">This could be spiritual, emotional, relational, or other areas.</p>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {GROWTH_SCALE_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`growth-${option.value}`}
                                data-testid={`radio-growth-${option.value}`}
                              />
                              <label 
                                htmlFor={`growth-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <h3 className="font-medium">Part 5: Overall Assessment</h3>
                
                <FormField
                  control={form.control}
                  name="recommendScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Knowing what you know now, how likely would you be to recommend this church? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {RECOMMEND_SCALE_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`recommend-${option.value}`}
                                data-testid={`radio-recommend-${option.value}`}
                              />
                              <label 
                                htmlFor={`recommend-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is there anything else about your experience that would be important for others to know? (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share any additional thoughts..."
                          maxLength={280}
                          {...field}
                          data-testid="textarea-additional-comment"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {field.value?.length || 0}/280
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-between pt-4 gap-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  data-testid="button-skip"
                >
                  Skip
                </Button>
              )}

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  data-testid={step === 1 ? "button-continue" : "button-next"}
                >
                  {step === 1 ? "Continue" : "Next"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canProceed() || submitMutation.isPending}
                  data-testid="button-submit-rating"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Submit
                </Button>
              )}
            </div>
          </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
