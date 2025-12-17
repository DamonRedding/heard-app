import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Clock, TrendingUp, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@shared/schema";
import { posthog } from "@/lib/posthog";

interface SearchSuggestion {
  id: string;
  title: string | null;
  content: string;
  category: Category;
}

interface SuggestionsResponse {
  submissions: SearchSuggestion[];
  categories: { value: Category; label: string; count: number }[];
  denominations: { value: string; count: number }[];
}

const RECENT_SEARCHES_KEY = "heard-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const searches = getRecentSearches();
  const filtered = searches.filter((s) => s.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function highlightMatch(text: string, query: string): JSX.Element {
  if (!query.trim()) return <span>{text}</span>;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return <span>{text}</span>;
  
  return (
    <span>
      {text.slice(0, index)}
      <span className="font-semibold text-primary">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </span>
  );
}

function truncateContent(content: string, maxLength: number = 60): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

interface SearchTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onCategorySelect?: (category: Category, triggerSearch?: boolean) => void;
  onDenominationSelect?: (denomination: string, triggerSearch?: boolean) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchTypeahead({
  value,
  onChange,
  onSubmit,
  onCategorySelect,
  onDenominationSelect,
  placeholder = "Search experiences, churches...",
  className,
  autoFocus = false,
}: SearchTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  const { data: suggestions, isLoading } = useQuery<SuggestionsResponse>({
    queryKey: ["/api/search/suggestions", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { submissions: [], categories: [], denominations: [] };
      const res = await fetch(`/api/search/suggestions?query=${encodeURIComponent(debouncedQuery)}&limit=6`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000,
  });

  const handleSubmit = useCallback((query: string, source: 'typed' | 'recent' | 'suggestion' = 'typed') => {
    if (query.trim()) {
      const resultsCount = suggestions?.submissions?.length ?? 0;
      const categoriesCount = suggestions?.categories?.length ?? 0;
      const denominationsCount = suggestions?.denominations?.length ?? 0;
      
      posthog.capture('search_performed', {
        query: query.trim(),
        query_length: query.trim().length,
        results_count: resultsCount,
        categories_count: categoriesCount,
        denominations_count: denominationsCount,
        has_results: resultsCount > 0 || categoriesCount > 0 || denominationsCount > 0,
        source: source,
      });
      
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      onSubmit(query);
    }
    setIsOpen(false);
  }, [onSubmit, suggestions]);

  const handleCategoryClick = useCallback((category: Category) => {
    posthog.capture('search_filter_applied', {
      filter_type: 'category',
      filter_value: category,
      query: value.trim() || null,
    });
    
    if (onCategorySelect) {
      onCategorySelect(category, true);
    }
    setIsOpen(false);
  }, [onCategorySelect, value]);

  const handleDenominationClick = useCallback((denomination: string) => {
    posthog.capture('search_filter_applied', {
      filter_type: 'denomination',
      filter_value: denomination,
      query: value.trim() || null,
    });
    
    if (onDenominationSelect) {
      onDenominationSelect(denomination, true);
    }
    setIsOpen(false);
  }, [onDenominationSelect, value]);

  const handleSubmissionClick = useCallback((submission: SearchSuggestion) => {
    posthog.capture('search_suggestion_clicked', {
      suggestion_id: submission.id,
      suggestion_type: 'submission',
      suggestion_category: submission.category,
      query: value.trim(),
    });
    
    handleSubmit(value.trim() || (submission.title || truncateContent(submission.content, 40)), 'suggestion');
    setIsOpen(false);
  }, [handleSubmit, value]);

  const handleRecentClick = useCallback((query: string) => {
    onChange(query);
    handleSubmit(query, 'recent');
  }, [onChange, handleSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allItems = [
      ...(recentSearches.length > 0 && !value.trim() ? recentSearches.map(r => ({ type: "recent", value: r })) : []),
      ...(suggestions?.submissions || []).map(s => ({ type: "submission", value: s })),
      ...(suggestions?.categories || []).map(c => ({ type: "category", value: c })),
      ...(suggestions?.denominations || []).map(d => ({ type: "denomination", value: d })),
    ];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        const item = allItems[selectedIndex];
        if (item.type === "recent") {
          handleRecentClick(item.value as string);
        } else if (item.type === "submission") {
          const sub = item.value as SearchSuggestion;
          handleSubmissionClick(sub);
        } else if (item.type === "category") {
          const cat = item.value as { value: Category };
          handleCategoryClick(cat.value);
        } else if (item.type === "denomination") {
          const denom = item.value as { value: string };
          handleDenominationClick(denom.value);
        }
      } else {
        handleSubmit(value);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [value, recentSearches, suggestions, selectedIndex, handleSubmit, handleRecentClick, handleCategoryClick, handleDenominationClick, handleSubmissionClick]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && (
    (value.trim() && (suggestions?.submissions?.length || suggestions?.categories?.length || suggestions?.denominations?.length || isLoading)) ||
    (!value.trim() && recentSearches.length > 0)
  );

  let itemIndex = -1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(value);
        }}
        className="relative flex items-center"
      >
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-11 w-full"
          autoFocus={autoFocus}
          data-testid="input-search-typeahead"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-1 h-9 w-9"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[60vh] overflow-y-auto"
          role="listbox"
          data-testid="search-suggestions-dropdown"
        >
          {!value.trim() && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent Searches
              </div>
              {recentSearches.map((query, idx) => {
                itemIndex++;
                const currentIndex = itemIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRecentClick(query)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-md min-h-[44px]",
                      selectedIndex === currentIndex ? "bg-accent" : "hover-elevate"
                    )}
                    role="option"
                    aria-selected={selectedIndex === currentIndex}
                    data-testid={`suggestion-recent-${idx}`}
                  >
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{query}</span>
                  </button>
                );
              })}
            </div>
          )}

          {value.trim() && isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {value.trim() && !isLoading && suggestions && (
            <>
              {suggestions.submissions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Results
                  </div>
                  {suggestions.submissions.map((submission) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    const displayText = submission.title || truncateContent(submission.content, 50);
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        onClick={() => handleSubmissionClick(submission)}
                        className={cn(
                          "flex items-start gap-3 w-full px-3 py-2.5 text-left rounded-md min-h-[44px]",
                          selectedIndex === currentIndex ? "bg-accent" : "hover-elevate"
                        )}
                        role="option"
                        aria-selected={selectedIndex === currentIndex}
                        data-testid={`suggestion-result-${submission.id}`}
                      >
                        <Search className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {highlightMatch(displayText, value)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions.categories.length > 0 && onCategorySelect && (
                <div className="p-2 border-t">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    Categories
                  </div>
                  {suggestions.categories.map((category) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleCategoryClick(category.value)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2.5 text-left rounded-md min-h-[44px]",
                          selectedIndex === currentIndex ? "bg-accent" : "hover-elevate"
                        )}
                        role="option"
                        aria-selected={selectedIndex === currentIndex}
                        data-testid={`suggestion-category-${category.value}`}
                      >
                        <span className="text-sm">{highlightMatch(category.label, value)}</span>
                        <span className="text-xs text-muted-foreground">{category.count} results</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions.denominations.length > 0 && onDenominationSelect && (
                <div className="p-2 border-t">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    Denominations
                  </div>
                  {suggestions.denominations.map((denom) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    return (
                      <button
                        key={denom.value}
                        type="button"
                        onClick={() => handleDenominationClick(denom.value)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2.5 text-left rounded-md min-h-[44px]",
                          selectedIndex === currentIndex ? "bg-accent" : "hover-elevate"
                        )}
                        role="option"
                        aria-selected={selectedIndex === currentIndex}
                        data-testid={`suggestion-denomination-${denom.value}`}
                      >
                        <span className="text-sm">{highlightMatch(denom.value, value)}</span>
                        <span className="text-xs text-muted-foreground">{denom.count} results</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions.submissions.length === 0 && suggestions.categories.length === 0 && suggestions.denominations.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No suggestions found for "{value}"
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
