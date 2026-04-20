import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatDate } from "@/utils/format";

type InvoiceStatus = "all" | "unpaid" | "paid" | "overdue" | "draft";
type Invoice = {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  dueDate?: string;
  createdAt: number;
};

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook, invoices: realInvoices, deleteInvoice } = useApp();  // ← CHANGE THIS LINE
  const { t, isAr } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  
  // Use realInvoices instead of converting from transactions
  const invoices = realInvoices;  // ← ADD THIS LINE

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Filter invoices based on selected status
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (activeFilter === "all") return invoices;
    return invoices.filter(inv => inv.status === activeFilter);
  }, [invoices, activeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return { total: 0, totalAmount: 0, unpaidAmount: 0, paidAmount: 0, overdueCount: 0 };
    }
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const unpaidAmount = invoices
      .filter(inv => inv.status === "unpaid" || inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const overdueCount = invoices.filter(inv => inv.status === "overdue").length;
    
    return { total, totalAmount, unpaidAmount, paidAmount, overdueCount };
  }, [invoices]);

  const handleDelete = useCallback((invoice: Invoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (invoiceToDelete) {
      deleteInvoice(invoiceToDelete.id);  // ← USE deleteInvoice FROM CONTEXT
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowDeleteModal(false);
    setInvoiceToDelete(null);
  }, [invoiceToDelete, deleteInvoice]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setInvoiceToDelete(null);
  }, []);

  const handleAddInvoice = useCallback(() => {
    router.push("/add-invoice");
  }, []);

  const renderItem = useCallback(({ item }: { item: Invoice }) => (
    <InvoiceCard
      invoice={item}
      theme={theme}
      onDelete={handleDelete}
      onEdit={() => router.push({ pathname: "/add-invoice", params: { editId: item.id } })}
      t={t}
      isAr={isAr}
    />
  ), [theme, handleDelete, t, isAr]);

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{isAr ? "الفواتير" : "Invoices"}</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="file-text" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{isAr ? "اختر دفتراً لعرض الفواتير" : "Select a book to view invoices"}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Add Button */}
      <View
        style={[
          styles.headerWhite,
          {
            marginTop: insets.top + 40,
          },
        ]}
      >
        <Text
          style={[
            styles.titleBlack,
            { fontFamily: "Inter_700Bold", color: "#000000" },
          ]}
        >
          {isAr ? "الفواتير" : "Invoices"}
        </Text>
        <Pressable
          onPress={handleAddInvoice}
          style={({ pressed }) => [
            styles.addBtnBlue,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 100 },
          (!filteredInvoices || filteredInvoices.length === 0) && styles.emptyContainer,
        ]}
        ListHeaderComponent={
          <>
            {/* Stats Cards */}
            <View style={styles.summaryContainer}>
              {/* Total Invoices Card */}
              <View style={styles.summaryCardWrapper}>
                <LinearGradient
                  colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryCardGradient}
                >
                  <View style={styles.summaryCardRow}>
                    <View style={styles.summaryLeft}>
                      <Text style={[styles.summaryLabel, { color: "#1E40AF" }]}>{isAr ? "إجمالي الفواتير" : "Total Invoices"}</Text>
                      <Text style={[styles.summaryAmount, { color: "#1E3A8A" }]}>
                        {stats.total}
                      </Text>
                      <Text style={[styles.summarySub, { color: "#2563EB" }]}>
                        {formatEGP(stats.totalAmount)}
                      </Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Svg width="60" height="60" viewBox="0 0 60 60">
                        <Defs>
                          <SvgLinearGradient id="blueGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                            <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
                          </SvgLinearGradient>
                        </Defs>
                        <Path
                          d="M10,40 Q20,25 30,30 T50,20"
                          stroke="#3B82F6"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <Path
                          d="M48,17 L55,23 L51,20 L47,26"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Unpaid Card */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(activeFilter === "unpaid" ? "all" : "unpaid");
                }}
                style={[
                  styles.summaryCardWrapper,
                  activeFilter === "unpaid" && styles.activeCard
                ]}
              >
                <LinearGradient
                  colors={activeFilter === "unpaid" ? ["#FEF3C7", "#FDE68A", "#FCD34D"] : ["#FFFBEB", "#FEF3C7", "#FDE68A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryCardGradient}
                >
                  <View style={styles.summaryCardRow}>
                    <View style={styles.summaryLeft}>
                      <Text style={[styles.summaryLabel, { color: "#92400E" }]}>{isAr ? "غير مدفوعة" : "Unpaid"}</Text>
                      <Text style={[styles.summaryAmount, { color: "#78350F" }]}>
                        {formatEGP(stats.unpaidAmount)}
                      </Text>
                      <Text style={[styles.summarySub, { color: "#D97706" }]}>
                        {invoices?.filter(i => i.status === "unpaid").length || 0} {isAr ? "فواتير" : "invoices"}
                      </Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Svg width="60" height="60" viewBox="0 0 60 60">
                        <Defs>
                          <SvgLinearGradient id="orangeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                            <Stop offset="0%" stopColor="#D97706" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
                          </SvgLinearGradient>
                        </Defs>
                        <Path
                          d="M5,45 Q15,35 20,40 T35,30 T45,20 T55,10"
                          stroke="#F59E0B"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </Svg>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Paid Card */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(activeFilter === "paid" ? "all" : "paid");
                }}
                style={[
                  styles.summaryCardWrapper,
                  activeFilter === "paid" && styles.activeCard
                ]}
              >
                <LinearGradient
                  colors={activeFilter === "paid" ? ["#D1FAE5", "#A7F3D0", "#6EE7B7"] : ["#ECFDF5", "#D1FAE5", "#A7F3D0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryCardGradient}
                >
                  <View style={styles.summaryCardRow}>
                    <View style={styles.summaryLeft}>
                      <Text style={[styles.summaryLabel, { color: "#065F46" }]}>{isAr ? "مدفوعة" : "Paid"}</Text>
                      <Text style={[styles.summaryAmount, { color: "#064E3B" }]}>
                        {formatEGP(stats.paidAmount)}
                      </Text>
                      <Text style={[styles.summarySub, { color: "#059669" }]}>
                        {invoices?.filter(i => i.status === "paid").length || 0} {isAr ? "فواتير" : "invoices"}
                      </Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Svg width="60" height="60" viewBox="0 0 60 60">
                        <Defs>
                          <SvgLinearGradient id="greenGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                            <Stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                          </SvgLinearGradient>
                        </Defs>
                        <Path
                          d="M15,35 L25,45 L45,20"
                          stroke="#10B981"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Overdue Card */}
              {stats.overdueCount > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveFilter(activeFilter === "overdue" ? "all" : "overdue");
                  }}
                  style={[
                    styles.summaryCardWrapper,
                    activeFilter === "overdue" && styles.activeCard
                  ]}
                >
                  <LinearGradient
                    colors={activeFilter === "overdue" ? ["#FEE2E2", "#FECACA", "#FCA5A5"] : ["#FEF2F2", "#FEE2E2", "#FECACA"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.summaryCardGradient}
                  >
                    <View style={styles.summaryCardRow}>
                      <View style={styles.summaryLeft}>
                        <Text style={[styles.summaryLabel, { color: "#991B1B" }]}>{isAr ? "متأخرة" : "Overdue"}</Text>
                        <Text style={[styles.summaryAmount, { color: "#7F1D1D" }]}>
                          {stats.overdueCount}
                        </Text>
                        <Text style={[styles.summarySub, { color: "#DC2626" }]}>
                          {isAr ? "فواتير متأخرة" : "overdue invoices"}
                        </Text>
                      </View>
                      <View style={styles.summaryRight}>
                        <Svg width="60" height="60" viewBox="0 0 60 60">
                          <Defs>
                            <SvgLinearGradient id="redGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                              <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                              <Stop offset="100%" stopColor="#DC2626" stopOpacity="0.4" />
                            </SvgLinearGradient>
                          </Defs>
                          <Path
                            d="M30,15 L30,35 M30,45 L30,43"
                            stroke="#EF4444"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </Svg>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            </View>

            {/* Filter Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterBar} 
              contentContainerStyle={styles.filterBarContent}
            >
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter("all");
                }}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: activeFilter === "all" ? theme.tint + "22" : theme.card,
                    borderColor: activeFilter === "all" ? theme.tint : theme.border 
                  }
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === "all" ? theme.tint : theme.text }]}>
                  {isAr ? "الكل" : "All"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter("unpaid");
                }}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: activeFilter === "unpaid" ? "#F59E0B" + "22" : theme.card,
                    borderColor: activeFilter === "unpaid" ? "#F59E0B" : theme.border 
                  }
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === "unpaid" ? "#F59E0B" : theme.text }]}>
                  {isAr ? "غير مدفوعة" : "Unpaid"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter("paid");
                }}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: activeFilter === "paid" ? "#10B981" + "22" : theme.card,
                    borderColor: activeFilter === "paid" ? "#10B981" : theme.border 
                  }
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === "paid" ? "#10B981" : theme.text }]}>
                  {isAr ? "مدفوعة" : "Paid"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter("overdue");
                }}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: activeFilter === "overdue" ? "#EF4444" + "22" : theme.card,
                    borderColor: activeFilter === "overdue" ? "#EF4444" : theme.border 
                  }
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === "overdue" ? "#EF4444" : theme.text }]}>
                  {isAr ? "متأخرة" : "Overdue"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter("draft");
                }}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: activeFilter === "draft" ? "#6B7280" + "22" : theme.card,
                    borderColor: activeFilter === "draft" ? "#6B7280" : theme.border 
                  }
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === "draft" ? "#6B7280" : theme.text }]}>
                  {isAr ? "مسودة" : "Draft"}
                </Text>
              </Pressable>
            </ScrollView>

            {filteredInvoices && filteredInvoices.length > 0 && (
              <Text
                style={[
                  styles.subheading,
                  { color: theme.textSecondary, fontFamily: "Inter_500Medium" },
                ]}
              >
                {isAr ? "قائمة الفواتير" : "Invoice List"} ({filteredInvoices.length})
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={44} color={theme.textSecondary} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              {isAr ? "لا توجد فواتير" : "No invoices found"}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {isAr ? "حذف الفاتورة" : "Delete Invoice"}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {invoiceToDelete 
                ? (isAr 
                    ? `هل أنت متأكد من حذف فاتورة ${invoiceToDelete.number}؟`
                    : `Are you sure you want to delete invoice ${invoiceToDelete.number}?`)
                : ""}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCancelDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                  {isAr ? "حذف" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Invoice Card Component (same as before)
// Invoice Card Component (with Edit and Delete buttons)
function InvoiceCard({
  invoice,
  theme,
  onDelete,
  onEdit,
  t,
  isAr,
}: {
  invoice: Invoice;
  theme: typeof Colors.dark;
  onDelete: (inv: Invoice) => void;
  onEdit: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
  isAr: boolean;
}) {
  const statusColor = (() => {
    switch (invoice.status) {
      case "paid": return theme.income;
      case "unpaid": return "#F59E0B";
      case "overdue": return theme.expense;
      case "draft": return theme.textSecondary;
      default: return theme.textSecondary;
    }
  })();

  const statusLabel = (() => {
    if (isAr) {
      switch (invoice.status) {
        case "paid": return "مدفوعة";
        case "unpaid": return "غير مدفوعة";
        case "overdue": return "متأخرة";
        case "draft": return "مسودة";
        default: return invoice.status;
      }
    }
    return invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
  })();

  const statusBg = (() => {
    switch (invoice.status) {
      case "paid": return theme.income + "15";
      case "unpaid": return "#F59E0B" + "15";
      case "overdue": return theme.expense + "15";
      case "draft": return theme.textSecondary + "15";
      default: return theme.card;
    }
  })();

  const isOverdue = invoice.status === "overdue";

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.invoiceCard,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.invoiceAvatar, { backgroundColor: statusColor + "22" }]}>
        <Feather name="file-text" size={22} color={statusColor} />
      </View>
      <View style={styles.invoiceContent}>
        <View style={styles.invoiceTopRow}>
          <Text
            style={[
              styles.invoiceNumber,
              {
                color: theme.text,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {invoice.number}
          </Text>
          <Text
            style={[
              styles.invoiceAmount,
              { color: statusColor, fontFamily: "Inter_700Bold" },
            ]}
          >
            {formatEGP(invoice.amount)}
          </Text>
        </View>
        <Text
          style={[
            styles.invoiceCustomer,
            { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
          ]}
        >
          {invoice.customer}
        </Text>
        
        {/* Action Buttons - Edit (Grey) & Delete (Red) */}
        <View style={styles.actionButtons}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.editBtn,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather name="edit-2" size={14} color="#6B7280" />
            <Text style={[styles.actionBtnText, { color: "#6B7280" }]}>
              {isAr ? "تعديل" : "Edit"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(invoice)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather name="trash-2" size={14} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>
              {isAr ? "حذف" : "Delete"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.invoiceBottomRow}>
          {invoice.dueDate ? (
            <View style={styles.dueDateRow}>
              <Feather
                name="calendar"
                size={11}
                color={isOverdue ? theme.expense : theme.textSecondary}
              />
              <Text
                style={[
                  styles.dueDate,
                  {
                    color: isOverdue ? theme.expense : theme.textSecondary,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {isOverdue ? "Overdue · " : "Due "}
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor, fontFamily: "Inter_500Medium" }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  actionButtons: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 12,
  marginBottom: 8,
},
actionBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
},
editBtn: {
  backgroundColor: "#F3F4F6",
},
deleteBtn: {
  backgroundColor: "#FEE2E2",
},
actionBtnText: {
  fontSize: 11,
  fontFamily: "Inter_500Medium",
},
  container: { flex: 1 },
  headerWhite: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleBlack: {
    fontSize: 28,
    color: "#000000",
  },
  addBtnBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  activeCard: {
    transform: [{ scale: 1.02 }],
  },
  summaryCardGradient: {
    borderRadius: 20,
    padding: 18,
  },
  summaryCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLeft: {
    flex: 1,
  },
  summaryRight: {
    width: 60,
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 12,
  },
  filterBar: {
    paddingVertical: 8,
  },
  filterBarContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: -8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },
  emptyContainer: { flex: 1 },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyText: { fontSize: 15 },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 200,
  },
  emptyBtnTxt: { color: "#FFF", fontSize: 15 },
  subheading: { fontSize: 13, marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  separator: { height: StyleSheet.hairlineWidth },
  invoiceCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  invoiceAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceContent: { flex: 1 },
  invoiceTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  invoiceNumber: { fontSize: 15, flex: 1, marginRight: 8 },
  invoiceAmount: { fontSize: 15 },
  invoiceCustomer: { fontSize: 13, marginBottom: 6 },
  invoiceBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dueDate: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
  },
});