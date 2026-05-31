import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bell, MapPin, Pencil, Shield, Trash2, User as UserIcon } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withTiming } from "react-native-reanimated";

import { CityPicker } from "@/components/CityPicker";
import Colors from "@/constants/colors";
import { resolveImageUrl } from "@/utils/image";
import { useTabBarVisible } from "@/hooks/TabBarScrollContext";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscounts } from "@/providers/DiscountsProvider";
import type { SelectedCity } from "@/types/api";
import type { Discount } from "@/types/discount";

const { width } = Dimensions.get("window");
const TILE = (width - 20 * 2 - 12) / 2;

// ─── authenticated profile ────────────────────────────────────────────────

function AuthenticatedProfile() {
  const router = useRouter();
  const { user, signOut, deleteAccount, updateProfile } = useAuth();
  const { myPosts, savedList, deletePost } = useDiscounts();
  const tabBarVisible = useTabBarVisible();
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [cityPickerOpen, setCityPickerOpen] = useState<boolean>(false);
  const items = tab === "posts" ? myPosts : savedList;
  const lastY = useRef<number>(0);

  const handleCitySelect = useCallback(
    (c: SelectedCity) => {
      updateProfile({ cityId: c.cityId });
      setCityPickerOpen(false);
    },
    [updateProfile]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      if (y <= 8) {
        tabBarVisible.value = withTiming(1, { duration: 200 });
      } else if (dy > 6) {
        tabBarVisible.value = withTiming(0, { duration: 200 });
      } else if (dy < -6) {
        tabBarVisible.value = withTiming(1, { duration: 200 });
      }
      lastY.current = y;
    },
    [tabBarVisible]
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Удалить аккаунт?",
      "Все ваши данные, скидки, комментарии и подписки будут безвозвратно удалены.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Подробнее",
          onPress: () => router.push("/delete-account"),
        },
        {
          text: "Удалить безвозвратно",
          style: "destructive",
          onPress: () => deleteAccount(),
        },
      ]
    );
  }, [deleteAccount, router]);

  const handleEditProfile = useCallback(() => {
    router.push("/edit-profile");
  }, [router]);

  const handleDeletePost = useCallback(
    (d: Discount) => {
      Alert.alert("Удалить скидку?", `«${d.title}» будет удалена`, [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            const ok = await deletePost(d.id);
            if (!ok) Alert.alert("Ошибка", "Не удалось удалить");
          },
        },
      ]);
    },
    [deletePost]
  );

  if (!user) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <SafeAreaView edges={["top"]}>
          <CityPicker
            visible={cityPickerOpen}
            onSelect={handleCitySelect}
            onClose={() => setCityPickerOpen(false)}
          />
          {/* Avatar + Identity */}
          <View style={styles.identity}>
            <Pressable onPress={() => router.push("/edit-profile")}>
              <Image
                source={{ uri: resolveImageUrl(user.avatar) }}
                style={styles.avatar}
                contentFit="cover"
              />
            </Pressable>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>
              {user.username}
            </Text>
            {user.email ? (
              <Text style={styles.email}>
                {user.email}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setCityPickerOpen(true)}
              style={styles.cityRow}
              hitSlop={8}
            >
              <MapPin size={12} color={Colors.textMuted} strokeWidth={2} />
              <Text style={styles.cityText}>
                {user.city || "Укажи город"}
              </Text>
            </Pressable>
          </View>

          {/* Stats line */}
          <Text style={styles.statsLine}>
            {myPosts.length} {plural(myPosts.length, "пост", "поста", "постов")} ·{" "}
            {savedList.length} {plural(savedList.length, "сохранение", "сохранения", "сохранений")}
          </Text>

          {/* Admin panel button */}
          {user.role === "admin" && (
            <Pressable
              onPress={() => router.push("/admin")}
              style={styles.adminBtn}
            >
              <Shield size={18} color={Colors.primary} strokeWidth={1.5} />
              <Text style={styles.adminBtnText}>Админ-панель</Text>
            </Pressable>
          )}

          {/* Notifications button */}
          <Pressable onPress={() => router.push("/notifications")} style={styles.notifBtn}>
            <Bell size={18} color={Colors.primary} strokeWidth={1.5} />
            <Text style={styles.notifBtnText}>Уведомления</Text>
          </Pressable>

          {/* Edit profile button */}
          <Pressable onPress={handleEditProfile} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Учётная запись</Text>
          </Pressable>
        </SafeAreaView>

        {/* Segments — underline style */}
        <View style={styles.segment}>
          <Pressable
            onPress={() => setTab("posts")}
            style={[styles.segTab, tab === "posts" && styles.segTabActive]}
          >
            <Text style={[styles.segText, tab === "posts" && styles.segTextActive]}>
              Мои скидки
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("saved")}
            style={[styles.segTab, tab === "saved" && styles.segTabActive]}
          >
            <Text style={[styles.segText, tab === "saved" && styles.segTextActive]}>
              Избранное
            </Text>
          </Pressable>
        </View>

        {/* Grid */}
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {tab === "posts" ? "Пока нет постов" : "Ничего не сохранено"}
            </Text>
            <Text style={styles.emptyText}>
              {tab === "posts"
                ? "Поделись первой скидкой"
                : "Сохраняй интересные предложения"}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((d) => (
              <Tile
                key={d.id}
                discount={d}
                onPress={() => router.push(`/discount/${d.id}`)}
                onDelete={tab === "posts" ? () => handleDeletePost(d) : undefined}
                onEdit={tab === "posts" ? () => router.push(`/edit-post?id=${d.id}`) : undefined}
              />
            ))}
          </View>
        )}

        {/* Account actions */}
        <View style={styles.actions}>
          <Pressable onPress={signOut} style={styles.actionBtn}>
            <Text style={styles.actionText}>Выйти</Text>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Удалить аккаунт</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/privacy")} style={styles.privacyLink}>
            <Text style={styles.privacyLinkText}>Политика конфиденциальности</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={styles.version}>Скидки v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ─── guest profile ────────────────────────────────────────────────────────

