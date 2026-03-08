import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useApp, TransactionType } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { today, parseAmount, isValidDateStr } from "@/utils/format";

const INCOME_CATEGORIES = [
  "Sales", "Services", "Consulting", "Rent Received", "Investment", "Refund", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Inventory", "Salaries", "Rent", "Utilities", "Marketing", "Transport",
  "Maintenance", "Taxes", "Supplies", "Equipment", "Other Expense",
];

const PAYMENT_MODES = [
  { id: "cash", label: "Cash", icon: "dollar-sign" as const },
  { id: "instapay", label: "InstaPay", icon: "zap" as const },
  { id: "vodafone_cash", label: "Vodafone Cash", icon: "smartphone" as const },
  { id: "fawry", label: "Fawry", icon: "credit-card" as const },
  { id: "bank_transfer", label: "Bank Transfer", icon: "briefcase" as const },
  { id: "international", label: "International Transfer", icon: "globe" as const },
  { id: "cheque", label: "Cheque", icon: "file-text" as const },
  { id: "other", label: "Other", icon: "more-horizontal" as const },
];

function getPaymentModeLabel(id: string): string {
  return PAYMENT_MODES.find((m) => m.id === id)?.label || id;
}

export { PAYMENT_MODES, getPaymentModeLabel };

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addTransaction, updateTransaction, deleteTransaction, transactions } = useApp();
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
  const [paymentMode, setPaymentMode] = useState(editTx?.paymentMode ?? "cash");
  const [attachment, setAttachment] = useState(editTx?.attachment ?? "");
  const [showImagePreview, setShowImagePreview] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);
  const dateValid = useMemo(() => isValidDateStr(date), [date]);
  const isValid = useMemo(
    () => parsedAmount !== null && category.length > 0 && dateValid,
    [parsedAmount, category, dateValid]
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConfirmDelete = useCallback(() => {
    if (!editTx) return;
    deleteTransaction(editTx.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteConfirm(false);
    router.back();
  }, [editTx, deleteTransaction]);

  const handleSave = useCallback(() => {
    if (!isValid || parsedAmount === null) return;
    if (!dateValid) {
      Alert.alert("Invalid Date", "Please enter a date in YYYY-MM-DD format.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editTx) {
      updateTransaction(editTx.id, { type, amount: parsedAmount, category, note, date, paymentMode, attachment });
    } else {
      addTransaction({ type, amount: parsedAmount, category, note, date, paymentMode, attachment });
    }
    router.back();
  }, [isValid, parsedAmount, dateValid, type, category, note, date, paymentMode, attachment, editTx, addTransaction, updateTransaction]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachment(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setAttachment(asset.uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachment(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setAttachment(asset.uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment("");
    Haptics.selectionAsync();
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" accessibilityRole="button">
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {editTx ? "Edit Transaction" : "New Transaction"}
        </Text>
        <View style={styles.headerRight}>
          {editTx && (
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityLabel="Delete transaction"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Feather name="trash-2" size={20} color={theme.expense} />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            accessibilityLabel={editTx ? "Update transaction" : "Save transaction"}
            accessibilityRole="button"
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
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
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

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Payment Mode
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll} contentContainerStyle={styles.paymentScrollContent}>
            {PAYMENT_MODES.map((mode) => {
              const selected = paymentMode === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMode(mode.id);
                  }}
                  style={({ pressed }) => [
                    styles.paymentChip,
                    {
                      backgroundColor: selected ? theme.tint + "22" : theme.card,
                      borderColor: selected ? theme.tint + "88" : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  testID={`payment-mode-${mode.id}`}
                >
                  <Feather
                    name={mode.icon}
                    size={14}
                    color={selected ? theme.tint : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.paymentLabel,
                      {
                        color: selected ? theme.tint : theme.text,
                        fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

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

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Attachment (optional)
          </Text>
          {attachment ? (
            <View style={[styles.attachmentPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Pressable onPress={() => setShowImagePreview(true)} style={styles.attachmentThumb}>
                <Image source={{ uri: attachment }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
              <View style={styles.attachmentInfo}>
                <Feather name="paperclip" size={14} color={theme.tint} />
                <Text style={[styles.attachmentText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Receipt attached
                </Text>
              </View>
              <Pressable onPress={removeAttachment} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Feather name="x-circle" size={20} color={theme.expense} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.attachmentActions}>
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [
                  styles.attachBtn,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID="take-photo-btn"
              >
                <Feather name="camera" size={20} color={theme.tint} />
                <Text style={[styles.attachBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Take Photo
                </Text>
              </Pressable>
              <Pressable
                onPress={pickImage}
                style={({ pressed }) => [
                  styles.attachBtn,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID="pick-image-btn"
              >
                <Feather name="image" size={20} color={theme.tint} />
                <Text style={[styles.attachBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Upload File
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {showDeleteConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Delete Transaction
              </Text>
              <Text style={[styles.modalMsg, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Delete this {editTx?.category} entry? This cannot be undone.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setShowDeleteConfirm(false)}
                  style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.modalCancelTxt, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  style={({ pressed }) => [styles.modalDeleteBtn, { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 }]}
                  testID="confirm-delete-btn"
                >
                  <Text style={[styles.modalDeleteTxt, { fontFamily: "Inter_600SemiBold" }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {showImagePreview && attachment ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowImagePreview(false)}>
          <Pressable style={styles.imagePreviewOverlay} onPress={() => setShowImagePreview(false)}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: attachment }} style={styles.fullImage} resizeMode="contain" />
              <Pressable
                onPress={() => setShowImagePreview(false)}
                style={[styles.closePreviewBtn, { backgroundColor: theme.card }]}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
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
  headerRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
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
  paymentScroll: {
    marginHorizontal: -20,
  },
  paymentScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentLabel: { fontSize: 13 },
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
  attachmentActions: {
    flexDirection: "row",
    gap: 12,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed" as const,
  },
  attachBtnText: { fontSize: 14 },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbImage: {
    width: 48,
    height: 48,
  },
  attachmentInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachmentText: { fontSize: 14 },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "90%",
    height: "70%",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closePreviewBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, textAlign: "center" },
  modalMsg: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelTxt: { fontSize: 15 },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDeleteTxt: { color: "#FFF", fontSize: 15 },
});
