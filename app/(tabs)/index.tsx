import React, { useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, CashBook } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort, formatDateShort } from "@/utils/format";

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
                styles.settingsBtn,
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
  const { activeBook, setActiveBook, totalBalance, totalIncome, totalExpense, transactions } =
    useApp();

  const recent = useMemo(() => transactions.slice(0, 8), [transactions]);

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/add-transaction");
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (!activeBook) return null;

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
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveBook(null);
              }}
              style={styles.backRow}
              accessibilityLabel="Back to books"
              accessibilityRole="button"
            >
              <Feather name="chevron-left" size={16} color={theme.tint} />
              <Text style={[styles.backText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                Books
              </Text>
            </Pressable>
            <Text
              style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}
              numberOfLines={1}
            >
              {activeBook.name}
            </Text>
          </View>
          <View style={styles.headerBtns}>
            {activeBook.isCloud && (
              <Pressable
                onPress={() => router.push({ pathname: "/book-members", params: { bookId: activeBook.id } })}
                accessibilityLabel="Members"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.settingsBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Feather name="users" size={18} color={theme.textSecondary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.settingsBtn,
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

        <View style={[styles.bookTypeBadge, { backgroundColor: activeBook.isCloud ? theme.income + "18" : theme.surface }]}>
          <Feather name={activeBook.isCloud ? "cloud" : "book"} size={12} color={activeBook.isCloud ? theme.income : theme.textSecondary} />
          <Text style={[styles.bookTypeText, { color: activeBook.isCloud ? theme.income : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {activeBook.isCloud ? "Cloud Book" : "Local Book"}
          </Text>
        </View>

        <View
          style={[
            styles.balanceCard,
            { backgroundColor: theme.tint, shadowColor: theme.tint },
          ]}
        >
          <Text
            style={[
              styles.balanceLabel,
              { color: "#ffffff99", fontFamily: "Inter_500Medium" },
            ]}
          >
            Net Balance
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: "#FFFFFF", fontFamily: "Inter_700Bold" },
            ]}
          >
            {formatEGP(totalBalance)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <View style={[styles.statDot, { backgroundColor: "#FFFFFF44" }]} />
              <View>
                <Text
                  style={[styles.statLabel, { color: "#ffffff88", fontFamily: "Inter_400Regular" }]}
                >
                  Income
                </Text>
                <Text
                  style={[styles.statAmt, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}
                >
                  {formatEGPShort(totalIncome)}
                </Text>
              </View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "#FFFFFF33" }]} />
            <View style={styles.balanceStat}>
              <View style={[styles.statDot, { backgroundColor: "#FFFFFF44" }]} />
              <View>
                <Text
                  style={[styles.statLabel, { color: "#ffffff88", fontFamily: "Inter_400Regular" }]}
                >
                  Expense
                </Text>
                <Text
                  style={[styles.statAmt, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}
                >
                  {formatEGPShort(totalExpense)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <QuickAction
            icon="arrow-up-circle"
            label="Add Income"
            color={theme.income}
            bg={theme.income + "22"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/add-transaction", params: { type: "income" } });
            }}
            theme={theme}
          />
          <QuickAction
            icon="arrow-down-circle"
            label="Add Expense"
            color={theme.expense}
            bg={theme.expense + "22"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/add-transaction", params: { type: "expense" } });
            }}
            theme={theme}
          />
          <QuickAction
            icon="user-plus"
            label="Add Debtor"
            color={theme.tint}
            bg={theme.tint + "22"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/add-debt");
            }}
            theme={theme}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
          >
            Recent Transactions
          </Text>
          <Pressable onPress={() => router.push("/transactions" as any)}>
            <Text
              style={[styles.seeAll, { color: theme.tint, fontFamily: "Inter_500Medium" }]}
            >
              See all
            </Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No transactions yet.{"\n"}Tap + to add your first entry.
            </Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {recent.map((tx, idx) => (
              <View key={tx.id}>
                <TransactionRow tx={tx} theme={theme} />
                {idx < recent.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={handleAdd}
        accessibilityLabel="Add transaction"
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

function QuickAction({
  icon,
  label,
  color,
  bg,
  onPress,
  theme,
}: {
  icon: string;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  theme: typeof Colors.dark;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text
        style={[styles.quickLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionRow({
  tx,
  theme,
}: {
  tx: any;
  theme: typeof Colors.dark;
}) {
  const isIncome = tx.type === "income";
  return (
    <View style={styles.txRow}>
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
          size={16}
          color={isIncome ? theme.income : theme.expense}
        />
      </View>
      <View style={styles.txMeta}>
        <Text
          style={[styles.txCategory, { color: theme.text, fontFamily: "Inter_500Medium" }]}
          numberOfLines={1}
        >
          {tx.category}
        </Text>
        {tx.note ? (
          <Text
            style={[styles.txNote, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {tx.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            {
              color: isIncome ? theme.income : theme.expense,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {isIncome ? "+" : "-"}{formatEGPShort(tx.amount)}
        </Text>
        <Text
          style={[styles.txDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
        >
          {formatDateShort(tx.date)}
        </Text>
      </View>
    </View>
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
  settingsBtn: {
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 4,
  },
  backText: { fontSize: 14 },
  bookTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  bookTypeText: { fontSize: 12 },
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
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  balanceLabel: { fontSize: 13, marginBottom: 6 },
  balanceAmount: { fontSize: 36, marginBottom: 20 },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  balanceStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 12, marginBottom: 2 },
  statAmt: { fontSize: 16 },
  statDivider: { width: 1, height: 40, marginHorizontal: 16 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17 },
  seeAll: { fontSize: 14 },
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
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txMeta: { flex: 1 },
  txCategory: { fontSize: 14, marginBottom: 2 },
  txNote: { fontSize: 12 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, marginBottom: 2 },
  txDate: { fontSize: 11 },
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
});
