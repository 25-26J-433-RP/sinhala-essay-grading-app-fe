// components/correction/CorrectionPopover.tsx
/**
 * Modal that shows correction details for a tapped error word.
 * Allows accept / edit / reject actions.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  type CorrectionWithStatus,
  getPatternColor,
  getPatternIcon,
} from "./types";

interface CorrectionPopoverProps {
  visible: boolean;
  token: CorrectionWithStatus | null;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (newText: string) => void;
  /** Called when teacher saves an annotation / comment */
  onAnnotate: (note: string) => void;
  onClose: () => void;
}

export default function CorrectionPopover({
  visible,
  token,
  onAccept,
  onReject,
  onEdit,
  onAnnotate,
  onClose,
}: CorrectionPopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [annotationText, setAnnotationText] = useState("");
  const [showAnnotation, setShowAnnotation] = useState(false);

  // Sync annotation text when token changes
  useEffect(() => {
    if (token) {
      setAnnotationText(token.annotation || "");
      setShowAnnotation(!!token.annotation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?.id]);

  if (!token) return null;

  const isNormalWord = token.type !== "error";
  const patternColor = getPatternColor(token.pattern);
  const patternIcon = getPatternIcon(token.pattern);

  const handleStartEdit = () => {
    setEditText(
      isNormalWord
        ? token.editedSuggestion || token.word
        : token.editedSuggestion || token.suggestion || token.word,
    );
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* ─── Header ─── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isNormalWord ? "Edit Word" : "Correction"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {isNormalWord ? (
            /* ═══ NORMAL WORD — Simple Edit Mode ═══ */
            <>
              <View style={styles.normalWordDisplay}>
                <Text style={styles.normalWordLabel}>Current word</Text>
                <Text style={styles.normalWordText}>
                  {token.editedSuggestion || token.word}
                </Text>
                {token.editedSuggestion && (
                  <Text style={styles.normalWordOriginal}>
                    Original: {token.word}
                  </Text>
                )}
              </View>

              {/* Inline Edit */}
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    placeholder="Enter new word…"
                    placeholderTextColor="#6B7280"
                    onSubmitEditing={handleSaveEdit}
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, { flex: 0 }]}
                  onPress={handleStartEdit}
                >
                  <MaterialIcons name="edit" size={18} color="#60A5FA" />
                  <Text style={[styles.editBtnText, { color: "#60A5FA" }]}>
                    Edit this word
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            /* ═══ ERROR WORD — Full Correction UI ═══ */
            <>
              {/* Word Change */}
              <View style={styles.wordRow}>
                <View style={styles.wordBox}>
                  <Text style={styles.wordLabel}>Original</Text>
                  <Text style={styles.originalWord}>{token.word}</Text>
                </View>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color="#6B7280"
                />
                <View style={styles.wordBox}>
                  <Text style={styles.wordLabel}>Suggestion</Text>
                  <Text style={styles.suggestionWord}>
                    {token.editedSuggestion || token.suggestion}
                  </Text>
                </View>
              </View>

              {/* Pattern & Confidence */}
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.patternBadge,
                    {
                      backgroundColor: patternColor + "20",
                      borderColor: patternColor + "40",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={patternIcon as any}
                    size={14}
                    color={patternColor}
                  />
                  <Text style={[styles.patternText, { color: patternColor }]}>
                    {token.pattern}
                  </Text>
                </View>
                <Text style={styles.confidence}>
                  {Math.round(token.confidence * 100)}% confidence
                </Text>
              </View>

              {/* Explanation */}
              {token.explanation ? (
                <Text style={styles.explanation}>{token.explanation}</Text>
              ) : null}

              {/* Status Indicator */}
              {token.status !== "pending" && (
                <View
                  style={[
                    styles.statusBanner,
                    token.status === "accepted"
                      ? { backgroundColor: "#064E3B" }
                      : { backgroundColor: "#7F1D1D" },
                  ]}
                >
                  <MaterialIcons
                    name={
                      token.status === "accepted" ? "check-circle" : "cancel"
                    }
                    size={16}
                    color={
                      token.status === "accepted" ? "#10B981" : "#EF4444"
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          token.status === "accepted" ? "#10B981" : "#EF4444",
                      },
                    ]}
                  >
                    {token.status === "accepted" ? "Accepted" : "Rejected"}
                  </Text>
                </View>
              )}

              {/* Inline Edit */}
              {isEditing && (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    placeholder="Enter corrected word…"
                    placeholderTextColor="#6B7280"
                    onSubmitEditing={handleSaveEdit}
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={onAccept}
                >
                  <MaterialIcons name="check" size={18} color="#10B981" />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={handleStartEdit}
                >
                  <MaterialIcons name="edit" size={18} color="#F59E0B" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={onReject}
                >
                  <MaterialIcons name="close" size={18} color="#EF4444" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ─── Annotation / Comment (shared for all word types) ─── */}
          <View style={styles.annotationSection}>
            <TouchableOpacity
              style={styles.annotationToggle}
              onPress={() => setShowAnnotation(!showAnnotation)}
            >
              <MaterialIcons
                name={showAnnotation ? "speaker-notes-off" : "speaker-notes"}
                size={16}
                color="#8B5CF6"
              />
              <Text style={styles.annotationToggleText}>
                {showAnnotation
                  ? "Hide Note"
                  : token.annotation
                    ? "View Note"
                    : "Add Note"}
              </Text>
              {token.annotation && !showAnnotation && (
                <View style={styles.annotationDot} />
              )}
            </TouchableOpacity>

            {showAnnotation && (
              <View style={styles.annotationInputWrap}>
                <TextInput
                  style={styles.annotationInput}
                  value={annotationText}
                  onChangeText={setAnnotationText}
                  placeholder="Add a comment about this word…"
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.annotationSaveBtn,
                    !annotationText.trim() && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (annotationText.trim()) {
                      onAnnotate(annotationText.trim());
                    }
                  }}
                  disabled={!annotationText.trim()}
                >
                  <MaterialIcons name="save" size={14} color="#fff" />
                  <Text style={styles.annotationSaveBtnText}>Save Note</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#374151",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F3F4F6",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 14,
  },
  wordBox: {
    alignItems: "center",
    flex: 1,
  },
  wordLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  originalWord: {
    fontSize: 18,
    color: "#FCA5A5",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  suggestionWord: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  patternBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  patternText: {
    fontSize: 12,
    fontWeight: "600",
  },
  confidence: {
    fontSize: 12,
    color: "#6B7280",
  },
  explanation: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 12,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  saveButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  acceptBtn: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B30",
  },
  editBtn: {
    borderColor: "#F59E0B",
    backgroundColor: "#78350F30",
  },
  rejectBtn: {
    borderColor: "#EF4444",
    backgroundColor: "#7F1D1D30",
  },
  acceptText: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  editBtnText: { fontSize: 13, color: "#F59E0B", fontWeight: "600" },
  rejectText: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
  normalWordDisplay: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  normalWordLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  normalWordText: {
    fontSize: 20,
    color: "#E5E7EB",
    fontWeight: "700",
  },
  normalWordOriginal: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  // ─── Annotation ───
  annotationSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 10,
  },
  annotationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  annotationToggleText: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: "600",
  },
  annotationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
    marginLeft: 4,
  },
  annotationInputWrap: {
    marginTop: 8,
  },
  annotationInput: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#8B5CF6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#E5E7EB",
    fontSize: 14,
    minHeight: 50,
    lineHeight: 20,
  },
  annotationSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  annotationSaveBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
