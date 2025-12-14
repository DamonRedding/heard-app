import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Search, X, Check } from "lucide-react";
import { CATEGORIES, DENOMINATIONS, type Category } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MobileFilterSheetProps {
  selectedCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
  selectedDenomination: string | null;
  onDenominationChange: (denomination: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryCounts?: Record<string, number>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function MobileFilterSheet({
  selectedCategory,
  onCategoryChange,
  selectedDenomination,
  onDenominationChange,
  searchQuery,
  onSearchChange,
  categoryCounts = {},
  hasActiveFilters,
  onClearFilters,
}: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempCategory, setTempCategory] = useState<Category | null>(selectedCategory);
  const [tempDenomination, setTempDenomination] = useState<string | null>(selectedDenomination);
  const [tempSearch, setTempSearch] = useState(searchQuery);

  const handleOpen = (open: boolean) => {
    if (open) {
      setTempCategory(selectedCategory);
      setTempDenomination(selectedDenomination);
      setTempSearch(searchQuery);
    }
    setIsOpen(open);
  };

  const handleClear = () => {
    setTempCategory(null);
    setTempDenomination(null);
    setTempSearch("");
  };

  const activeFilterCount = [selectedCategory, selectedDenomination, searchQuery].filter(Boolean).length;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 relative"
          data-testid="button-open-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Filter Experiences</SheetTitle>
            {(tempCategory || tempDenomination || tempSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground"
                data-testid="button-clear-temp-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="space-y-3">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search experiences, churches..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-mobile"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={tempCategory === null ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all py-2 px-3 text-sm",
                  tempCategory === null && "bg-primary text-primary-foreground"
                )}
                onClick={() => setTempCategory(null)}
                data-testid="mobile-category-all"
              >
                All
                {Object.values(categoryCounts).length > 0 && (
                  <span className="ml-1.5 opacity-70">
                    ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
                  </span>
                )}
              </Badge>
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={tempCategory === cat.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all py-2 px-3 text-sm",
                    tempCategory === cat.value && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setTempCategory(cat.value)}
                  data-testid={`mobile-category-${cat.value}`}
                >
                  {cat.label}
                  {categoryCounts[cat.value] !== undefined && (
                    <span className="ml-1.5 opacity-70">({categoryCounts[cat.value]})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Denomination</label>
            <Select
              value={tempDenomination || "all"}
              onValueChange={(value) => setTempDenomination(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full" data-testid="select-denomination-mobile">
                <SelectValue placeholder="All Denominations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Denominations</SelectItem>
                {DENOMINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-inset-bottom">
          <div className="flex gap-3">
            <SheetClose asChild>
              <Button variant="outline" className="flex-1" data-testid="button-cancel-filters">
                Cancel
              </Button>
            </SheetClose>
            <Button 
              onClick={() => {
                onCategoryChange(tempCategory);
                onDenominationChange(tempDenomination);
                onSearchChange(tempSearch);
                setIsOpen(false);
              }} 
              className="flex-1 gap-2" 
              data-testid="button-apply-filters"
            >
              <Check className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
