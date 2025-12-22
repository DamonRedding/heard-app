import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export function ChurchRatingModal({ open, onClose, defaultChurchName = "" }: ChurchRatingModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const form = useForm<RatingFormData>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: {
      churchName: defaultChurchName,
      location: "",
      denomination: "",
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
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback",
        description: "Your anonymous rating has been submitted.",
      });
      onClose();
      form.reset();
      setStep(1);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to submit",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const progress = (step / TOTAL_STEPS) * 100;

  const canProceed = () => {
    const values = form.getValues();
    switch (step) {
      case 1:
        return values.churchName?.length >= 2;
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
    onClose();
    setStep(1);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                
                <FormField
                  control={form.control}
                  name="churchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the church name" 
                          {...field} 
                          data-testid="input-church-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City, State" 
                          {...field} 
                          data-testid="input-location"
                        />
                      </FormControl>
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
                  data-testid="button-next"
                >
                  Next
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
      </DialogContent>
    </Dialog>
  );
}
