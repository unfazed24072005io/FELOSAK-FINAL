import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { pin, setPin, lock, activeBook } = useApp();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [step, setStep] = useState<"idle" | "enter" | "confirm">("idle");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleSetPin = useCallback(() => {
    if (step === "idle") {
      setStep("enter");
      setNewPin("");
      setConfirmPin("");
      setError("");
    } else if (step === "enter") {
      if (newPin.length < 4) {
        setError("PIN must be 4 digits");
        return;
      }
      setStep("confirm");
      setError("");
    } else if (step === "confirm") {
      if (confirmPin !== newPin) {
        setError("PINs don't match. Try again.");
        setStep("enter");
        setNewPin("");
        setConfirmPin("");
        return;
      }
      setPin(newPin);
      setStep("idle");
      setError("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("PIN Set", "Your app is now protected with a PIN.");
    }
  }, [step, newPin, confirmPin, setPin]);

  const handleRemovePin = useCallback(() => {
    Alert.alert("Remove PIN", "Are you sure you want to remove the PIN lock?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setPin(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [setPin]);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
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
        <Pressable onPress={() => router.back()} accessibilityLabel="Close settings" accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {t("settings")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 40 },
        ]}
      >
        {user && (
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.tint + "22" }]}>
              <Feather name="user" size={24} color={theme.tint} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {user.displayName}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {user.username}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/account")}
              hitSlop={8}
            >
              <Feather name="edit-2" size={16} color={theme.tint} />
            </Pressable>
          </View>
        )}

        {activeBook?.isCloud && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Book Settings
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <SettingsRow
                icon="users"
                title="Business Team"
                subtitle="Add, remove or change role"
                theme={theme}
                onPress={() => {
                  if (activeBook) {
                    router.push({ pathname: "/book-members", params: { bookId: activeBook.id } });
                  }
                }}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="sliders"
                title="Business Settings"
                subtitle="Settings specific to this business"
                theme={theme}
                onPress={() => {
                  Alert.alert("Coming Soon", "Business-specific settings will be available in a future update.");
                }}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            General Settings
          </Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingsRow
              icon="lock"
              title="Security"
              subtitle={pin ? "PIN Lock enabled" : "Set up PIN Lock"}
              theme={theme}
              badge={pin ? "ON" : undefined}
              badgeColor={theme.income}
              onPress={() => {
                if (pin) {
                  Alert.alert("PIN Lock", "Your PIN is active.", [
                    { text: "Change PIN", onPress: () => { setStep("enter"); setNewPin(""); setConfirmPin(""); setError(""); } },
                    { text: "Remove PIN", style: "destructive", onPress: handleRemovePin },
                    { text: "Cancel", style: "cancel" },
                  ]);
                } else {
                  setStep("enter");
                  setNewPin("");
                  setConfirmPin("");
                  setError("");
                }
              }}
            />

            {step !== "idle" && (
              <View style={styles.pinSetupBox}>
                <Text
                  style={[styles.pinPrompt, { color: theme.text, fontFamily: "Inter_500Medium" }]}
                >
                  {step === "enter" ? "Enter new 4-digit PIN" : "Confirm your PIN"}
                </Text>
                <TextInput
                  style={[
                    styles.pinInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: error ? theme.expense : theme.border,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                  value={step === "enter" ? newPin : confirmPin}
                  onChangeText={step === "enter" ? setNewPin : setConfirmPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  placeholder="----"
                  placeholderTextColor={theme.textSecondary + "88"}
                  textAlign="center"
                />
                {error ? (
                  <Text style={[styles.errorTxt, { color: theme.expense, fontFamily: "Inter_400Regular" }]}>
                    {error}
                  </Text>
                ) : null}
                <View style={styles.pinBtnRow}>
                  <Pressable
                    onPress={() => { setStep("idle"); setError(""); }}
                    style={({ pressed }) => [
                      styles.pinCancelBtn,
                      { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.pinCancelTxt, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSetPin}
                    style={({ pressed }) => [
                      styles.pinConfirmBtn,
                      { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={[styles.pinConfirmTxt, { fontFamily: "Inter_600SemiBold" }]}>
                      {step === "enter" ? "Next" : "Confirm"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            {!user ? (
              <SettingsRow
                icon="user"
                title="Your Profile"
                subtitle="Sign in to sync across devices"
                theme={theme}
                onPress={() => router.push("/auth")}
              />
            ) : (
              <SettingsRow
                icon="user"
                title="Your Profile"
                subtitle={user.displayName}
                theme={theme}
                onPress={() => router.push("/account")}
              />
            )}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="globe"
              title={t("language")}
              subtitle={language === "en" ? "English" : "العربية"}
              theme={theme}
              badge={language.toUpperCase()}
              badgeColor={theme.tint}
              onPress={() => {
                const next = language === "en" ? "ar" : "en";
                setLanguage(next as any);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="info"
              title={t("about")}
              subtitle="Version 1.0.0"
              theme={theme}
              onPress={() => {
                Alert.alert(
                  "Misr Cash Book",
                  "Version 1.0.0\n\nBuilt for Egyptian SMEs.\nOffline-first with cloud sync.\n\nEGP currency support with Arabic numeral input.",
                );
              }}
            />
          </View>
        </View>

        {pin && step === "idle" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              lock();
            }}
            style={({ pressed }) => [
              styles.lockBtn,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="lock" size={16} color={theme.tint} />
            <Text style={[styles.lockBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
              Lock App Now
            </Text>
          </Pressable>
        )}

        {user && (
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="log-out" size={18} color={theme.expense} />
            <Text style={[styles.logoutText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              Sign Out
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  theme,
  badge,
  badgeColor,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  theme: typeof Colors.dark;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.tint + "18" }]}>
        <Feather name={icon as any} size={18} color={theme.tint} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {title}
        </Text>
        <Text style={[styles.rowSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: (badgeColor || theme.tint) + "22" }]}>
          <Text style={[styles.badgeText, { color: badgeColor || theme.tint, fontFamily: "Inter_600SemiBold" }]}>
            {badge}
          </Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  scrollContent: { paddingTop: 16 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16 },
  profileEmail: { fontSize: 13, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15 },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11 },

  pinSetupBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  pinPrompt: { fontSize: 14, textAlign: "center" },
  pinInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 22,
    paddingVertical: 10,
    letterSpacing: 8,
  },
  errorTxt: { fontSize: 12, textAlign: "center" },
  pinBtnRow: { flexDirection: "row", gap: 10 },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  pinCancelTxt: { fontSize: 14 },
  pinConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pinConfirmTxt: { color: "#FFF", fontSize: 14 },

  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockBtnText: { fontSize: 15 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 16 },
});
