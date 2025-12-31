// hooks/useSavedProgress.ts

import { useState, useEffect } from "react";
import { VygddrasilService } from "../services/vygddrasil.service";

export const useSavedProgress = (walletAddress: string | undefined) => {
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSavedProgress() {
      if (!walletAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const hasProgress = await VygddrasilService.hasProgress(walletAddress);
        setHasSavedProgress(hasProgress);
      } catch (error) {
        console.error("Error checking saved progress:", error);
        setHasSavedProgress(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSavedProgress();
  }, [walletAddress]);

  return { hasSavedProgress, isLoading };
};
