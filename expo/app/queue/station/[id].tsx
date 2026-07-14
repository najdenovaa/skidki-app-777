import { useLocalSearchParams, useRouter } from "expo-router";
import { Send } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
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

import { FuelChips } from "@/components/FuelChips";
import { PercentSpinner } from "@/components/PercentSpinner";
import Colors from "@/constants/colors";
import { useQueue } from "@/providers/QueueProvider";
import { api } from "@/services/api";
import { formatTimeAgo } from "@/utils/time";
import type { FuelType, QueueStationInfo, Station, StationMessage } from "@/types/queue";

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { stations, currentQueue, joinQueue } = useQueue();

  const [station, setStation] = useState<Station | undefined>(
    stations.find((s) => String(s.id) === String(id))
  );
  const [info, setInfo] = useState<QueueStationInfo | null>(null);
  const [messages, setMessages] = useState<StationMessage[]>([]);
  const [chatText, setChatText] = useState<string>("");
  const [fuel, setFuel] = useState<FuelType>("92");
  const [joining, setJoining] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const stationId = String(id);

  useEffect(() => {
    let active = true;
    (async () => {
      const [stationRes, queueRes, chatRes] = await Promise.all([
        api.getStation(stationId),
        api.getStationQueue(stationId),
        api.getStationChat(stationId, 50),
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
  }, [stationId]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    const success = await joinQueue(stationId, fuel);
    setJoining(false);
    if (success) {
      router.push("/queue/my");
    }
  }, [joinQueue, stationId, fuel, router]);

  const handleSend = useCallback(async () => {
    const body = chatText.trim();
    if (!body) return;
    setChatText("");
    const res = await api.sendStationChat(stationId, body);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data!]);
    }
  }, [chatText, stationId]);

  if (loading || !station) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top"]}>
        <PercentSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {[station.brand, station.address].filter(Boolean).join(" · ")}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{station.queueCount} в очереди</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.stat}>~{station.avgWaitMin} мин ожидания</Text>
          </View>
        </View>

        {!currentQueue ? (
          <View style={styles.joinBlock}>
            <FuelChips
              value={fuel}
              onChange={setFuel}
              available={{
                fuel92: station.fuel92,
                fuel95: station.fuel95,
                fuelDt: station.fuelDt,
                fuelLpg: station.fuelLpg,
              }}
            />
            <Pressable
              onPress={handleJoin}
              disabled={joining || station.status !== "active"}
              style={[styles.joinBtn, station.status !== "active" ? styles.joinBtnDisabled : null]}
            >
              <Text style={styles.joinBtnText}>
                {station.status !== "active" ? "Станция недоступна" : joining ? "Вход..." : "Встать в очередь"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          renderItem={({ item }) => (
            <View style={styles.msgRow}>
              <Text style={styles.msgAuthor}>{item.userName}</Text>
              <Text style={styles.msgBody}>{item.body}</Text>
              <Text style={styles.msgTime}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyChat}>Сообщений пока нет</Text>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            value={chatText}
            onChangeText={setChatText}
            placeholder="Написать в чат станции..."
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable onPress={handleSend} style={styles.sendBtn}>
            <Send size={18} color={Colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  stat: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  statDot: {
    color: Colors.textMuted,
  },
  joinBlock: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
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
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  emptyChat: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 20,
  },
  msgRow: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  msgAuthor: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  msgBody: {
    fontSize: 14,
    color: Colors.text,
  },
  msgTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
});
