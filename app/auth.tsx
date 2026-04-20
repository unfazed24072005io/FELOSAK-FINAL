import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleSubmit = useCallback(async () => {
  setError("");
  if (!username.trim() || !password.trim()) {
    setError("Please fill in all fields");
    return;
  }
  if (mode === "register" && !displayName.trim()) {
    setError("Please enter a display name");
    return;
  }
  setLoading(true);
  try {
    if (mode === "login") {
      await login(username.trim(), password);
    } else {
      await register(username.trim(), password, displayName.trim());
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Check for redirect after login using AsyncStorage
    const redirectPath = await AsyncStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      await AsyncStorage.removeItem('redirectAfterLogin');
      router.push(redirectPath);
    } else {
      router.back();
    }
  } catch (e: any) {
    const msg = e.message || "Something went wrong";
    const cleanMsg = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
    try {
      const parsed = JSON.parse(cleanMsg);
      setError(parsed.message || cleanMsg);
    } catch {
      setError(cleanMsg);
    }
  } finally {
    setLoading(false);
  }
}, [mode, username, password, displayName, login, register]);

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
          {mode === "login" ? t("signInTitle") : t("signInCreateAccount")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.tint + "22" }]}>
            <Feather name="cloud" size={40} color={theme.tint} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Sign in to create cloud books and collaborate with your team
          </Text>
        </View>

        {mode === "register" && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {t("displayName")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary + "88"}
              autoCapitalize="words"
              testID="displayName-input"
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("email")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="email"
            placeholderTextColor={theme.textSecondary + "88"}
            autoCapitalize="none"
            autoCorrect={false}
            testID="username-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("password")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={theme.textSecondary + "88"}
            secureTextEntry
            testID="password-input"
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.expense + "22" }]}>
            <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: theme.tint,
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
          testID="auth-submit"
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>
              {mode === "login" ? t("signInTitle") : t("signInCreateAccount")}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          style={styles.toggleBtn}
        >
          <Text style={[styles.toggleText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text style={{ color: theme.tint, fontFamily: "Inter_600SemiBold" }}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
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
  scroll: { padding: 20, gap: 16 },
  iconContainer: { alignItems: "center", gap: 12, paddingVertical: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, paddingLeft: 4 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#FFF", fontSize: 16 },
  toggleBtn: { alignItems: "center", paddingVertical: 12 },
  toggleText: { fontSize: 14 },
});