import { useState, useEffect, useCallback } from "react";
import type { Category } from "@shared/schema";

const STORAGE_KEY = "churchheard-feed-personalization";

interface CategoryEngagement {
  category: Category;
  count: number;
  lastEngaged: number;
}

interface PersonalizationData {
  engagements: Record<Category, CategoryEngagement>;
  totalEngagements: number;
  firstVisit: number;
  lastVisit: number;
}

interface PersonalizationLevel {
  level: "new" | "discovering" | "personalized";
  percentage: number;
  topCategories: { category: Category; weight: number }[];
  description: string;
}

const DEFAULT_DATA: PersonalizationData = {
  engagements: {} as Record<Category, CategoryEngagement>,
  totalEngagements: 0,
  firstVisit: Date.now(),
  lastVisit: Date.now(),
};

function getStoredData(): PersonalizationData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        ...DEFAULT_DATA,
        ...data,
        lastVisit: Date.now(),
      };
    }
  } catch {
    // Ignore errors
  }
  return { ...DEFAULT_DATA, firstVisit: Date.now(), lastVisit: Date.now() };
}

function saveData(data: PersonalizationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

export function useFeedPersonalization() {
  const [data, setData] = useState<PersonalizationData>(getStoredData);

  useEffect(() => {
    const stored = getStoredData();
    setData(stored);
    saveData(stored);
  }, []);

  const trackEngagement = useCallback((category: Category, type: "vote" | "reaction" | "comment" | "metoo" | "view") => {
    setData((prev) => {
      const current = prev.engagements[category] || { category, count: 0, lastEngaged: 0 };
      
      const updated: PersonalizationData = {
        ...prev,
        engagements: {
          ...prev.engagements,
          [category]: {
            category,
            count: current.count + 1,
            lastEngaged: Date.now(),
          },
        },
        totalEngagements: prev.totalEngagements + 1,
        lastVisit: Date.now(),
      };
      
      saveData(updated);
      return updated;
    });
  }, []);

  const getPersonalizationLevel = useCallback((): PersonalizationLevel => {
    const { engagements, totalEngagements } = data;
    
    const categoryList = Object.values(engagements)
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);
    
    if (totalEngagements < 3) {
      return {
        level: "new",
        percentage: 0,
        topCategories: [],
        description: "Showing trending posts across all topics",
      };
    }
    
    if (totalEngagements < 10) {
      const topCategory = categoryList[0];
      return {
        level: "discovering",
        percentage: 60,
        topCategories: topCategory 
          ? [{ category: topCategory.category, weight: 60 }]
          : [],
        description: `Your feed now shows more ${topCategory?.category || "relevant"} content`,
      };
    }
    
    const totalWeight = categoryList.reduce((sum, e) => sum + e.count, 0);
    const topCategories = categoryList
      .slice(0, 3)
      .map((e) => ({
        category: e.category,
        weight: Math.round((e.count / totalWeight) * 80),
      }));
    
    return {
      level: "personalized",
      percentage: 80,
      topCategories,
      description: "Your feed is personalized to your interests",
    };
  }, [data]);

  const getCategoryWeights = useCallback((): Record<Category, number> => {
    const level = getPersonalizationLevel();
    const allCategories: Category[] = ["leadership", "financial", "culture", "misconduct", "spiritual_abuse", "other"];
    
    const weights: Record<Category, number> = {} as Record<Category, number>;
    
    if (level.level === "new") {
      allCategories.forEach((cat) => {
        weights[cat] = 1 / allCategories.length;
      });
    } else {
      const personalizedWeight = level.percentage / 100;
      const remainingWeight = 1 - personalizedWeight;
      const remainingPerCategory = remainingWeight / allCategories.length;
      
      allCategories.forEach((cat) => {
        weights[cat] = remainingPerCategory;
      });
      
      level.topCategories.forEach(({ category, weight }) => {
        weights[category] = (weights[category] || 0) + (weight / 100);
      });
    }
    
    return weights;
  }, [getPersonalizationLevel]);

  const getPersonalizationParams = useCallback((): string => {
    const level = getPersonalizationLevel();
    
    if (level.level === "new") {
      return "";
    }
    
    const params = new URLSearchParams();
    level.topCategories.forEach(({ category, weight }) => {
      params.append("boost", `${category}:${weight}`);
    });
    params.set("personalized", "true");
    
    return params.toString();
  }, [getPersonalizationLevel]);

  const resetPersonalization = useCallback(() => {
    const fresh = { ...DEFAULT_DATA, firstVisit: Date.now(), lastVisit: Date.now() };
    setData(fresh);
    saveData(fresh);
  }, []);

  return {
    data,
    trackEngagement,
    getPersonalizationLevel,
    getCategoryWeights,
    getPersonalizationParams,
    resetPersonalization,
    totalEngagements: data.totalEngagements,
  };
}
