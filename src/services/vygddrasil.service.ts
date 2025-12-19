// services/vygddrasil.service.ts

import { createClient } from "@supabase/supabase-js";
import { GameProgress, ChoiceItem, StageMeta } from "../types/vygddrasil.types";
import { GAME_CONFIG } from "../constants/vygddrasil.constants";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export class VygddrasilService {
  /**
   * Load game progress for a specific wallet address
   */
  static async loadProgress(walletAddress: string): Promise<GameProgress | null> {
    try {
      const { data, error } = await supabase.from("game_progress").select("*").eq("wallet_address", walletAddress).eq("game_id", GAME_CONFIG.GAME_ID).maybeSingle();

      if (error) {
        console.error("Load progress error:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected load error:", error);
      return null;
    }
  }

  /**
   * Save game progress
   */
  static async saveProgress(progressData: Omit<GameProgress, "id" | "created_at" | "updated_at">): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if progress already exists
      const { data: existingData, error: fetchError } = await supabase.from("game_progress").select("id").eq("wallet_address", progressData.wallet_address).eq("game_id", GAME_CONFIG.GAME_ID).maybeSingle();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      let result;

      if (existingData) {
        // Update existing progress
        result = await supabase.from("game_progress").update(progressData).eq("id", existingData.id).select();
      } else {
        // Create new progress
        result = await supabase.from("game_progress").insert(progressData).select();
      }

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected save error:", error);
      return { success: false, error: "저장 중 오류가 발생했습니다!" };
    }
  }

  /**
   * Delete game progress
   */
  static async deleteProgress(walletAddress: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase.from("game_progress").delete().eq("wallet_address", walletAddress).eq("game_id", GAME_CONFIG.GAME_ID);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected delete error:", error);
      return { success: false, error: "삭제 중 오류가 발생했습니다!" };
    }
  }

  /**
   * Check if saved progress exists
   */
  static async hasProgress(walletAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("game_progress").select("id").eq("wallet_address", walletAddress).eq("game_id", GAME_CONFIG.GAME_ID).maybeSingle();

      return !error && !!data;
    } catch (error) {
      console.error("Error checking progress:", error);
      return false;
    }
  }

  /**
   * Fetch choices for a specific stage
   */
  static async fetchChoices(stageSlug: string): Promise<ChoiceItem[]> {
    try {
      const { data, error } = await supabase.from("Vygddrasilchoice").select("*").eq("mainstream_slug", stageSlug);

      if (error) {
        console.error("Error fetching choices:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error fetching choices:", error);
      return [];
    }
  }

  /**
   * Fetch stage metadata
   */
  static async fetchStageMeta(stageSlug: string): Promise<StageMeta | null> {
    try {
      const { data, error } = await supabase.from("Vygddrasilstage").select("title, description, image_url").eq("slug", stageSlug).single();

      if (error) {
        console.error("Error fetching stage meta:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching stage meta:", error);
      return null;
    }
  }

  /**
   * Fetch both choices and stage metadata in parallel
   */
  static async fetchStageData(stageSlug: string): Promise<{
    choices: ChoiceItem[];
    stageMeta: StageMeta | null;
  }> {
    const [choices, stageMeta] = await Promise.all([this.fetchChoices(stageSlug), this.fetchStageMeta(stageSlug)]);

    return { choices, stageMeta };
  }
}
