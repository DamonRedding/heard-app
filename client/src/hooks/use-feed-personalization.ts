import { useState, useEffect, useCallback } from "react";
import type { Category } from "@shared/schema";

const STORAGE_KEY = "churchheard-feed-personalization";

interface CategoryEngagement {
  category: Category;
  count: number;
  lastEngaged: number;
}

interface DenominationEngagement {
  denomination: string;
  count: number;
  lastEngaged: number;
}

interface KeywordData {
  count: number;
  lastSeen: number;
}

interface PersonalizationData {
  engagements: Record<Category, CategoryEngagement>;
  denominationEngagements: Record<string, DenominationEngagement>;
  keywords: Record<string, KeywordData>;
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
  denominationEngagements: {} as Record<string, DenominationEngagement>,
  keywords: {} as Record<string, KeywordData>,
  totalEngagements: 0,
  firstVisit: Date.now(),
  lastVisit: Date.now(),
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "shall", "can", "need", "i", "you", "he", "she", "it", "we", "they", "my", "your",
  "his", "her", "its", "our", "their", "this", "that", "these", "those", "what",
  "which", "who", "whom", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no", "not", "only",
  "same", "so", "than", "too", "very", "just", "also", "now", "here", "there",
  "then", "once", "church", "pastor", "me", "about", "after", "before", "up", "down"
]);

function extractKeywords(content: string): string[] {
  return content
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length >= 4 && !STOP_WORDS.has(word))
    .slice(0, 20);
}

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

  const trackEngagement = useCallback((
    category: Category, 
    type: "vote" | "reaction" | "comment" | "metoo" | "view",
    denomination?: string | null,
    content?: string | null
  ) => {
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
      
      if (denomination && denomination.trim()) {
        const denomKey = denomination.trim();
        const currentDenom = prev.denominationEngagements[denomKey] || { 
          denomination: denomKey, 
          count: 0, 
          lastEngaged: 0 
        };
        updated.denominationEngagements = {
          ...prev.denominationEngagements,
          [denomKey]: {
            denomination: denomKey,
            count: currentDenom.count + 1,
            lastEngaged: Date.now(),
          },
        };
      }
      
      if (content) {
        const keywords = extractKeywords(content);
        const newKeywords: Record<string, KeywordData> = {};
        for (const key of Object.keys(prev.keywords)) {
          newKeywords[key] = { ...prev.keywords[key] };
        }
        for (const word of keywords) {
          const existing = newKeywords[word] || { count: 0, lastSeen: 0 };
          newKeywords[word] = {
            count: existing.count + 1,
            lastSeen: Date.now(),
          };
        }
        updated.keywords = newKeywords;
      }
      
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

  const getTopDenomination = useCallback((): string | null => {
    const denomList = Object.values(data.denominationEngagements)
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);
    
    if (denomList.length === 0 || denomList[0].count < 2) {
      return null;
    }
    
    return denomList[0].denomination;
  }, [data]);

  const getPersonalizationParams = useCallback((): string => {
    const level = getPersonalizationLevel();
    
    if (level.level === "new") {
      return "";
    }
    
    const params = new URLSearchParams();
    level.topCategories.forEach(({ category, weight }) => {
      params.append("boost", `${category}:${weight}`);
    });
    
    const topDenom = getTopDenomination();
    if (topDenom) {
      params.set("denomination", topDenom);
    }
    
    params.set("personalized", "true");
    
    return params.toString();
  }, [getPersonalizationLevel, getTopDenomination]);

  const resetPersonalization = useCallback(() => {
    const fresh = { ...DEFAULT_DATA, firstVisit: Date.now(), lastVisit: Date.now() };
    setData(fresh);
    saveData(fresh);
  }, []);

  const getKeywordRelevanceScore = useCallback((content: string): number => {
    if (Object.keys(data.keywords).length === 0) return 0;
    
    const contentKeywords = extractKeywords(content);
    if (contentKeywords.length === 0) return 0;
    
    let matchScore = 0;
    for (const word of contentKeywords) {
      const keywordData = data.keywords[word];
      if (keywordData) {
        matchScore += Math.min(keywordData.count, 5);
      }
    }
    
    return Math.min(matchScore / contentKeywords.length, 1);
  }, [data.keywords]);

  return {
    data,
    trackEngagement,
    getPersonalizationLevel,
    getCategoryWeights,
    getPersonalizationParams,
    getTopDenomination,
    getKeywordRelevanceScore,
    resetPersonalization,
    totalEngagements: data.totalEngagements,
  };
}
