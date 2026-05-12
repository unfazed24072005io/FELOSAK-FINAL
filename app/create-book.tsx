// app/create-book.tsx (FIXED VERSION)

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
  Alert,
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

// Available icons for cash books with emojis
const AVAILABLE_ICONS = [
  { emoji: "🏘️", name: "house", feather: "home" },
  { emoji: "💼", name: "briefcase", feather: "briefcase" },
  { emoji: "🏠", name: "home", feather: "home" },
  { emoji: "🚗", name: "car", feather: "car" },
  { emoji: "✈️", name: "travel", feather: "airplay" },
  { emoji: "🎯", name: "target", feather: "target" },
  { emoji: "📦", name: "package", feather: "package" },
  { emoji: "🛒", name: "cart", feather: "shopping-cart" },
];

export default function CreateBookScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { createBook, refreshBooks, isLoadingBooks } = useApp(); // Add refreshBooks and isLoadingBooks
  const { user } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCloud, setIsCloud] = useState(false); // false = Personal, true = Business
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleCreate = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      setError("Book name is required");
      return;
    }
    
    // Check for business book without user
    if (isCloud && !user) {
      Alert.alert(
        "Sign In Required",
        "You need to sign in to create a business book. Would you like to sign in now?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign In", 
            onPress: () => {
              router.dismiss();
              router.push("/auth");
            }
          }
        ]
      );
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      console.log("Creating book:", { name, description, isCloud, icon: selectedIcon.feather });
      
      // Create the book - this will automatically set it as active book in AppContext
      await createBook(name.trim(), description.trim(), isCloud);
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Refresh books list to ensure UI is up to date
      if (refreshBooks) {
        await refreshBooks();
      }
      
      // Small delay to ensure state updates are complete
      setTimeout(() => {
        // Dismiss all modals and navigate to tabs with a clean stack
        router.dismissAll();
        // Navigate to tabs (the active book will be shown automatically)
        router.replace("/(tabs)");
      }, 100);
      
    } catch (e: any) {
      console.error("Error creating book:", e);
      setError(e.message || "Failed to create book. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, description, isCloud, user, createBook, selectedIcon, refreshBooks]);

  // Handle back button properly
  const handleBack = useCallback(() => {
    // If loading, don't allow back navigation to prevent race conditions
    if (loading) return;
    
    // Simple back navigation
    router.back();
  }, [loading]);

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
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          disabled={loading}
        >
          <Feather name="arrow-left" size={24} color={loading ? theme.textSecondary : theme.text} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          Create New Book
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        {/* Book Name Field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Book Name *
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
            placeholder="Enter book name"
            placeholderTextColor={theme.textSecondary + "88"}
            testID="book-name-input"
            editable={!loading}
          />
        </View>

        {/* Description Field (Optional) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description for your book"
            placeholderTextColor={theme.textSecondary + "88"}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* Book Type Section */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Book Type
          </Text>
          
          {/* Type Selector Buttons */}
          <View style={styles.typeSelectorRow}>
            <Pressable
              onPress={() => {
                if (!user) {
                  Alert.alert(
                    "Sign In Required",
                    "Business books require an account for cloud sync. Create a personal book instead?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Create Personal", 
                        onPress: () => setIsCloud(false)
                      },
                      { 
                        text: "Sign In", 
                        onPress: () => {
                          router.dismiss();
                          router.push("/auth");
                        }
                      }
                    ]
                  );
                  return;
                }
                setIsCloud(true);
              }}
              style={[
                styles.typeSelectorBtn,
                {
                  backgroundColor: isCloud ? theme.tint + '10' : theme.card,
                  borderColor: isCloud ? theme.tint : theme.border,
                  borderWidth: isCloud ? 2 : 1,
                },
              ]}
              disabled={loading}
            >
              <Feather name="briefcase" size={20} color={isCloud ? theme.tint : theme.textSecondary} />
              <Text style={[
                styles.typeSelectorText, 
                { color: isCloud ? theme.tint : theme.text }
              ]}>
                Business
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setIsCloud(false)}
              style={[
                styles.typeSelectorBtn,
                {
                  backgroundColor: !isCloud ? theme.tint + '10' : theme.card,
                  borderColor: !isCloud ? theme.tint : theme.border,
                  borderWidth: !isCloud ? 2 : 1,
                },
              ]}
              disabled={loading}
            >
              <Feather name="user" size={20} color={!isCloud ? theme.tint : theme.textSecondary} />
              <Text style={[
                styles.typeSelectorText, 
                { color: !isCloud ? theme.tint : theme.text }
              ]}>
                Personal
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Choose Icon Section - 4x2 Grid */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Choose Icon
          </Text>
          <View style={styles.iconGrid}>
            {AVAILABLE_ICONS.map((icon, index) => (
              <Pressable
                key={index}
                onPress={() => !loading && setSelectedIcon(icon)}
                style={[
                  styles.iconOption,
                  {
                    backgroundColor: selectedIcon.emoji === icon.emoji ? theme.tint + '20' : theme.card,
                    borderColor: selectedIcon.emoji === icon.emoji ? theme.tint : theme.border,
                  },
                ]}
                disabled={loading}
              >
                <Text style={styles.iconEmoji}>{icon.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.expense + "22" }]}>
            <Feather name="alert-circle" size={16} color={theme.expense} />
            <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium", flex: 1 }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Info message for business books */}
        {isCloud && (
          <View style={[styles.infoBox, { backgroundColor: theme.tint + '10' }]}>
            <Feather name="cloud" size={16} color={theme.tint} />
            <Text style={[styles.infoText, { color: theme.tint, flex: 1 }]}>
              Business books are synced to the cloud and can be accessed from any device.
            </Text>
          </View>
        )}

        {/* Create Book Button */}
        <Pressable
          onPress={handleCreate}
          disabled={loading || !name.trim()}
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: (!name.trim() || loading) ? '#9CA3AF' : '#3B82F6',
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
          testID="create-book-submit"
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.createText, { fontFamily: "Inter_600SemiBold" }]}>
              Create Book
            </Text>
          )}
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
  headerTitle: { fontSize: 18 },
  scroll: { padding: 20, paddingBottom: 40, gap: 24 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, paddingLeft: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeSelectorBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
  },
  typeSelectorText: {
    fontSize: 15,
    fontWeight: "600",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  iconOption: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 32,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  infoBox: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: { fontSize: 13, textAlign: "left" },
  createBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createText: { color: "#FFF", fontSize: 16 },
});