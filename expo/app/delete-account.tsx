import { useRouter } from "expo-router";
import { AlertTriangle, Image, MessageCircle, ShieldCheck, UserX } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

const ITEMS = [
  {
    icon: UserX,
    text: "Ваш профиль и учётные данные",
  },
  {
    icon: Image,
    text: "Все опубликованные скидки и фотографии",
  },
  {
    icon: MessageCircle,
    text: "Все комментарии, лайки, сохранения",
  },
  {
    icon: ShieldCheck,
    text: "Подписки на категории и настройки уведомлений",
  },
] as const;

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteAccount } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    await deleteAccount();
    setLoading(false);
  }, [deleteAccount]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <AlertTriangle size={40} color={Colors.danger} strokeWidth={1.5} />
          <Text style={styles.title}>Что будет удалено</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* List of deleted items */}
          <View style={styles.list}>
            {ITEMS.map((item, i) => (
              <View key={i} style={styles.item}>
                <item.icon size={20} color={Colors.danger} strokeWidth={1.5} />
                <Text style={styles.itemText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Warning */}
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Это действие необратимо. Восстановить данные будет невозможно.
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleDelete}
            disabled={loading}
            style={[styles.deleteBtn, loading && styles.btnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.deleteBtnText}>Удалить аккаунт</Text>
            )}
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Отмена</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: {
    alignItems: "center" as const,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  list: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: "hidden" as const,
  },
  item: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  warning: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 14,
    color: Colors.danger,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
  deleteBtn: {
    height: 52,
    backgroundColor: Colors.danger,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  btnDisabled: { opacity: 0.6 },
  deleteBtnText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  cancelBtn: {
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
});
