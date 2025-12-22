// services/vygddrasil.service.ts

import { createClient } from "@supabase/supabase-js";
import { GameProgress, ChoiceItem, StageMeta, CharacterWithProgress } from "../types/vygddrasil.types";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export class VygddrasilService {
  /**
   * Load game progress for a specific character
   */
  static async loadProgress(walletAddress: string, characterId?: number): Promise<GameProgress | null> {
    try {
      let query = supabase.from("game_progress").select("*").eq("wallet_address", walletAddress).eq("game_id", "vygddrasil").order("updated_at", { ascending: false });

      // If characterId is provided, filter by it
      if (characterId) {
        query = query.eq("character_id", characterId);
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        console.log("No saved progress found");
        return null;
      }

      return data as GameProgress;
    } catch (error) {
      console.error("Error loading progress:", error);
      return null;
    }
  }

  /**
   * Save game progress for a specific character
   */
  static async saveProgress(progressData: Omit<GameProgress, "id" | "created_at" | "updated_at">): Promise<{ success: boolean; error?: string }> {
    try {
      const dataToSave = {
        ...progressData,
        updated_at: new Date().toISOString(),
      };

      // Check if progress exists
      let query = supabase.from("game_progress").select("id").eq("wallet_address", progressData.wallet_address).eq("game_id", progressData.game_id);

      if (progressData.character_id) {
        query = query.eq("character_id", progressData.character_id);
      }

      const { data: existing } = await query.single();

      if (existing) {
        // Update existing progress
        const { error } = await supabase.from("game_progress").update(dataToSave).eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new progress
        const { error } = await supabase.from("game_progress").insert(dataToSave);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving progress:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete game progress for a specific character
   */
  static async deleteProgress(walletAddress: string, characterId?: number): Promise<{ success: boolean }> {
    try {
      let query = supabase.from("game_progress").delete().eq("wallet_address", walletAddress).eq("game_id", "vygddrasil");

      if (characterId) {
        query = query.eq("character_id", characterId);
      }

      const { error } = await query;

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error deleting progress:", error);
      return { success: false };
    }
  }

  /**
   * Check if user has any saved progress
   */
  static async hasProgress(walletAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("game_progress").select("id").eq("wallet_address", walletAddress).eq("game_id", "vygddrasil").limit(1);

      if (error) {
        console.error("Error checking progress:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking progress:", error);
      return false;
    }
  }

  /**
   * Fetch stage data (choices and metadata)
   */
  static async fetchStageData(stageSlug: string): Promise<{
    choices: ChoiceItem[];
    stageMeta: StageMeta | null;
  }> {
    try {
      // Fetch choices for this stage
      const { data: choicesData, error: choicesError } = await supabase.from("Vygddrasilchoice").select("*").eq("mainstream_slug", stageSlug).order("id", { ascending: true });

      if (choicesError) {
        console.error("Error fetching choices:", choicesError);
      }

      // Fetch stage metadata
      const { data: stageData, error: stageError } = await supabase.from("Vygddrasilstage").select("*").eq("slug", stageSlug).single();

      if (stageError) {
        console.error("Error fetching stage:", stageError);
      }

      return {
        choices: (choicesData as ChoiceItem[]) || [],
        stageMeta: (stageData as StageMeta) || null,
      };
    } catch (error) {
      console.error("Error fetching stage data:", error);
      return { choices: [], stageMeta: null };
    }
  }

  /**
   * Get all characters for a wallet
   */
  static async getCharacters(walletAddress: string): Promise<CharacterWithProgress[]> {
    try {
      const { data: charactersData, error: charError } = await supabase.from("vygddrasilclass").select("*").eq("wallet_address", walletAddress).order("created_at", { ascending: false });

      if (charError) throw charError;

      if (!charactersData || charactersData.length === 0) {
        return [];
      }

      // Load progress for each character
      const charactersWithProgress = await Promise.all(
        charactersData.map(async (char) => {
          const { data: progressData } = await supabase.from("game_progress").select("*").eq("wallet_address", walletAddress).eq("game_id", "vygddrasil").eq("character_id", char.id).order("updated_at", { ascending: false }).limit(1).single();

          return {
            ...char,
            progress: progressData ? (progressData as GameProgress) : undefined,
          } as CharacterWithProgress;
        })
      );

      return charactersWithProgress;
    } catch (error) {
      console.error("Error loading characters:", error);
      throw error;
    }
  }

  /**
   * Delete a character and its progress
   */
  static async deleteCharacter(characterId: number): Promise<{ success: boolean }> {
    try {
      // Delete character progress first
      await supabase.from("game_progress").delete().eq("character_id", characterId).eq("game_id", "vygddrasil");

      // Delete character
      const { error } = await supabase.from("vygddrasilclass").delete().eq("id", characterId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error deleting character:", error);
      return { success: false };
    }
  }
}
