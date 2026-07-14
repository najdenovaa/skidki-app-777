import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Pencil, Send, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FuelChips } from "@/components/FuelChips";
import { KeyboardStickyFooter } from "@/components/KeyboardStickyFooter";
import { Open2GisLink } from "@/components/Open2GisLink";
import { PercentSpinner } from "@/components/PercentSpinner";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useQueue } from "@/providers/QueueProvider";
import { api } from "@/services/api";
import type { FuelType, QueueStationInfo, Station, StationMessage } from "@/types/queue";
import { formatTimeAgo } from "@/utils/time";

const CHAT_POLL_INTERVAL = 15_000;

const FUEL_STATUS: { key: keyof Pick<Station, "fuel92" | "fuel95" | "fuelDt" | "fuelLpg">; label: string }[] = [
  { key: "fuel92", label: "АИ-92" },
  { key: "fuel95", label: "АИ-95" },
  { key: "fuelDt", label: "ДТ" },
  { key: "fuelLpg", label: "Газ" },
];

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stationId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const { currentQueue, joinQueue, gpsLat, gpsLng } = useQueue();

  const [station, setStation] = useState<Station | null>(null);
  const [info, setInfo] = useState<QueueStationInfo | null>(null);
  const [messages, setMessages] = useState<StationMessage[]>([]);
  const [fuelType, setFuelType] = useState<FuelType>("95");
  const [chatInput, setChatInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [joining, setJoining] = useState<boolean>(false);

  const flatRef = useRef<FlatList<StationMessage>>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [stationRes, queueRes, chatRes] = await Promise.all([
        api.getStation(stationId, { lat: gpsLat, lng: gpsLng }),
        api.getStationQueue(stationId),
        api.getStationChat(stationId),
      ]);
      if (!active) return;
      if (stationRes.success && stationRes.data) setStation(stationRes.data);
      if (queueRes.success && queueRes.data) setInfo(queueRes.data);
      if (chatRes.success && chatRes.data) setMessages(chatRes.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  // Poll chat every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      api.getStationChat(stationId).then((res) => {
        if (res.success && res.data) setMessages(res.data);
      });
    }, CHAT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [stationId]);

  const handleJoin = useCallback(async () => {
    if (isGuest) {
      Alert.alert(
        "Требуется авторизация",
        "Войди или зарегистрируйся, чтобы встать в очередь",
        [
          { text: "Войти", onPress: () => router.push("/auth/login") },
          { text: "Позже", style: "cancel" as const },
        ]
      );
      return;
    }
    if (currentQueue) {
      router.push("/queue/my");
      return;
    }
    setJoining(true);
    const success = await joinQueue(stationId, fuelType);
    setJoining(false);
    if (success) {
      router.replace("/queue/my");
    } else {
      Alert.alert("Ошибка", "Не удалось встать в очередь");
    }
  }, [isGuest, currentQueue, joinQueue, stationId, fuelType, router]);

  const handleSend = useCallback(async () => {
    const body = chatInput.trim();
    if (!body) return;
    setChatInput("");
    const res = await api.sendStationChat(stationId, body);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data!]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatInput, stationId]);

  const renderMessage = useCallback(({ item }: { item: StationMessage }) => {
    if (item.msgType === "system") {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.body}</Text>
        </View>
      );
    }
    const isAlert = item.msgType === "alert";
    return (
      <View style={[styles.bubble, isAlert ? styles.bubbleAlert : styles.bubbleNormal]}>
        <Text style={styles.bubbleAuthor}>{item.userName}</Text>
        <Text style={styles.bubbleBody}>{item.body}</Text>
        <Text style={styles.bubbleTime}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    );
  }, []);

  if (loading || !station) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <PercentSpinner />
      </SafeAreaView>
    );
  }

  const isActive = station.status === "active";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.flex}>
        <FlatList
          ref={flatRef}
          data={messages}
          inverted={false}
          keyExtractor={(item) => String(item.id)}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          renderItem={renderMessage}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {station.name}
              </Text>
              {station.brand ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {station.brand}
                </Text>
              ) : null}

              <FuelChips
                value={fuelType}
                onChange={setFuelType}
                available={{
                  fuel92: station.fuel92,
                  fuel95: station.fuel95,
                  fuelDt: station.fuelDt,
                  fuelLpg: station.fuelLpg,
                }}
              />

              <View style={styles.fuelStatusRow}>
                {FUEL_STATUS.map((f) => {
                  const has = station[f.key];
                  return (
                    <View key={f.key} style={styles.fuelStatusItem}>
                      {has ? (
                        <Check size={14} color={Colors.success} strokeWidth={2.5} />
                      ) : (
                        <X size={14} color={Colors.danger} strokeWidth={2.5} />
                      )}
                      <Text style={styles.fuelStatusLabel}>{f.label}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.stat}>
                  {info?.queueCount ?? station.queueCount} в очереди
                </Text>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.stat}>
                  ~{info?.avgWaitMin ?? station.avgWaitMin} мин ожидания
                </Text>
              </View>

              {info?.viralHint ? (
                <View style={styles.viralHint}>
                  <Text style={styles.viralHintText}>{info.viralHint}</Text>
                </View>
              ) : null}

              <Open2GisLink lat={station.lat} lng={station.lng} address={station.address} />

              {currentQueue ? (
                <Pressable onPress={() => router.push("/queue/my")} style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Ты уже в очереди #{currentQueue.position}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleJoin}
                  disabled={joining || !isActive}
                  style={[styles.joinBtn, !isActive ? styles.joinBtnDisabled : null]}
                >
                  <Text style={styles.joinBtnText}>
                    {!isActive ? "Станция недоступна" : joining ? "Вход..." : "Встать в очередь"}
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  isGuest
                    ? Alert.alert(
                        "Требуется авторизация",
                        "Войди или зарегистрируйся, чтобы исправить информацию",
                        [
                          { text: "Войти", onPress: () => router.push("/auth/login") },
                          { text: "Позже", style: "cancel" as const },
                        ]
                      )
                    : router.push(`/queue/station/edit/${stationId}`)
                }
                style={styles.editBtn}
              >
                <Pencil size={14} color={Colors.textSecondary} />
                <Text style={styles.editBtnText}>Исправить информацию</Text>
              </Pressable>
              <Text style={styles.updatedText}>
                Данные от пользователей · обновлено {formatTimeAgo(station.updatedAt)}
              </Text>

              <Text style={styles.chatLabel}>Чат станции</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyChat}>Сообщений пока нет</Text>}
        />

        <KeyboardStickyFooter>
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Написать в чат станции..."
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              disabled={!chatInput.trim()}
              style={[styles.sendBtn, !chatInput.trim() ? styles.sendBtnDisabled : null]}
            >
              <Send size={18} color={Colors.textInverse} />
            </Pressable>
          </View>
        </KeyboardStickyFooter>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -6,
  },
  fuelStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  fuelStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fuelStatusLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stat: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  statDot: {
    color: Colors.textMuted,
  },
  viralHint: {
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viralHintText: {
    color: Colors.info,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  joinBtnText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  chatLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.cardSecondary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  updatedText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: -6,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    flexGrow: 1,
  },
  emptyChat: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 12,
  },
  systemRow: {
    alignItems: "center",
  },
  systemText: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.cardSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bubble: {
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  bubbleNormal: {
    backgroundColor: Colors.card,
  },
  bubbleAlert: {
    backgroundColor: Colors.warningLight,
  },
  bubbleAuthor: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  bubbleBody: {
    fontSize: 14,
    color: Colors.text,
  },
  bubbleTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
});
