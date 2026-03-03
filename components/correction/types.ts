// components/correction/types.ts
/**
 * Shared types for the AI Correction sub-components.
 */

import type { CorrectionItem } from "@/app/api/aiCorrection";

/** A correction token extended with UI state (pending / accepted / rejected). */
export interface CorrectionWithStatus extends CorrectionItem {
  id: string;
  status: "pending" | "accepted" | "rejected";
  editedSuggestion?: string;
  /** "error" = flagged word, "correct" = unchanged word */
  type?: "error" | "correct" | string;
  /** Teacher annotation / comment explaining the decision */
  annotation?: string;
}

/** Pattern colour palette. */
export const PATTERN_COLORS: Record<string, string> = {
  visual_scrambling: "#F59E0B",
  visual_sequencing: "#F59E0B",
  phonetic_confusion: "#8B5CF6",
  visual_reversal: "#EC4899",
  grammar_issue: "#3B82F6",
  grammar: "#3B82F6",
  "grammar_&_spelling_suggestion": "#3B82F6",
  unknown: "#6B7280",
};

export const PATTERN_ICONS: Record<string, string> = {
  visual_scrambling: "shuffle",
  visual_sequencing: "swap-horiz",
  phonetic_confusion: "hearing",
  visual_reversal: "flip",
  grammar_issue: "spellcheck",
  grammar: "spellcheck",
  "grammar_&_spelling_suggestion": "spellcheck",
  unknown: "help-outline",
};

export const getPatternColor = (pattern: string): string => {
  const normalised = pattern.toLowerCase().replace(/[\s()]/g, "_");
  for (const key of Object.keys(PATTERN_COLORS)) {
    if (normalised.includes(key)) return PATTERN_COLORS[key];
  }
  return PATTERN_COLORS.unknown;
};

export const getPatternIcon = (pattern: string): string => {
  const normalised = pattern.toLowerCase().replace(/[\s()]/g, "_");
  for (const key of Object.keys(PATTERN_ICONS)) {
    if (normalised.includes(key)) return PATTERN_ICONS[key];
  }
  return PATTERN_ICONS.unknown;
};
