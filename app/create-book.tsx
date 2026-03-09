import React, { useCallback, useState } from "react";
import {
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
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

export default function CreateBookScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { createBook } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCloud, setIsCloud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError(t("bookNameRequired"));
      return;
    }
    if (isCloud && !user) {
      setError("You need to sign in to create a cloud book");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createBook(name.trim(), description.trim(), isCloud);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to create book");
    } finally {
      setLoading(false);
    }
  }, [name, description, isCloud, user, createBook, t]);

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
          {t("newBook")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("bookName")}
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
            value={name}
            onChangeText={setName}
            placeholder="e.g. Shop Cash Book"
            placeholderTextColor={theme.textSecondary + "88"}
            testID="book-name-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Description (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this book for?"
            placeholderTextColor={theme.textSecondary + "88"}
            multiline
            numberOfLines={3}
            testID="book-desc-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("storageType")}
          </Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setIsCloud(false)}
              style={[
                styles.typeOption,
                {
                  backgroundColor: !isCloud ? theme.tint + "22" : theme.card,
                  borderColor: !isCloud ? theme.tint + "66" : theme.border,
                },
              ]}
            >
              <Feather name="smartphone" size={20} color={!isCloud ? theme.tint : theme.textSecondary} />
              <Text style={[styles.typeName, { color: !isCloud ? theme.tint : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("local")}
              </Text>
              <Text style={[styles.typeDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {t("storedOnDeviceOnly")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!user) {
                  router.push("/auth");
                  return;
                }
                setIsCloud(true);
              }}
              style={[
                styles.typeOption,
                {
                  backgroundColor: isCloud ? theme.income + "22" : theme.card,
                  borderColor: isCloud ? theme.income + "66" : theme.border,
                },
              ]}
            >
              <Feather name="cloud" size={20} color={isCloud ? theme.income : theme.textSecondary} />
              <Text style={[styles.typeName, { color: isCloud ? theme.income : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("cloud")}
              </Text>
              <Text style={[styles.typeDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {user ? t("syncedAndShareable") : t("signInRequired")}
              </Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.expense + "22" }]}>
            <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.cancelText, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              {t("cancel")}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            style={({ pressed }) => [
              styles.createBtn,
              {
                backgroundColor: theme.tint,
                opacity: pressed || loading ? 0.7 : 1,
              },
            ]}
            testID="create-book-submit"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.createText, { fontFamily: "Inter_600SemiBold" }]}>
                {t("save")}
              </Text>
            )}
          </Pressable>
        </View>
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
  scroll: { padding: 20, gap: 20 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, paddingLeft: 4 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  typeRow: { flexDirection: "row", gap: 12 },
  typeOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  typeName: { fontSize: 15 },
  typeDesc: { fontSize: 11, textAlign: "center" },
  errorBox: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: { fontSize: 16 },
  createBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  createText: { color: "#FFF", fontSize: 16 },
});
