import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, Lock } from "lucide-react";
import { CATEGORIES, TIMEFRAMES, DENOMINATIONS, insertSubmissionSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

const formSchema = insertSubmissionSchema.extend({
  content: z.string().min(50, "Experience must be at least 50 characters").max(2000, "Experience must be less than 2000 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmissionFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  isSubmitting?: boolean;
  isSuccess?: boolean;
}

export function SubmissionForm({ onSubmit, isSubmitting = false, isSuccess = false }: SubmissionFormProps) {
  const [charCount, setCharCount] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      category: undefined,
      timeframe: undefined,
      denomination: undefined,
      churchName: undefined,
      pastorName: undefined,
      location: undefined,
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
  };

  if (isSuccess) {
    return (
      <Card className="border-absolve/30 bg-absolve/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-absolve mb-4" />
          <h3 className="text-xl font-semibold mb-2">Your voice matters. Thank you.</h3>
          <p className="text-muted-foreground max-w-md">
            Your experience has been submitted anonymously. It will be visible in the feed shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Share Your Experience</CardTitle>
        <CardDescription>
          Your submission is completely anonymous. We don't collect any identifying information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What happened?</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Describe your experience... Be as detailed as you feel comfortable sharing."
                        className="min-h-[200px] font-serif text-base resize-y"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setCharCount(e.target.value.length);
                        }}
                        data-testid="input-content"
                      />
                      <div
                        className={cn(
                          "absolute bottom-2 right-2 text-xs",
                          charCount < 50
                            ? "text-muted-foreground"
                            : charCount > 2000
                            ? "text-destructive"
                            : "text-absolve"
                        )}
                      >
                        {charCount} / 2000
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>Minimum 50 characters, maximum 2000 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                            <div className="flex flex-col">
                              <span>{cat.label}</span>
                              <span className="text-xs text-muted-foreground">{cat.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeframe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When did this happen?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeframe">
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEFRAMES.map((tf) => (
                          <SelectItem key={tf.value} value={tf.value} data-testid={`option-timeframe-${tf.value}`}>
                            {tf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="denomination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denomination (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-denomination">
                        <SelectValue placeholder="Select denomination" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DENOMINATIONS.map((denom) => (
                        <SelectItem key={denom} value={denom} data-testid={`option-denomination-${denom}`}>
                          {denom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Admin-Only Information</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                The following information helps us identify patterns but will <strong>NOT</strong> be displayed publicly. 
                Only site administrators can see these details.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="churchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Name (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First Baptist Church"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-church-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pastorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pastor/Leader Name (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Pastor John Smith"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-pastor-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City/State (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Springfield, IL"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting || charCount < 50}
              data-testid="button-submit-experience"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Share Your Experience"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
