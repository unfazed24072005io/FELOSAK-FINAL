import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

type InvoiceStatus = "draft" | "unpaid" | "paid" | "overdue";  // ← ADDED "overdue"

export default function AddInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook, addInvoice, updateInvoice, invoices } = useApp();
  const { t, isAr } = useLanguage();
  const params = useLocalSearchParams();
  const editId = params.editId as string;

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 20 : 10);

  // Load invoice data for editing
  useEffect(() => {
    if (editId && invoices) {
      const invoiceToEdit = invoices.find(inv => inv.id === editId);
      if (invoiceToEdit) {
        setInvoiceNumber(invoiceToEdit.number);
        setCustomerName(invoiceToEdit.customerName);
        setAmount(invoiceToEdit.amount.toString());
        setDueDate(invoiceToEdit.dueDate || "");
        setStatus(invoiceToEdit.status as InvoiceStatus);
        setNote(invoiceToEdit.notes || "");
      }
    }
  }, [editId, invoices]);

  // Auto-set status to overdue if due date is past and not paid
  useEffect(() => {
    if (dueDate && status !== 'paid') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateObj = new Date(dueDate);
      dueDateObj.setHours(0, 0, 0, 0);
      
      if (dueDateObj < today && status !== 'overdue') {
        setStatus('overdue');
      } else if (dueDateObj >= today && status === 'overdue') {
        setStatus('unpaid');
      }
    }
  }, [dueDate]);

  const handleSave = async () => {
    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter customer name");
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (!activeBook) {
      Alert.alert("Error", "No active book selected");
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        number: invoiceNumber.trim() || `INV-${Date.now()}`,
        customerId: "",
        customerName: customerName.trim(),
        amount: parseFloat(amount),
        status: status,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        items: [],
        notes: note,
      };

      if (editId) {
        await updateInvoice(editId, invoiceData);
      } else {
        await addInvoice(invoiceData);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {editId ? (isAr ? "تعديل فاتورة" : "Edit Invoice") : (isAr ? "فاتورة جديدة" : "New Invoice")}
        </Text>
        <Pressable onPress={handleSave} disabled={loading} hitSlop={8}>
          <Text style={[styles.saveText, { color: theme.tint, fontFamily: "Inter_600SemiBold", opacity: loading ? 0.5 : 1 }]}>
            {loading ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: 40 }]}>
        {/* Invoice Number */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "رقم الفاتورة" : "Invoice Number"}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={isAr ? "مثال: INV-001" : "e.g., INV-001"}
            placeholderTextColor={theme.textSecondary}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
          />
        </View>

        {/* Customer Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "اسم العميل" : "Customer Name"} *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={isAr ? "أدخل اسم العميل" : "Enter customer name"}
            placeholderTextColor={theme.textSecondary}
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "المبلغ" : "Amount"} *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        {/* Due Date */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "تاريخ الاستحقاق" : "Due Date"}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            value={dueDate}
            onChangeText={setDueDate}
          />
        </View>

        {/* Status - NOW WITH OVERDUE OPTION */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "الحالة" : "Status"}
          </Text>
          <View style={styles.statusRow}>
            <Pressable
              onPress={() => setStatus("draft")}
              style={[
                styles.statusOption,
                {
                  backgroundColor: status === "draft" ? "#6B7280" + "22" : theme.card,
                  borderColor: status === "draft" ? "#6B7280" : theme.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: status === "draft" ? "#6B7280" : theme.text }]}>
                {isAr ? "مسودة" : "Draft"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus("unpaid")}
              style={[
                styles.statusOption,
                {
                  backgroundColor: status === "unpaid" ? "#F59E0B" + "22" : theme.card,
                  borderColor: status === "unpaid" ? "#F59E0B" : theme.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: status === "unpaid" ? "#F59E0B" : theme.text }]}>
                {isAr ? "غير مدفوعة" : "Unpaid"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus("paid")}
              style={[
                styles.statusOption,
                {
                  backgroundColor: status === "paid" ? "#10B981" + "22" : theme.card,
                  borderColor: status === "paid" ? "#10B981" : theme.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: status === "paid" ? "#10B981" : theme.text }]}>
                {isAr ? "مدفوعة" : "Paid"}
              </Text>
            </Pressable>
            {/* ← ADDED OVERDUE OPTION */}
            <Pressable
              onPress={() => setStatus("overdue")}
              style={[
                styles.statusOption,
                {
                  backgroundColor: status === "overdue" ? "#EF4444" + "22" : theme.card,
                  borderColor: status === "overdue" ? "#EF4444" : theme.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: status === "overdue" ? "#EF4444" : theme.text }]}>
                {isAr ? "متأخرة" : "Overdue"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isAr ? "ملاحظة" : "Note"}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={isAr ? "أضف ملاحظة (اختياري)" : "Add a note (optional)"}
            placeholderTextColor={theme.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
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
  saveText: { fontSize: 16 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, paddingLeft: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusOption: {
    flex: 1,
    minWidth: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});