function GuestProfile() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.guestSafe}>
        <View style={styles.guestBody}>
          <View style={styles.guestIcon}>
            <UserIcon size={48} color={Colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={styles.guestTitle}>Войди в аккаунт</Text>
          <Text style={styles.guestSubtitle}>
            Публикуй скидки, сохраняй избранное и следи за обновлениями
          </Text>
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={styles.guestBtn}
          >
            <Text style={styles.guestBtnText}>Войти</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/auth/register")}>
            <Text style={styles.guestLink}>Зарегистрироваться</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── main screen router ───────────────────────────────────────────────────

export default function ProfileScreen() {
  const { isGuest } = useAuth();

  if (isGuest) return <GuestProfile />;
  return <AuthenticatedProfile />;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10;
  const h = n % 100;
  if (h >= 11 && h <= 19) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}

// ─── tile ─────────────────────────────────────────────────────────────────

function Tile({
  discount,
  onPress,
  onDelete,
  onEdit,
}: {
  discount: Discount;
  onPress: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <Image
        source={{ uri: resolveImageUrl(discount.images[0]) }}
        style={styles.tileImg}
        contentFit="cover"
      />
      <View style={styles.tilePercent}>
        <Text style={styles.tilePercentText}>−{discount.percent}%</Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          style={styles.tileDeleteBtn}
          hitSlop={8}
        >
          <Trash2 size={14} color="#fff" strokeWidth={2} />
        </Pressable>
      ) : null}
      {onEdit ? (
        <Pressable
          onPress={onEdit}
          style={styles.tileEditBtn}
          hitSlop={8}
        >
          <Pencil size={12} color="#fff" strokeWidth={2} />
        </Pressable>
      ) : null}
      <View style={styles.tileBody}>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {discount.title}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },

  // identity
  identity: {
    alignItems: "center" as const,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardSecondary,
  },
  name: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  handle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 6,
  },
  cityText: {
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: -0.2,
  },

  // stats line
  email: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: -0.2,
  },
  statsLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 12,
    letterSpacing: -0.2,
  },

  // notifications button
  notifBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    height: 42,
  },
  notifBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // admin panel button
  adminBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    height: 42,
  },
  adminBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
    letterSpacing: -0.3,
  },

  // edit profile button
  editBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },

  // segment — underline style
  segment: {
    flexDirection: "row" as const,
    marginTop: 24,
    marginHorizontal: 20,
  },
  segTab: {
    flex: 1,
    alignItems: "center" as const,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  segText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  segTextActive: {
    color: Colors.text,
    fontWeight: "600" as const,
  },

  // empty
  empty: {
    padding: 60,
    alignItems: "center" as const,
  },
  emptyTitle: {
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center" as const,
  },

  // grid
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  tile: {
    width: TILE,
    height: TILE * 1.4,
    borderRadius: 16,
    backgroundColor: Colors.card,
    overflow: "hidden" as const,
  },
  tileImg: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.cardSecondary,
  },
  tilePercent: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  tilePercentText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  tileDeleteBtn: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tileEditBtn: {
    position: "absolute" as const,
    top: 8,
    right: 42,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tileBody: {
    position: "absolute" as const,
    left: 10,
    right: 10,
    bottom: 10,
  },
  tileTitle: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 15,
    fontWeight: "600" as const,
  },

  // account actions
  actions: {
    marginTop: 32,
    marginHorizontal: 20,
    gap: 16,
    paddingVertical: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  deleteText: {
    fontSize: 15,
    color: Colors.danger,
    letterSpacing: -0.2,
  },
  privacyLink: {
    alignItems: "center" as const,
    paddingVertical: 8,
  },
  privacyLinkText: {
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },

  // version
  version: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center" as const,
    paddingBottom: 32,
    letterSpacing: -0.1,
  },

  // guest
  guestSafe: { flex: 1 },
  guestBody: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  guestIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 21,
    letterSpacing: -0.2,
    marginBottom: 28,
  },
  guestBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    alignSelf: "stretch" as const,
  },
  guestBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  guestLink: {
    fontSize: 15,
    color: Colors.primary,
    marginTop: 16,
    letterSpacing: -0.2,
  },
});
