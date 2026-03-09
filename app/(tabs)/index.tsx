import React, { useCallback, useMemo, useState } from "react";
import {
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
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort, formatDateGroup, formatTime } from "@/utils/format";
import { getPaymentModeLabel } from "@/app/add-transaction";

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
  const { t } = useLanguage();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<CashBook | null>(null);
  const [showCannotDeleteModal, setShowCannotDeleteModal] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleDeleteBook = useCallback(
    (book: CashBook) => {
      if (book.role !== "owner") {
        setShowCannotDeleteModal(true);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setBookToDelete(book);
      setShowDeleteModal(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (bookToDelete) {
      deleteBook(bookToDelete.id);
    }
    setShowDeleteModal(false);
    setBookToDelete(null);
  }, [bookToDelete, deleteBook]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setBookToDelete(null);
  }, []);

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
              {t("appName")}
            </Text>
            <Text
              style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}
            >
              {t("myBooks")}
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
              {t("signedInAs")} {user.displayName}
            </Text>
          </View>
        )}

        {books.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="book-open" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("noBooksYet")}{"\n"}{t("createBook")}
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

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("deleteBook")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {bookToDelete ? t("deleteBookConfirm", { name: bookToDelete.name }) : ""}
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

      <Modal
        visible={showCannotDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCannotDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("cannotDelete")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("onlyOwnerDelete")}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCannotDeleteModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {t("cancel")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  const { t } = useLanguage();
  const roleLabel = book.role === "owner" ? t("owner") : book.role === "editor" ? t("editor") : t("viewer");
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
            {book.isCloud ? t("cloud") : t("local")}
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
          {roleLabel}
        </Text>
        <Feather name="chevron-right" size={14} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

type DashFilter = "all" | "income" | "expense";
type DashPayFilter = "all" | string;

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
  const { t } = useLanguage();

  const [menuVisible, setMenuVisible] = useState(false);
  const [entryFilter, setEntryFilter] = useState<DashFilter>("all");
  const [payFilter, setPayFilter] = useState<DashPayFilter>("all");
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(() => {
    let result = transactions;
    if (entryFilter !== "all") {
      result = result.filter((t) => t.type === entryFilter);
    }
    if (payFilter !== "all") {
      result = result.filter((t) => (t.paymentMode || "cash") === payFilter);
    }
    return result;
  }, [transactions, entryFilter, payFilter]);

  const filteredTotals = useMemo(() => {
    let inc = 0, exp = 0;
    filtered.forEach((t) => {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    });
    return { income: inc, expense: exp, balance: inc - exp };
  }, [filtered]);

  const sections = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    filtered.forEach((tx) => {
      const key = tx.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tx);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    let runningBalance = filteredTotals.balance;
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
  }, [filtered, filteredTotals.balance]);

  const handleDeleteAll = useCallback(() => {
    setMenuVisible(false);
    setShowDeleteAllModal(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    transactions.forEach((tx) => deleteTransaction(tx.id));
    setShowDeleteAllModal(false);
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
            {activeBook.isCloud ? (activeBook.role !== "owner" ? `(${activeBook.role === "editor" ? t("editor") : t("viewer")})` : "") : t("localBook")}
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
            onPress={() => router.push("/generate-report" as any)}
            accessibilityLabel="Generate report"
            accessibilityRole="button"
            hitSlop={6}
            testID="pdf-report-btn"
          >
            <Feather name="file-text" size={20} color={theme.expense} />
          </Pressable>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setEntryFilter(entryFilter === "all" ? "income" : entryFilter === "income" ? "expense" : "all"); }}
          style={[styles.filterChip, { backgroundColor: theme.card, borderColor: entryFilter !== "all" ? theme.tint + "88" : theme.border }]}
        >
          <Text style={[styles.filterChipText, { color: entryFilter !== "all" ? theme.tint : theme.text, fontFamily: entryFilter !== "all" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
            {entryFilter === "all" ? t("entryType") : entryFilter === "income" ? t("cashIn") : t("cashOut")}
          </Text>
          <Feather name="chevron-down" size={12} color={entryFilter !== "all" ? theme.tint : theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            const modes = ["all", "cash", "instapay", "vodafone_cash", "fawry", "bank_transfer", "international", "cheque", "other"];
            const idx = modes.indexOf(payFilter);
            setPayFilter(modes[(idx + 1) % modes.length]);
          }}
          style={[styles.filterChip, { backgroundColor: theme.card, borderColor: payFilter !== "all" ? theme.tint + "88" : theme.border }]}
        >
          <Text style={[styles.filterChipText, { color: payFilter !== "all" ? theme.tint : theme.text, fontFamily: payFilter !== "all" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
            {payFilter === "all" ? t("paymentMode") : getPaymentModeLabel(payFilter)}
          </Text>
          <Feather name="chevron-down" size={12} color={payFilter !== "all" ? theme.tint : theme.textSecondary} />
        </Pressable>
        {(entryFilter !== "all" || payFilter !== "all") && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setEntryFilter("all"); setPayFilter("all"); }}
            style={[styles.filterChip, { backgroundColor: theme.expense + "15", borderColor: theme.expense + "44" }]}
          >
            <Feather name="x" size={14} color={theme.expense} />
            <Text style={[styles.filterChipText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>{t("clear")}</Text>
          </Pressable>
        )}
      </ScrollView>

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
                  {t("netBalance")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color: filteredTotals.balance >= 0 ? theme.text : theme.expense,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                >
                  {formatEGP(filteredTotals.balance)}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {t("totalInPlus")}
                </Text>
                <Text style={[styles.summaryIncome, { color: theme.income, fontFamily: "Inter_600SemiBold" }]}>
                  {formatEGP(filteredTotals.income)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {t("totalOutMinus")}
                </Text>
                <Text style={[styles.summaryExpense, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
                  {formatEGP(filteredTotals.expense)}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/analytics" as any)}
                style={({ pressed }) => [styles.viewReports, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.viewReportsText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                  {t("viewReportsBtn")}
                </Text>
                <Feather name="chevron-right" size={14} color={theme.tint} />
              </Pressable>
            </View>

            <Text style={[styles.entryCount, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("showingEntries", { count: filtered.length, label: filtered.length === 1 ? t("entry") : t("entries") })}
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
              {t("noEntriesYet")}{"\n"}{t("tapCashInOut")}
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Platform.OS === "web" ? bottomPad + 4 : Math.max(insets.bottom, 12),
            marginBottom: Platform.OS === "web" ? 84 : 80,
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
          <Text style={[styles.cashBtnText, { fontFamily: "Inter_700Bold" }]}>{t("cashInCaps")}</Text>
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
          <Text style={[styles.cashBtnText, { fontFamily: "Inter_700Bold" }]}>{t("cashOutCaps")}</Text>
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
              label={t("bookSettings")}
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
                  label={t("teamMembers")}
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
              label={t("viewReports")}
              theme={theme}
              onPress={() => {
                setMenuVisible(false);
                router.push("/(tabs)/analytics" as any);
              }}
            />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="download"
              label={t("generateReport")}
              theme={theme}
              onPress={() => {
                setMenuVisible(false);
                router.push("/generate-report" as any);
              }}
            />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="trash-2"
              label={t("deleteAllEntries")}
              theme={theme}
              color={theme.expense}
              onPress={handleDeleteAll}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("deleteAllEntries")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("confirmDeleteMessage")}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDeleteAllModal(false)}
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
                onPress={handleConfirmDeleteAll}
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
  const modeLabel = tx.paymentMode && tx.paymentMode !== "cash" ? getPaymentModeLabel(tx.paymentMode) : null;
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
        <View style={styles.entryBadgeRow}>
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
          {modeLabel ? (
            <View style={[styles.paymentBadge, { backgroundColor: theme.tint + "15", borderColor: theme.tint + "33" }]}>
              <Feather name="credit-card" size={10} color={theme.tint} />
              <Text style={[styles.paymentBadgeText, { color: theme.tint, fontFamily: "Inter_400Regular" }]}>
                {modeLabel}
              </Text>
            </View>
          ) : null}
          {tx.attachment ? (
            <Feather name="paperclip" size={12} color={theme.textSecondary} />
          ) : null}
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

  filterBar: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13 },

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
  entryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  paymentBadgeText: { fontSize: 10 },
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
