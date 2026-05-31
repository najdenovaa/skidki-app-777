import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SendHorizonal, ArrowUpLeft, User as UserIcon } from "lucide-react-native";
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
import { api } from "@/services/api";
import type { SupportMessage } from "@/types/api";
import { formatDateTime } from "@/utils/time";

const POLL_INTERVAL = 5_000;

export default function AdminSupportChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{
    userName?: string;
    userEmail?: string;
    displayId?: number;
  }>({});
  const flatRef = useRef<FlatList<SupportMessage>>(null);

  const fetchChat = useCallback(async () => {
    if (!userId) return;
    const res = await api.getAdminSupportChat(userId);
    if (res.success && res.data) {
      setMessages(res.data);
      // Try to get thread info from messages or fetch user
      if (res.data.length > 0 && !userInfo.userName) {
        // Try fetching user detail for header info
        api.getAdminUser(userId).then((uRes) => {
          if (uRes.success && uRes.data) {
            setUserInfo({
              userName: uRes.data.user.name,
              userEmail: uRes.data.user.email,
              displayId: uRes.data.user.displayId,
            });
          }
        }).catch(() => {});
      }
    }
  }, [userId, userInfo.userName]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChat]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !userId) return;
    setSending(true);

    const optimistic: SupportMessage = {
      id: `local-${Date.now()}`,
      body: trimmed,
      isAdmin: true,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    const res = await api.sendAdminSupportReply(userId, trimmed);
    if (res.success && res.data) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data! : m)));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert("Ошибка", res.error ?? "Не удалось отправить ответ");
    }
    setSending(false);
  }, [text, sending, userId]);

  const renderItem = useCallback(
    ({ item }: { item: SupportMessage }) => {
      const isOwn = item.isAdmin;
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

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: `#${userInfo.displayId ?? "..."} ${userInfo.userName ?? ""}`,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/admin/user/${userId}`)}
              style={styles.headerBtn}
              hitSlop={8}
            >
              <UserIcon size={18} color={Colors.text} strokeWidth={2} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
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
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Нет сообщений</Text>
              </View>
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ответить..."
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  bubbleRow: { marginBottom: 8, flexDirection: "row" as const },
  bubbleRowOwn: { justifyContent: "flex-end" as const },
  bubbleRowAdmin: { justifyContent: "flex-start" as const },

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

  bubbleText: { fontSize: 15, lineHeight: 21, letterSpacing: -0.2 },
  bubbleTextOwn: { color: "#fff" },
  bubbleTextAdmin: { color: Colors.text },

  bubbleTime: { fontSize: 11, marginTop: 4, letterSpacing: -0.1 },
  bubbleTimeOwn: { color: "rgba(255,255,255,0.6)", textAlign: "right" as const },
  bubbleTimeAdmin: { color: Colors.textMuted, textAlign: "left" as const },

  empty: { paddingVertical: 60, alignItems: "center" as const },
  emptyText: { fontSize: 14, color: Colors.textMuted },

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
