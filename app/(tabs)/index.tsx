import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, CashBook, Transaction } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort, formatDateGroup, formatTime } from "@/utils/format";

export default function OverviewScreen() {
  const { activeBook } = useApp();

  if (activeBook) {
    return <BookDashboard />;
  }
  return <BooksListView />;
}

function BooksListView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { books, setActiveBook, deleteBook } = useApp();
  const { user } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleDeleteBook = useCallback(
    (book: CashBook) => {
      if (book.role !== "owner") {
        Alert.alert("Cannot Delete", "Only the owner can delete this book.");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        "Delete Book",
        `Delete "${book.name}" and all its data? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteBook(book.id),
          },
        ]
      );
    },
    [deleteBook]
  );

  const handleOpenBook = useCallback(
    (book: CashBook) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveBook(book);
    },
    [setActiveBook]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            >
              Misr Cash Book
            </Text>
            <Text
              style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}
            >
              My Books
            </Text>
          </View>
          <View style={styles.headerBtns}>
            {!user && (
              <Pressable
                onPress={() => router.push("/auth")}
                accessibilityLabel="Sign in"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.headerBtn,
                  {
                    backgroundColor: theme.tint,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="cloud" size={16} color="#FFF" />
              </Pressable>
            )}
            {user && (
              <Pressable
                onPress={() => router.push("/account")}
                accessibilityLabel="Account"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.headerBtn,
                  {
                    backgroundColor: theme.tint,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="user" size={16} color="#FFF" />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Feather name="settings" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        {user && (
          <View style={[styles.userBanner, { backgroundColor: theme.tint + "18", borderColor: theme.tint + "44" }]}>
            <Feather name="user" size={14} color={theme.tint} />
            <Text style={[styles.userText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
              Signed in as {user.displayName}
            </Text>
          </View>
        )}

        {books.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="book-open" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No books yet.{"\n"}Create your first cash book to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.booksGrid}>
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                theme={theme}
                onPress={() => handleOpenBook(book)}
                onLongPress={() => handleDeleteBook(book)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/create-book");
        }}
        accessibilityLabel="Create new book"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.tint,
            bottom: bottomPad + 80,
            shadowColor: theme.tint,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function BookCard({
  book,
  theme,
  onPress,
  onLongPress,
}: {
  book: CashBook;
  theme: typeof Colors.dark;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.bookCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      testID={`book-${book.id}`}
    >
      <View style={styles.bookCardTop}>
        <View style={[styles.bookIcon, { backgroundColor: theme.tint + "22" }]}>
          <Feather
            name={book.isCloud ? "cloud" : "book"}
            size={20}
            color={theme.tint}
          />
        </View>
        <View
          style={[
            styles.bookBadge,
            { backgroundColor: book.isCloud ? theme.income + "22" : theme.surface },
          ]}
        >
          <Text
            style={[
              styles.bookBadgeText,
              {
                color: book.isCloud ? theme.income : theme.textSecondary,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            {book.isCloud ? "Cloud" : "Local"}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.bookName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        numberOfLines={1}
      >
        {book.name}
      </Text>
      {book.description ? (
        <Text
          style={[styles.bookDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {book.description}
        </Text>
      ) : null}
      <View style={styles.bookFooter}>
        <Text style={[styles.bookRole, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {book.role}
        </Text>
        <Feather name="chevron-right" size={14} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

function BookDashboard() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const {
    activeBook,
    setActiveBook,
    totalBalance,
    totalIncome,
    totalExpense,
    transactions,
    deleteTransaction,
  } = useApp();

  const [menuVisible, setMenuVisible] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const sections = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      const key = tx.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tx);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    let runningBalance = totalBalance;
    const result: { title: string; data: (Transaction & { runningBalance: number })[] }[] = [];
    for (const date of sortedDates) {
      const items = grouped[date].sort((a, b) => b.createdAt - a.createdAt);
      const withBalance = items.map((tx) => {
        const bal = runningBalance;
        runningBalance -= tx.type === "income" ? tx.amount : -tx.amount;
        return { ...tx, runningBalance: bal };
      });
      result.push({ title: formatDateGroup(date), data: withBalance });
    }
    return result;
  }, [transactions, totalBalance]);

  const handleDeleteAll = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      "Delete All Entries",
      "This will permanently delete all transactions in this book. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            transactions.forEach((tx) => deleteTransaction(tx.id));
          },
        },
      ]
    );
  }, [transactions, deleteTransaction]);

  if (!activeBook) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.dashHeader,
          {
            paddingTop: topPad + 8,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveBook(null);
          }}
          accessibilityLabel="Back to books"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.dashHeaderCenter}>
          <Text
            style={[styles.dashTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={1}
          >
            {activeBook.name}
          </Text>
          <Text style={[styles.dashSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {activeBook.isCloud ? "You" + (activeBook.role !== "owner" ? ` (${activeBook.role})` : "") : "Local Book"}
          </Text>
        </View>
        <View style={styles.dashHeaderRight}>
          {activeBook.isCloud && (
            <Pressable
              onPress={() => router.push({ pathname: "/book-members", params: { bookId: activeBook.id } })}
              accessibilityLabel="Members"
              accessibilityRole="button"
              hitSlop={6}
            >
              <Feather name="user-plus" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="Book menu"
            accessibilityRole="button"
            hitSlop={6}
          >
            <Feather name="more-vertical" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad + 130 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.dashContent}>
            <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Net Balance
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color: totalBalance >= 0 ? theme.text : theme.expense,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                >
                  {formatEGP(totalBalance)}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  Total In (+)
                </Text>
                <Text style={[styles.summaryIncome, { color: theme.income, fontFamily: "Inter_600SemiBold" }]}>
                  {formatEGP(totalIncome)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  Total Out (-)
                </Text>
                <Text style={[styles.summaryExpense, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
                  {formatEGP(totalExpense)}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/analytics" as any)}
                style={({ pressed }) => [styles.viewReports, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.viewReportsText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                  VIEW REPORTS
                </Text>
                <Feather name="chevron-right" size={14} color={theme.tint} />
              </Pressable>
            </View>

            <Text style={[styles.entryCount, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Showing {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
            </Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <EntryRow
            tx={item}
            theme={theme}
            onPress={() => {
              router.push({ pathname: "/add-transaction", params: { editId: item.id } });
            }}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 16 }]}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No entries yet.{"\n"}Tap Cash In or Cash Out below to start.
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Platform.OS === "web" ? bottomPad : 8,
            marginBottom: Platform.OS === "web" ? 84 : 50,
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/add-transaction", params: { type: "income" } });
          }}
          style={({ pressed }) => [
            styles.cashInBtn,
            { backgroundColor: theme.income, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="cash-in-btn"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={[styles.cashBtnText, { fontFamily: "Inter_700Bold" }]}>CASH IN</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/add-transaction", params: { type: "expense" } });
          }}
          style={({ pressed }) => [
            styles.cashOutBtn,
            { backgroundColor: theme.expense, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="cash-out-btn"
        >
          <Feather name="minus" size={18} color="#FFFFFF" />
          <Text style={[styles.cashBtnText, { fontFamily: "Inter_700Bold" }]}>CASH OUT</Text>
        </Pressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                top: topPad + 48,
              },
            ]}
          >
            <MenuItem
              icon="settings"
              label="Book Settings"
              theme={theme}
              onPress={() => {
                setMenuVisible(false);
                router.push("/settings");
              }}
            />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            {activeBook.isCloud && (
              <>
                <MenuItem
                  icon="users"
                  label="Team Members"
                  theme={theme}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push({ pathname: "/book-members", params: { bookId: activeBook.id } });
                  }}
                />
                <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
              </>
            )}
            <MenuItem
              icon="bar-chart-2"
              label="View Reports"
              theme={theme}
              onPress={() => {
                setMenuVisible(false);
                router.push("/(tabs)/analytics" as any);
              }}
            />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="trash-2"
              label="Delete All Entries"
              theme={theme}
              color={theme.expense}
              onPress={handleDeleteAll}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  theme,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  theme: typeof Colors.dark;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Feather name={icon as any} size={18} color={color || theme.text} />
      <Text
        style={[
          styles.menuItemText,
          { color: color || theme.text, fontFamily: "Inter_400Regular" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EntryRow({
  tx,
  theme,
  onPress,
}: {
  tx: Transaction & { runningBalance: number };
  theme: typeof Colors.dark;
  onPress: () => void;
}) {
  const isIncome = tx.type === "income";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.entryRow,
        {
          backgroundColor: pressed ? theme.surface : "transparent",
        },
      ]}
    >
      <View style={styles.entryLeft}>
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor: isIncome ? theme.income + "18" : theme.expense + "18",
              borderColor: isIncome ? theme.income + "44" : theme.expense + "44",
            },
          ]}
        >
          <Text
            style={[
              styles.categoryBadgeText,
              {
                color: isIncome ? theme.income : theme.expense,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            {tx.category}
          </Text>
        </View>
        {tx.note ? (
          <Text
            style={[styles.entryNote, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            numberOfLines={2}
          >
            {tx.note}
          </Text>
        ) : null}
        <Text style={[styles.entryMeta, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Entry by You at {formatTime(tx.createdAt)}
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text
          style={[
            styles.entryAmount,
            {
              color: isIncome ? theme.income : theme.expense,
              fontFamily: "Inter_700Bold",
            },
          ]}
        >
          {formatEGP(isIncome ? tx.amount : -tx.amount)}
        </Text>
        <Text style={[styles.entryBalance, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Balance: {formatEGP(tx.runningBalance)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerBtns: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: { fontSize: 13, marginBottom: 2 },
  headerTitle: { fontSize: 28 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  userText: { fontSize: 13 },
  booksGrid: { gap: 12 },
  bookCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  bookCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookBadgeText: { fontSize: 11 },
  bookName: { fontSize: 17, marginTop: 4 },
  bookDesc: { fontSize: 13, lineHeight: 19 },
  bookFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  bookRole: { fontSize: 12, textTransform: "capitalize" },
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  dashHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  dashHeaderCenter: { flex: 1 },
  dashTitle: { fontSize: 18 },
  dashSubtitle: { fontSize: 12, marginTop: 1 },
  dashHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  dashContent: { paddingHorizontal: 16, paddingTop: 16 },

  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 22 },
  summaryIncome: { fontSize: 16 },
  summaryExpense: { fontSize: 16 },
  viewReports: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    gap: 4,
  },
  viewReportsText: { fontSize: 14, letterSpacing: 0.5 },

  entryCount: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 12,
  },

  dateHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dateHeaderText: { fontSize: 13 },

  entryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  entryLeft: { flex: 1, gap: 4 },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: { fontSize: 12 },
  entryNote: { fontSize: 14, marginTop: 2 },
  entryMeta: { fontSize: 11, marginTop: 2 },
  entryRight: { alignItems: "flex-end", justifyContent: "center", marginLeft: 12 },
  entryAmount: { fontSize: 17 },
  entryBalance: { fontSize: 11, marginTop: 2 },

  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cashInBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  cashOutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  cashBtnText: { color: "#FFFFFF", fontSize: 15 },

  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuCard: {
    position: "absolute",
    right: 16,
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  menuDivider: { height: StyleSheet.hairlineWidth },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: { fontSize: 15 },
});
