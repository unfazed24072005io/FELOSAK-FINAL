import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
import Colors from "@/constants/colors";
import { formatEGP, formatDate } from "@/utils/format";

type TabDir = "owed_to_me" | "i_owe";

export default function DebtorsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { debts, deleteDebt, updateDebt } = useApp();
  const [activeTab, setActiveTab] = useState<TabDir>("owed_to_me");

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

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

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
      Alert.alert("Delete Entry", `Delete record for "${debt.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteDebt(debt.id),
        },
      ]);
    },
    [deleteDebt]
  );

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
      />
    ),
    [theme, handleSettle, handleDelete]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
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
          AR / AP
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

      {/* Summary Cards */}
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
            Owed to Me
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
            I Owe
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
              Outstanding ({filtered.length})
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
                Settled ({settled.length})
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
                ? "No one owes you anything"
                : "You don't owe anyone"}
            </Text>
            <Pressable
              onPress={() => router.push("/add-debt")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.emptyBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
                Add Entry
              </Text>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />
    </View>
  );
}

function DebtCard({
  debt,
  theme,
  onSettle,
  onDelete,
  onEdit,
}: {
  debt: Debt;
  theme: typeof Colors.dark;
  onSettle: (d: Debt) => void;
  onDelete: (d: Debt) => void;
  onEdit: () => void;
}) {
  const isOwedToMe = debt.direction === "owed_to_me";
  const color = isOwedToMe ? theme.income : theme.expense;
  const isOverdue =
    !debt.settled && debt.dueDate && new Date(debt.dueDate) < new Date();

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
                {isOverdue && !debt.settled ? "Overdue · " : "Due "}
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
  settleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
