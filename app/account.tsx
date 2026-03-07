import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  }, [logout]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          Account
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.tint + "22" }]}>
            <Feather name="user" size={32} color={theme.tint} />
          </View>
          <Text style={[styles.displayName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {user?.displayName || "User"}
          </Text>
          <Text style={[styles.username, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            @{user?.username || "unknown"}
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: theme.expense + "22",
              borderColor: theme.expense + "44",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={theme.expense} />
          <Text style={[styles.logoutText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17 },
  content: { padding: 20, gap: 20 },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  displayName: { fontSize: 20 },
  username: { fontSize: 14 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15 },
});
