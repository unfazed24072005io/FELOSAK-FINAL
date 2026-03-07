import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useApp, TransactionType } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { today } from "@/utils/format";

const INCOME_CATEGORIES = [
  "Sales", "Services", "Consulting", "Rent Received", "Investment", "Refund", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Inventory", "Salaries", "Rent", "Utilities", "Marketing", "Transport",
  "Maintenance", "Taxes", "Supplies", "Equipment", "Other Expense",
];

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addTransaction, updateTransaction, transactions } = useApp();
  const params = useLocalSearchParams<{ type?: string; editId?: string }>();

  const editTx = useMemo(
    () => (params.editId ? transactions.find((t) => t.id === params.editId) : null),
    [params.editId, transactions]
  );

  const [type, setType] = useState<TransactionType>(
    editTx?.type ?? (params.type === "expense" ? "expense" : "income")
  );
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : "");
  const [category, setCategory] = useState(editTx?.category ?? "");
  const [note, setNote] = useState(editTx?.note ?? "");
  const [date, setDate] = useState(editTx?.date ?? today());

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const isValid = useMemo(
    () => amount.length > 0 && parseFloat(amount) > 0 && category.length > 0,
    [amount, category]
  );

  const handleSave = useCallback(() => {
    if (!isValid) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editTx) {
      updateTransaction(editTx.id, { type, amount: parsedAmount, category, note, date });
    } else {
      addTransaction({ type, amount: parsedAmount, category, note, date });
    }
    router.back();
  }, [isValid, amount, type, category, note, date, editTx, addTransaction, updateTransaction]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Handle / Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {editTx ? "Edit Transaction" : "New Transaction"}
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
            {editTx ? "Update" : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Toggle */}
        <View
          style={[
            styles.typeToggle,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setType("income");
              setCategory("");
            }}
            style={[
              styles.typeBtn,
              type === "income" && {
                backgroundColor: theme.income + "22",
                borderColor: theme.income + "66",
              },
            ]}
          >
            <Feather
              name="trending-up"
              size={16}
              color={type === "income" ? theme.income : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: type === "income" ? theme.income : theme.textSecondary,
                  fontFamily: type === "income" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              Income
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setType("expense");
              setCategory("");
            }}
            style={[
              styles.typeBtn,
              type === "expense" && {
                backgroundColor: theme.expense + "22",
                borderColor: theme.expense + "66",
              },
            ]}
          >
            <Feather
              name="trending-down"
              size={16}
              color={type === "expense" ? theme.expense : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: type === "expense" ? theme.expense : theme.textSecondary,
                  fontFamily: type === "expense" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              Expense
            </Text>
          </Pressable>
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

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Category
          </Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory(cat);
                }}
                style={({ pressed }) => [
                  styles.catChip,
                  {
                    backgroundColor:
                      category === cat
                        ? type === "income"
                          ? theme.income + "22"
                          : theme.expense + "22"
                        : theme.card,
                    borderColor:
                      category === cat
                        ? type === "income"
                          ? theme.income + "88"
                          : theme.expense + "88"
                        : theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catChipTxt,
                    {
                      color:
                        category === cat
                          ? type === "income"
                            ? theme.income
                            : theme.expense
                          : theme.text,
                      fontFamily:
                        category === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Date
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
              value={date}
              onChangeText={setDate}
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
    gap: 0,
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
  amountInput: {
    flex: 1,
    fontSize: 32,
    paddingVertical: 12,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipTxt: { fontSize: 13 },
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
