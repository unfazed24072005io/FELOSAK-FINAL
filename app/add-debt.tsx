import React, { useCallback, useMemo, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { today } from "@/utils/format";

export default function AddDebtScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addDebt, updateDebt, debts } = useApp();
  const params = useLocalSearchParams<{ editId?: string }>();

  const editDebt = useMemo(
    () => (params.editId ? debts.find((d) => d.id === params.editId) : null),
    [params.editId, debts]
  );

  const [direction, setDirection] = useState<"owed_to_me" | "i_owe">(
    editDebt?.direction ?? "owed_to_me"
  );
  const [name, setName] = useState(editDebt?.name ?? "");
  const [amount, setAmount] = useState(editDebt ? String(editDebt.amount) : "");
  const [note, setNote] = useState(editDebt?.note ?? "");
  const [dueDate, setDueDate] = useState(editDebt?.dueDate ?? "");

  const isValid = useMemo(
    () => name.trim().length > 0 && amount.length > 0 && parseFloat(amount) > 0,
    [name, amount]
  );

  const handleSave = useCallback(() => {
    if (!isValid) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editDebt) {
      updateDebt(editDebt.id, {
        direction,
        name: name.trim(),
        amount: parsedAmount,
        note,
        dueDate,
      });
    } else {
      addDebt({
        direction,
        name: name.trim(),
        amount: parsedAmount,
        note,
        dueDate,
        settled: false,
      });
    }
    router.back();
  }, [isValid, direction, name, amount, note, dueDate, editDebt, addDebt, updateDebt]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {editDebt ? "Edit Entry" : "New AR/AP Entry"}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: isValid ? theme.tint : theme.tint + "44",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.saveBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
            {editDebt ? "Update" : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Direction Toggle */}
        <View
          style={[
            styles.typeToggle,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDirection("owed_to_me");
            }}
            style={[
              styles.typeBtn,
              direction === "owed_to_me" && {
                backgroundColor: theme.income + "22",
                borderColor: theme.income + "66",
              },
            ]}
          >
            <Feather
              name="arrow-down-left"
              size={16}
              color={direction === "owed_to_me" ? theme.income : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: direction === "owed_to_me" ? theme.income : theme.textSecondary,
                  fontFamily: direction === "owed_to_me" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              Owed to Me
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDirection("i_owe");
            }}
            style={[
              styles.typeBtn,
              direction === "i_owe" && {
                backgroundColor: theme.expense + "22",
                borderColor: theme.expense + "66",
              },
            ]}
          >
            <Feather
              name="arrow-up-right"
              size={16}
              color={direction === "i_owe" ? theme.expense : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: direction === "i_owe" ? theme.expense : theme.textSecondary,
                  fontFamily: direction === "i_owe" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              I Owe
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Name / Company
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="user" size={16} color={theme.textSecondary} />
            <TextInput
              style={[
                styles.inputText,
                { color: theme.text, fontFamily: "Inter_400Regular" },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter name..."
              placeholderTextColor={theme.textSecondary + "88"}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Amount (EGP)
          </Text>
          <View
            style={[
              styles.amountRow,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              style={[styles.egpSymbol, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
            >
              ج.م
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                { color: theme.text, fontFamily: "Inter_700Bold" },
              ]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Due Date (optional)
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <TextInput
              style={[
                styles.inputText,
                { color: theme.text, fontFamily: "Inter_400Regular" },
              ]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Note (optional)
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                height: 80,
                alignItems: "flex-start",
                paddingTop: 12,
              },
            ]}
          >
            <TextInput
              style={[
                styles.inputText,
                {
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                  flex: 1,
                  textAlignVertical: "top",
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor={theme.textSecondary + "88"}
              multiline
            />
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
  },
  headerTitle: { fontSize: 17 },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnTxt: { color: "#FFF", fontSize: 15 },
  scroll: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    margin: 4,
  },
  typeLabel: { fontSize: 15 },
  section: { gap: 10 },
  label: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  egpSymbol: { fontSize: 18 },
  amountInput: { flex: 1, fontSize: 32, paddingVertical: 12 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputText: { flex: 1, fontSize: 15 },
});
