import { Badge } from "@/components/ui/badge";
import { CATEGORIES, type Category } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  selectedCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
  categoryCounts?: Record<string, number>;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  categoryCounts = {},
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="category-filter">
      <Badge
        variant={selectedCategory === null ? "default" : "outline"}
        className={cn(
          "cursor-pointer transition-all",
          selectedCategory === null && "bg-primary text-primary-foreground"
        )}
        onClick={() => onCategoryChange(null)}
        data-testid="category-all"
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
          variant={selectedCategory === cat.value ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all",
            selectedCategory === cat.value && "bg-primary text-primary-foreground"
          )}
          onClick={() => onCategoryChange(cat.value)}
          data-testid={`category-${cat.value}`}
        >
          {cat.label}
          {categoryCounts[cat.value] !== undefined && (
            <span className="ml-1.5 opacity-70">({categoryCounts[cat.value]})</span>
          )}
        </Badge>
      ))}
    </div>
  );
}
