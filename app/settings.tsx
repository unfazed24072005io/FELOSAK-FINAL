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
import Colors from "@/constants/colors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { pin, setPin, lock } = useApp();

  const [step, setStep] = useState<"idle" | "enter" | "confirm">("idle");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyPin, setVerifyPin] = useState("");
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

  const handleLockNow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lock();
  }, [lock]);

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
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          Settings
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 40 },
        ]}
      >
        {/* Security Section */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
          >
            SECURITY
          </Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* PIN Status */}
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.tint + "22" }]}>
                <Feather name="lock" size={16} color={theme.tint} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  PIN Lock
                </Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {pin ? "Enabled" : "Disabled"}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: pin ? theme.income + "22" : theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.badgeTxt,
                    {
                      color: pin ? theme.income : theme.textSecondary,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {pin ? "ON" : "OFF"}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* PIN Setup */}
            {step !== "idle" ? (
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
                  placeholder="••••"
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
            ) : (
              <Pressable
                onPress={handleSetPin}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: theme.tint + "22" }]}>
                  <Feather name="edit-2" size={16} color={theme.tint} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                    {pin ? "Change PIN" : "Set PIN"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}

            {pin && step === "idle" && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Pressable
                  onPress={handleLockNow}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.tint + "22" }]}>
                    <Feather name="lock" size={16} color={theme.tint} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                      Lock Now
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Pressable
                  onPress={handleRemovePin}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.expense + "22" }]}>
                    <Feather name="unlock" size={16} color={theme.expense} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
                      Remove PIN
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
          >
            ABOUT
          </Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.tint + "22" }]}>
                <Feather name="info" size={16} color={theme.tint} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Misr Cash Book
                </Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Version 1.0.0 · Made for Egyptian SMEs
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  scroll: { padding: 20, gap: 24 },
  sectionGroup: { gap: 8 },
  sectionHeader: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, paddingLeft: 4 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
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
  rowSub: { fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTxt: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  pinSetupBox: {
    padding: 16,
    gap: 12,
  },
  pinPrompt: { fontSize: 15, textAlign: "center" },
  pinInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 24,
    paddingVertical: 12,
    letterSpacing: 8,
  },
  errorTxt: { fontSize: 13, textAlign: "center" },
  pinBtnRow: { flexDirection: "row", gap: 10 },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  pinCancelTxt: { fontSize: 15 },
  pinConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  pinConfirmTxt: { color: "#FFF", fontSize: 15 },
});
