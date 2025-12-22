import { createContext, useContext, type ReactNode } from "react";
import { useStoryReads } from "@/hooks/use-story-reads";
import { ChurchRatingModal } from "@/components/church-rating-modal";

interface StoryReadsContextValue {
  trackStoryRead: (storyId: string) => void;
  sessionReads: number;
  totalReads: number;
}

const StoryReadsContext = createContext<StoryReadsContextValue | null>(null);

export function useStoryReadsContext() {
  const context = useContext(StoryReadsContext);
  if (!context) {
    throw new Error("useStoryReadsContext must be used within StoryReadsProvider");
  }
  return context;
}

interface StoryReadsProviderProps {
  children: ReactNode;
}

export function StoryReadsProvider({ children }: StoryReadsProviderProps) {
  const {
    sessionReads,
    totalReads,
    shouldShowModal,
    trackStoryRead,
    dismissModal,
  } = useStoryReads();

  return (
    <StoryReadsContext.Provider value={{ trackStoryRead, sessionReads, totalReads }}>
      {children}
      <ChurchRatingModal
        open={shouldShowModal}
        onClose={dismissModal}
      />
    </StoryReadsContext.Provider>
  );
}
