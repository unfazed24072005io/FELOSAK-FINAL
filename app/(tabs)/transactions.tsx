import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Transaction } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatDate } from "@/utils/format";
import { getPaymentModeLabel } from "@/app/add-transaction";

type Filter = "all" | "income" | "expense";

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { transactions, deleteTransaction, activeBook } = useApp();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const handleDelete = useCallback(
    (tx: Transaction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTxToDelete(tx);
      setShowDeleteModal(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (txToDelete) {
      deleteTransaction(txToDelete.id);
    }
    setShowDeleteModal(false);
    setTxToDelete(null);
  }, [txToDelete, deleteTransaction]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setTxToDelete(null);
  }, []);

  const handleEdit = useCallback((tx: Transaction) => {
    router.push({ pathname: "/add-transaction", params: { editId: tx.id } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TxItem
        tx={item}
        theme={theme}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [theme, handleEdit, handleDelete]
  );

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("transactions")}</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("selectBookTransactions")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: theme.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          {t("transactions")}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-transaction");
          }}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: theme.tint,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="plus" size={18} color="#FFF" />
        </Pressable>
      </View>

      <View
        style={[
          styles.filterRow,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        {(["all", "income", "expense"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f);
            }}
            style={[
              styles.filterTab,
              filter === f && { borderBottomColor: theme.tint, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                {
                  color:
                    filter === f
                      ? theme.tint
                      : theme.textSecondary,
                  fontFamily:
                    filter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {f === "all" ? t("all") : f === "income" ? t("income") : t("expense")}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={!!filtered.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 100 },
          !filtered.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="inbox" size={44} color={theme.textSecondary} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              {t("noEntriesFound")}
            </Text>
            <Pressable
              onPress={() => router.push("/add-transaction")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text
                style={[styles.emptyBtnTxt, { fontFamily: "Inter_600SemiBold" }]}
              >
                Add Transaction
              </Text>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#0A1F15" }]}>
            <Text style={[styles.modalTitle, { color: "#C9A84C", fontFamily: "Inter_700Bold" }]}>
              {t("confirmDelete")}
            </Text>
            <Text style={[styles.modalMessage, { color: "#E0E0E0", fontFamily: "Inter_400Regular" }]}>
              {txToDelete
                ? `${t("delete")} "${txToDelete.category}" — ${formatEGP(txToDelete.amount)}?`
                : t("confirmDeleteMessage")}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCancelDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: "#163428", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#C9A84C", fontFamily: "Inter_600SemiBold" }]}>
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                testID="confirm-delete-btn"
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                  {t("delete")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TxItem({
  tx,
  theme,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  theme: typeof Colors.dark;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const isIncome = tx.type === "income";

  return (
    <Pressable
      onPress={() => onEdit(tx)}
      onLongPress={() => onDelete(tx)}
      style={({ pressed }) => [
        styles.txItem,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View
        style={[
          styles.txIcon,
          {
            backgroundColor: isIncome
              ? theme.income + "22"
              : theme.expense + "22",
          },
        ]}
      >
        <Feather
          name={isIncome ? "trending-up" : "trending-down"}
          size={18}
          color={isIncome ? theme.income : theme.expense}
        />
      </View>
      <View style={styles.txContent}>
        <View style={styles.txCatRow}>
          <Text
            style={[styles.txCat, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={1}
          >
            {tx.category}
          </Text>
          {tx.attachment ? (
            <Feather name="paperclip" size={12} color={theme.textSecondary} />
          ) : null}
        </View>
        <View style={styles.txMeta}>
          <Text
            style={[styles.txDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
          >
            {formatDate(tx.date)}
          </Text>
          {tx.paymentMode && tx.paymentMode !== "cash" ? (
            <>
              <Text style={[styles.dot, { color: theme.textSecondary }]}>·</Text>
              <Text
                style={[styles.txPayMode, { color: theme.tint, fontFamily: "Inter_500Medium" }]}
                numberOfLines={1}
              >
                {getPaymentModeLabel(tx.paymentMode)}
              </Text>
            </>
          ) : null}
          {tx.note ? (
            <>
              <Text style={[styles.dot, { color: theme.textSecondary }]}>·</Text>
              <Text
                style={[styles.txNote, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                numberOfLines={1}
              >
                {tx.note}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmt,
            {
              color: isIncome ? theme.income : theme.expense,
              fontFamily: "Inter_700Bold",
            },
          ]}
        >
          {isIncome ? "+" : "-"}{formatEGP(tx.amount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterLabel: { fontSize: 15 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  emptyContainer: { flex: 1 },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyText: { fontSize: 15 },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnTxt: { color: "#FFF", fontSize: 15 },
  separator: { height: StyleSheet.hairlineWidth },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txContent: { flex: 1 },
  txCatRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txCat: { fontSize: 15, marginBottom: 3 },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  txDate: { fontSize: 12 },
  txPayMode: { fontSize: 12, flexShrink: 1 },
  dot: { fontSize: 12 },
  txNote: { fontSize: 12, flexShrink: 1 },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontSize: 15 },
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
