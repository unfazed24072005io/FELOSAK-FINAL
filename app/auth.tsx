// app/auth.tsx
import React, { useCallback, useState } from "react";
import { useBookMode } from "@/context/BookModeContext";
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
import Colors from "@/constants/colors";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { login, loginWithBookAccess } = useAuth();
  const { enterBookMode } = useBookMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bookPassword, setBookPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginMode, setLoginMode] = useState<"regular" | "book">("regular");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Regular login - sees ALL books
const handleRegularLogin = useCallback(async () => {
  setError("");
  if (!email.trim() || !password.trim()) {
    setError("Please fill in all fields");
    return;
  }
  setLoading(true);
  try {
    await login(email.trim(), password);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Pass a parameter to indicate regular access mode
    router.replace({
      pathname: "/(tabs)",
      params: { accessMode: "regular" }
    });
  } catch (e: any) {
    const msg = e.message || "Something went wrong";
    const cleanMsg = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
    setError(cleanMsg);
  } finally {
    setLoading(false);
  }
}, [email, password, login]);

  const handleBookAccessLogin = useCallback(async () => {
  setError("");
  if (!email.trim()) {
    setError("Please enter your email");
    return;
  }
  if (!bookPassword.trim()) {
    setError("Please enter the book password");
    return;
  }
  
  setLoading(true);
  try {
    const bookAccess = await loginWithBookAccess(email.trim(), bookPassword.trim());
    
    if (bookAccess) {
      // ADD THIS - Store book mode state before navigating
      await enterBookMode(bookPassword.trim(), bookAccess.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    }
  } catch (e: any) {
    const msg = e.message || "Invalid book password or access denied";
    const cleanMsg = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
    setError(cleanMsg);
  } finally {
    setLoading(false);
  }
}, [email, bookPassword, loginWithBookAccess, enterBookMode]); // ADD enterBookMode to dependencies

  const handleSignUp = () => {
    console.log("🔵 SIGN UP CLICKED - Navigating to onboarding");
    setTimeout(() => {
      router.push("/onboarding");
    }, 100);
  };

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
          {loginMode === "regular" ? "Sign In" : "Book Access"}
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
            <Feather name={loginMode === "regular" ? "users" : "lock"} size={40} color={theme.tint} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {loginMode === "regular" 
              ? "Sign in to access your cloud books and collaborate with your team"
              : "Enter a book password to access a specific book"}
          </Text>
        </View>

        {/* Mode Toggle */}
<View style={styles.modeToggle}>
  <Pressable
    onPress={() => {
      setLoginMode("regular");
      setError("");
      setPassword("");
      setBookPassword("");
    }}
    style={[
      styles.modeOption,
      loginMode === "regular" && { backgroundColor: theme.tint + "20", borderColor: theme.tint },
      { borderColor: theme.border }
    ]}
  >
    <Feather name="users" size={16} color={loginMode === "regular" ? theme.tint : theme.textSecondary} />
    <Text 
      style={[
        styles.modeText, 
        { 
          color: loginMode === "regular" ? theme.tint : theme.textSecondary,
          textAlign: "center",
          flexShrink: 1,
        }
      ]}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      Regular Login
    </Text>
  </Pressable>
  <Pressable
    onPress={() => {
      setLoginMode("book");
      setError("");
      setPassword("");
      setBookPassword("");
    }}
    style={[
      styles.modeOption,
      loginMode === "book" && { backgroundColor: theme.tint + "20", borderColor: theme.tint },
      { borderColor: theme.border }
    ]}
  >
    <Feather name="key" size={16} color={loginMode === "book" ? theme.tint : theme.textSecondary} />
    <Text 
      style={[
        styles.modeText, 
        { 
          color: loginMode === "book" ? theme.tint : theme.textSecondary,
          textAlign: "center",
          flexShrink: 1,
        }
      ]}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      Book Password Access
    </Text>
  </Pressable>
</View>

        {/* Email Field (Common for both modes) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Email *
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
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={theme.textSecondary + "88"}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        {/* Regular Login Password Field */}
        {loginMode === "regular" && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Password *
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
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary + "88"}
              secureTextEntry
            />
          </View>
        )}

        {/* Book Access Password Field */}
        {loginMode === "book" && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Book Password *
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
              value={bookPassword}
              onChangeText={setBookPassword}
              placeholder="Enter the book's password (e.g., sursurss)"
              placeholderTextColor={theme.textSecondary + "88"}
              autoCapitalize="none"
            />
            <Text style={[styles.hintText, { color: theme.textSecondary + "88", fontFamily: "Inter_400Regular" }]}>
              ⚡ Using your email + book password will give you access to ONLY that specific book
            </Text>
          </View>
        )}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.expense + "22" }]}>
            <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={loginMode === "regular" ? handleRegularLogin : handleBookAccessLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: theme.tint,
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>
              {loginMode === "regular" ? "Sign In" : "Access Book"}
            </Text>
          )}
        </Pressable>

        {loginMode === "regular" && (
          <Pressable onPress={handleSignUp} style={styles.toggleBtn}>
            <Text style={[styles.toggleText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Don't have an account?{" "}
              <Text style={{ color: theme.tint, fontFamily: "Inter_600SemiBold" }}>
                Sign Up
              </Text>
            </Text>
          </Pressable>
        )}

        {loginMode === "book" && (
          <Pressable 
            onPress={() => setLoginMode("regular")} 
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
              ← Back to Regular Login
            </Text>
          </Pressable>
        )}
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
  modeToggle: {
  flexDirection: "row",
  gap: 8,  // Reduced from 12 to give more space
  marginVertical: 8,
},
modeOption: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,  // Reduced from 8
  paddingVertical: 10,
  paddingHorizontal: 8,  // Added horizontal padding
  borderRadius: 12,
  borderWidth: 1,
  minHeight: 60,  // Added minimum height
},
modeText: {
  fontSize: 12,  // Reduced from 13
  fontFamily: "Inter_500Medium",
  flexShrink: 1,  // Added to allow text to shrink
},
  hintText: {
    fontSize: 11,
    marginTop: 4,
    paddingLeft: 4,
  },
});