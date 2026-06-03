import { Check, ChevronDown } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/types/discount";

interface Props {
  value: Category | "all";
  onChange: (next: Category | "all") => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeAll?: boolean;
  variant?: "filter" | "form";
}

export function CategoryPicker({
  value,
  onChange,
  open,
  onOpenChange,
  includeAll,
  variant = "filter",
}: Props) {
  const showAll = includeAll ?? (variant === "filter");

  const items: { id: Category | "all"; label: string; color: string }[] = [
    ...(showAll ? [{ id: "all" as const, label: "Все категории", color: Colors.primary }] : []),
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, color: c.color })),
  ];

  const selected = items.find((it) => it.id === value);

  const handleSelect = useCallback(
    (id: Category | "all") => {
      onChange(id);
      onOpenChange(false);
    },
    [onChange, onOpenChange]
  );

  const handleBackdrop = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => onOpenChange(true)}
        style={styles.trigger}
      >
        <View
          style={[styles.triggerDot, { backgroundColor: selected?.color ?? Colors.textMuted }]}
        />
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {selected?.label ?? "Выбери категорию"}
        </Text>
        <ChevronDown size={18} color={Colors.textMuted} strokeWidth={2} />
      </Pressable>

      {/* Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleBackdrop}
      >
        <Pressable style={styles.backdrop} onPress={handleBackdrop}>
          <View style={styles.sheet}>
            <Pressable onPress={() => {}}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.list}
              >
                {items.map((it) => {
                  const active = value === it.id;
                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => handleSelect(it.id)}
                      style={[styles.row, active && styles.rowActive]}
                    >
                      <View
                        style={[styles.accent, { backgroundColor: it.color }]}
                      />
                      <View style={styles.rowContent}>
                        <View
                          style={[
                            styles.rowIconDot,
                            { backgroundColor: it.color + "20" },
                          ]}
                        >
                          <View
                            style={[
                              styles.rowIconInner,
                              { backgroundColor: it.color },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.rowLabel,
                            active && styles.rowLabelActive,
                          ]}
                        >
                          {it.label}
                        </Text>
                      </View>
                      {active && (
                        <Check size={18} color={Colors.primary} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  triggerLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingTop: 8,
    paddingBottom: 34,
  },
  list: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 16,
    borderRadius: 12,
    marginVertical: 1,
    gap: 12,
    overflow: "hidden",
  },
  rowActive: {
    backgroundColor: Colors.backgroundSecondary,
  },
  accent: {
    width: 4,
    height: 40,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  rowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIconDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  rowLabelActive: {
    color: Colors.text,
    fontWeight: "500" as const,
  },
});
