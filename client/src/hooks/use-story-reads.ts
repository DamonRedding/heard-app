import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "churchheard_story_reads";
const RATING_MODAL_SHOWN_KEY = "churchheard_rating_modal_shown";
const STORIES_BEFORE_MODAL = 2;

interface StoryReadsData {
  readIds: string[];
  sessionReads: number;
  lastReadAt: number;
}

function getStoredData(): StoryReadsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return { readIds: [], sessionReads: 0, lastReadAt: 0 };
}

function saveData(data: StoryReadsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
  }
}

function hasShownModalRecently(): boolean {
  try {
    const lastShown = localStorage.getItem(RATING_MODAL_SHOWN_KEY);
    if (!lastShown) return false;
    const lastShownTime = parseInt(lastShown, 10);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return lastShownTime > oneDayAgo;
  } catch {
    return false;
  }
}

function markModalShown(): void {
  try {
    localStorage.setItem(RATING_MODAL_SHOWN_KEY, Date.now().toString());
  } catch {
  }
}

export function useStoryReads() {
  const [data, setData] = useState<StoryReadsData>(getStoredData);
  const [shouldShowModal, setShouldShowModal] = useState(false);

  useEffect(() => {
    const stored = getStoredData();
    setData(stored);
  }, []);

  const trackStoryRead = useCallback((storyId: string) => {
    setData((prev) => {
      if (prev.readIds.includes(storyId)) {
        return prev;
      }

      const newSessionReads = prev.sessionReads + 1;
      const updated: StoryReadsData = {
        readIds: [...prev.readIds, storyId],
        sessionReads: newSessionReads,
        lastReadAt: Date.now(),
      };

      saveData(updated);

      if (newSessionReads >= STORIES_BEFORE_MODAL && !hasShownModalRecently()) {
        setTimeout(() => {
          setShouldShowModal(true);
        }, 500);
      }

      return updated;
    });
  }, []);

  const dismissModal = useCallback(() => {
    setShouldShowModal(false);
    markModalShown();
  }, []);

  const resetSessionReads = useCallback(() => {
    setData((prev) => {
      const updated = { ...prev, sessionReads: 0 };
      saveData(updated);
      return updated;
    });
  }, []);

  return {
    sessionReads: data.sessionReads,
    totalReads: data.readIds.length,
    shouldShowModal,
    trackStoryRead,
    dismissModal,
    resetSessionReads,
  };
}
