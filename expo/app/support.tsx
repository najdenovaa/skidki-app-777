import { Stack, useRouter } from "expo-router";
import { SendHorizonal, MessageCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/services/api";
import type { SupportMessage } from "@/types/api";
import { formatDateTime } from "@/utils/time";

const POLL_INTERVAL = 10_000;

export default function SupportScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const flatRef = useRef<FlatList<SupportMessage>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard: guest
  useEffect(() => {
    if (isGuest) {
      Alert.alert("Требуется авторизация", "Войди или зарегистрируйся, чтобы написать в поддержку", [
        { text: "Войти", onPress: () => router.push("/auth/login") },
        { text: "Позже", style: "cancel" as const, onPress: () => router.back() },
      ]);
    }
  }, [isGuest, router]);

  const fetchMessages = useCallback(async () => {
    const res = await api.getSupport();
    if (res.success && Array.isArray(res.data)) {
      setMessages(res.data);
    }
    setLoaded(true);
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    if (isGuest) return;
    fetchMessages();

    pollRef.current = setInterval(() => {
      api.getSupport().then((res) => {
        if (res.success && Array.isArray(res.data)) setMessages(res.data);
      });
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isGuest, fetchMessages]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);

    // Optimistic
    const optimistic: SupportMessage = {
      id: `local-${Date.now()}`,
      body: trimmed,
      isAdmin: false,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    // Scroll to bottom
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    const res = await api.sendSupportMessage(trimmed);
    if (res.success && res.data) {
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data! : m)));
    } else {
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert("Ошибка", res.error ?? "Не удалось отправить сообщение");
    }
    setSending(false);
  }, [text, sending]);

  const renderItem = useCallback(
    ({ item }: { item: SupportMessage }) => {
      const isOwn = !item.isAdmin;
      return (
        <View
          style={[
            styles.bubbleRow,
            isOwn ? styles.bubbleRowOwn : styles.bubbleRowAdmin,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleAdmin,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isOwn ? styles.bubbleTextOwn : styles.bubbleTextAdmin,
              ]}
            >
              {item.body}
            </Text>
            <Text
              style={[
                styles.bubbleTime,
                isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeAdmin,
              ]}
            >
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    []
  );

  if (isGuest) return null;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Поддержка",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              loaded ? (
                <View style={styles.empty}>
                  <MessageCircle
                    size={40}
                    color={Colors.textMuted}
                    strokeWidth={1.5}
                  />
                  <Text style={styles.emptyTitle}>Поддержка</Text>
                  <Text style={styles.emptyText}>
                    Напишите нам — ответим как можно скорее
                  </Text>
                </View>
              ) : null
            }
          />

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              textAlignVertical="center"
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={send}
              disabled={!text.trim() || sending}
              hitSlop={8}
            >
              <SendHorizonal
                size={20}
                color={text.trim() && !sending ? "#fff" : Colors.textMuted}
                strokeWidth={2}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  bubbleRow: {
    marginBottom: 8,
    flexDirection: "row",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
  bubbleRowAdmin: {
    justifyContent: "flex-start",
  },

  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
  },

  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  bubbleTextOwn: {
    color: "#fff",
  },
  bubbleTextAdmin: {
    color: Colors.text,
  },

  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
  },
  bubbleTimeAdmin: {
    color: Colors.textMuted,
    textAlign: "left",
  },

  empty: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: "center" as const,
    letterSpacing: -0.2,
  },

  inputBar: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    letterSpacing: -0.2,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.cardSecondary,
  },
});
