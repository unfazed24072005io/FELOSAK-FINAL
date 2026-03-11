import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Debt } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatDate } from "@/utils/format";

type TabDir = "owed_to_me" | "i_owe";

export default function DebtorsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { debts, deleteDebt, updateDebt, activeBook } = useApp();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabDir>("owed_to_me");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(
    () => debts.filter((d) => d.direction === activeTab && !d.settled),
    [debts, activeTab]
  );

  const settled = useMemo(
    () => debts.filter((d) => d.direction === activeTab && d.settled),
    [debts, activeTab]
  );

  const totalOwedToMe = useMemo(
    () =>
      debts
        .filter((d) => d.direction === "owed_to_me" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const totalIOwe = useMemo(
    () =>
      debts
        .filter((d) => d.direction === "i_owe" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const handleSettle = useCallback(
    (debt: Debt) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateDebt(debt.id, { settled: true });
    },
    [updateDebt]
  );

  const handleDelete = useCallback(
    (debt: Debt) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setDebtToDelete(debt);
      setShowDeleteModal(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (debtToDelete) {
      deleteDebt(debtToDelete.id);
    }
    setShowDeleteModal(false);
    setDebtToDelete(null);
  }, [debtToDelete, deleteDebt]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setDebtToDelete(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtCard
        debt={item}
        theme={theme}
        onSettle={handleSettle}
        onDelete={handleDelete}
        onEdit={() =>
          router.push({ pathname: "/add-debt", params: { editId: item.id } })
        }
        t={t}
      />
    ),
    [theme, handleSettle, handleDelete, t]
  );

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("arAp")}</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("selectBookDebts")}</Text>
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
          {t("arAp")}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-debt");
          }}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color="#FFF" />
        </Pressable>
      </View>

      <View style={[styles.summaryRow, { paddingHorizontal: 20, paddingVertical: 14 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("owed_to_me");
          }}
          style={[
            styles.summaryCard,
            {
              backgroundColor:
                activeTab === "owed_to_me"
                  ? theme.income + "22"
                  : theme.card,
              borderColor:
                activeTab === "owed_to_me"
                  ? theme.income + "66"
                  : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryLabel,
              {
                color: theme.income,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            {t("owedToMe")}
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              { color: theme.income, fontFamily: "Inter_700Bold" },
            ]}
            numberOfLines={1}
          >
            {formatEGP(totalOwedToMe)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("i_owe");
          }}
          style={[
            styles.summaryCard,
            {
              backgroundColor:
                activeTab === "i_owe"
                  ? theme.expense + "22"
                  : theme.card,
              borderColor:
                activeTab === "i_owe"
                  ? theme.expense + "66"
                  : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryLabel,
              { color: theme.expense, fontFamily: "Inter_500Medium" },
            ]}
          >
            {t("iOwe")}
          </Text>
          <Text
            style={[
              styles.summaryAmount,
              { color: theme.expense, fontFamily: "Inter_700Bold" },
            ]}
            numberOfLines={1}
          >
            {formatEGP(totalIOwe)}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={!!filtered.length || !!settled.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 100 },
          !filtered.length && !settled.length && styles.emptyContainer,
        ]}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text
              style={[
                styles.subheading,
                { color: theme.textSecondary, fontFamily: "Inter_500Medium" },
              ]}
            >
              {t("outstanding")} ({filtered.length})
            </Text>
          ) : null
        }
        ListFooterComponent={
          settled.length > 0 ? (
            <View>
              <Text
                style={[
                  styles.subheading,
                  {
                    color: theme.textSecondary,
                    fontFamily: "Inter_500Medium",
                    marginTop: 20,
                  },
                ]}
              >
                {t("settled")} ({settled.length})
              </Text>
              {settled.map((d) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  theme={theme}
                  onSettle={handleSettle}
                  onDelete={handleDelete}
                  onEdit={() =>
                    router.push({
                      pathname: "/add-debt",
                      params: { editId: d.id },
                    })
                  }
                  t={t}
                />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="users" size={44} color={theme.textSecondary} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              {activeTab === "owed_to_me"
                ? t("noOneOwesYou")
                : t("youDontOweAnyone")}
            </Text>
            <Pressable
              onPress={() => router.push("/add-debt")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.emptyBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
                {t("addEntry")}
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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("deleteEntryTitle")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {debtToDelete ? t("deleteEntryMessage", { name: debtToDelete.name }) : ""}
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
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                testID="confirm-delete-debt-btn"
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

function DebtCard({
  debt,
  theme,
  onSettle,
  onDelete,
  onEdit,
  t,
}: {
  debt: Debt;
  theme: typeof Colors.dark;
  onSettle: (d: Debt) => void;
  onDelete: (d: Debt) => void;
  onEdit: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  const isOwedToMe = debt.direction === "owed_to_me";
  const color = isOwedToMe ? theme.income : theme.expense;
  const isOverdue =
    !debt.settled && debt.dueDate && new Date(debt.dueDate) < new Date();

  const getReminderMessage = () => {
    return t("reminderMessage", {
      name: debt.name,
      amount: formatEGP(debt.amount),
    });
  };

  const handleWhatsApp = async () => {
    const message = getReminderMessage();
    const phone = debt.phone || "";
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open WhatsApp", e);
    }
  };

  const handleSMS = async () => {
    const message = getReminderMessage();
    const url = `sms:${debt.phone || ""}?body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open SMS", e);
    }
  };

  const handleEmail = async () => {
    const message = getReminderMessage();
    const subject = t("emailSubject", { amount: formatEGP(debt.amount) });
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open email", e);
    }
  };

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={() => onDelete(debt)}
      style={({ pressed }) => [
        styles.debtCard,
        {
          opacity: pressed ? 0.8 : debt.settled ? 0.5 : 1,
        },
      ]}
    >
      <View style={[styles.debtAvatar, { backgroundColor: color + "22" }]}>
        <Text style={[styles.debtInitial, { color, fontFamily: "Inter_700Bold" }]}>
          {debt.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.debtContent}>
        <View style={styles.debtTopRow}>
          <Text
            style={[
              styles.debtName,
              {
                color: theme.text,
                fontFamily: "Inter_600SemiBold",
                textDecorationLine: debt.settled ? "line-through" : "none",
              },
            ]}
          >
            {debt.name}
          </Text>
          <Text
            style={[
              styles.debtAmount,
              { color, fontFamily: "Inter_700Bold" },
            ]}
          >
            {formatEGP(debt.amount)}
          </Text>
        </View>
        {debt.phone ? (
          <View style={styles.phoneRow}>
            <Feather name="phone" size={11} color={theme.textSecondary} />
            <Text
              style={[
                styles.phoneText,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              {debt.phone}
            </Text>
          </View>
        ) : null}
        <View style={styles.debtBottomRow}>
          {debt.dueDate ? (
            <View style={styles.dueDateRow}>
              <Feather
                name="calendar"
                size={11}
                color={isOverdue && !debt.settled ? theme.expense : theme.textSecondary}
              />
              <Text
                style={[
                  styles.dueDate,
                  {
                    color:
                      isOverdue && !debt.settled
                        ? theme.expense
                        : theme.textSecondary,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {isOverdue && !debt.settled ? t("overdue") + " · " : t("due") + " "}
                {formatDate(debt.dueDate)}
              </Text>
            </View>
          ) : null}
          {debt.note ? (
            <Text
              style={[styles.debtNote, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
              numberOfLines={1}
            >
              {debt.note}
            </Text>
          ) : null}
        </View>
        {!debt.settled && isOwedToMe ? (
          <View style={styles.reminderRow}>
            {debt.phone ? (
              <>
                <Pressable
                  testID="reminder-whatsapp"
                  onPress={handleWhatsApp}
                  style={({ pressed }) => [
                    styles.reminderBtn,
                    { backgroundColor: "#25D366" + "22", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="message-circle" size={12} color="#25D366" />
                  <Text style={[styles.reminderBtnText, { color: "#25D366", fontFamily: "Inter_500Medium" }]}>
                    {t("whatsapp")}
                  </Text>
                </Pressable>
                <Pressable
                  testID="reminder-sms"
                  onPress={handleSMS}
                  style={({ pressed }) => [
                    styles.reminderBtn,
                    { backgroundColor: theme.tint + "22", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="smartphone" size={12} color={theme.tint} />
                  <Text style={[styles.reminderBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                    {t("sms")}
                  </Text>
                </Pressable>
              </>
            ) : null}
            <Pressable
              testID="reminder-email"
              onPress={handleEmail}
              style={({ pressed }) => [
                styles.reminderBtn,
                { backgroundColor: "#F59E0B" + "22", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="mail" size={12} color="#F59E0B" />
              <Text style={[styles.reminderBtnText, { color: "#F59E0B", fontFamily: "Inter_500Medium" }]}>
                {t("email")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {!debt.settled && (
        <Pressable
          onPress={() => onSettle(debt)}
          style={({ pressed }) => [
            styles.settleBtn,
            { borderColor: theme.income + "88", opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="check" size={14} color={theme.income} />
        </Pressable>
      )}
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
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryLabel: { fontSize: 12, marginBottom: 6 },
  summaryAmount: { fontSize: 17 },
  list: { paddingHorizontal: 20, paddingTop: 4 },
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
    marginTop: 4,
  },
  emptyBtnTxt: { color: "#FFF", fontSize: 15 },
  subheading: { fontSize: 13, marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  separator: { height: StyleSheet.hairlineWidth },
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  debtAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  debtInitial: { fontSize: 18 },
  debtContent: { flex: 1 },
  debtTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  debtName: { fontSize: 15, flex: 1, marginRight: 8 },
  debtAmount: { fontSize: 15 },
  debtBottomRow: { gap: 2 },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dueDate: { fontSize: 12 },
  debtNote: { fontSize: 12 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  phoneText: { fontSize: 12 },
  reminderRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  reminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reminderBtnText: { fontSize: 11 },
  settleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
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
