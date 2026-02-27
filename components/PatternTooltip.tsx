/**
 * PatternTooltip.tsx
 *
 * Reusable tap-to-reveal tooltip for pattern metric explanations.
 * Uses Modal so it NEVER goes off-screen.
 * Supports i18n via useLanguage() — reads from si.json / en.json.
 *
 * Usage:
 *   import { PatternTooltip, useTooltipState } from "@/components/PatternTooltip";
 *
 *   const { activeTooltip, setActiveTooltip } = useTooltipState();
 *
 *   <PatternTooltip id="risk_score" activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip}>
 *     <Text>94% ⓘ</Text>
 *   </PatternTooltip>
 */

import { useLanguage } from "@/contexts/LanguageContext";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const TOOLTIP_WIDTH = 260;
const SCREEN_MARGIN = 12;

// ─── Hook: manage which tooltip is open ───────────────────────────────────────
export function useTooltipState() {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  return { activeTooltip, setActiveTooltip };
}

// ─── Tooltip keys — must match keys in si.json / en.json under "tooltips" ────
export type TooltipKey =
  | "composite_score"
  | "weighted_mean_prob"
  | "peak_sentence_prob"
  | "dyslexic_ratio"
  | "risk_score"
  | "Phonetic"
  | "Grammar"
  | "Spelling"
  | "Visual"
  | "Normal";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PatternTooltipProps {
  id: TooltipKey;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PatternTooltip({
  id,
  activeTooltip,
  setActiveTooltip,
  children,
}: PatternTooltipProps) {
  const { t } = useLanguage();
  const isOpen = activeTooltip === id;
  const triggerRef = useRef<View>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handlePress = () => {
    if (isOpen) {
      setActiveTooltip(null);
      return;
    }

    // Measure where this element is on screen
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get("window").width;

      // Try to place tooltip above the element, aligned to right edge
      let tooltipX = x + width - TOOLTIP_WIDTH;
      let tooltipY = y - 10; // will be shifted up by the tooltip height via bottom anchor

      // Clamp left so it doesn't go off left edge
      if (tooltipX < SCREEN_MARGIN) {
        tooltipX = SCREEN_MARGIN;
      }

      // Clamp right so it doesn't go off right edge
      if (tooltipX + TOOLTIP_WIDTH > screenWidth - SCREEN_MARGIN) {
        tooltipX = screenWidth - TOOLTIP_WIDTH - SCREEN_MARGIN;
      }

      setTooltipPos({ x: tooltipX, y: tooltipY });
      setActiveTooltip(id);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef as any}
        onPress={handlePress}
        activeOpacity={0.75}
        style={styles.wrapper}
      >
        {children}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setActiveTooltip(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveTooltip(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.bubble,
                  {
                    left: tooltipPos.x,
                    top: tooltipPos.y - 100, // appear above the trigger
                  },
                ]}
              >
                <Text style={styles.bubbleText}>
                  {t(`tooltips.${id}` as any)}
                </Text>
                {/* Arrow pointing down */}
                <View style={styles.arrow} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    // No position relative needed — Modal escapes the layout
  },
  modalOverlay: {
    flex: 1,
    // Transparent — tap outside closes tooltip
  },
  bubble: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 20,
  },
  arrow: {
    position: "absolute",
    bottom: -7,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F59E0B",
  },
  bubbleText: {
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 18,
  },
});
