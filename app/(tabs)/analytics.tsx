import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort } from "@/utils/format";

const INCOME_CATEGORIES = [
  "Sales", "Services", "Consulting", "Rent", "Investment", "Other Income",
];
const EXPENSE_CATEGORIES = [
  "Inventory", "Salaries", "Rent", "Utilities", "Marketing", "Transport",
  "Maintenance", "Taxes", "Supplies", "Other Expense",
];

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { transactions, totalIncome, totalExpense, totalBalance, activeBook } = useApp();
  const { t } = useLanguage();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      Sales: t("sales"),
      Services: t("services"),
      Consulting: t("consulting"),
      Rent: t("rent"),
      Investment: t("investment"),
      "Other Income": t("otherIncome"),
      Inventory: t("inventory"),
      Salaries: t("salaries"),
      Utilities: t("utilities"),
      Marketing: t("marketing"),
      Transport: t("transport"),
      Maintenance: t("maintenance"),
      Taxes: t("taxes"),
      Supplies: t("supplies"),
      "Other Expense": t("otherExpense"),
    };
    return map[cat] || cat;
  };

  const last6Months = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-EG", { month: "short" });
      let income = 0;
      let expense = 0;
      for (const tx of transactions) {
        if (tx.date.startsWith(key)) {
          if (tx.type === "income") income += tx.amount;
          else expense += tx.amount;
        }
      }
      months.push({ label, income, expense });
    }
    return months;
  }, [transactions]);

  const maxBar = useMemo(
    () =>
      Math.max(
        1,
        ...last6Months.map((m) => Math.max(m.income, m.expense))
      ),
    [last6Months]
  );

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === "income") {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === "expense") {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [transactions]);

  const savingsRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100);
  }, [totalIncome, totalExpense]);

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("analytics")}</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("selectBookAnalytics")}</Text>
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
          {t("analytics")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label={t("netBalance")}
            value={formatEGPShort(totalBalance)}
            color={totalBalance >= 0 ? theme.income : theme.expense}
            icon="activity"
            theme={theme}
          />
          <StatCard
            label={t("savingsRate")}
            value={`${savingsRate.toFixed(1)}%`}
            color={theme.tint}
            icon="percent"
            theme={theme}
          />
          <StatCard
            label={t("totalIn")}
            value={formatEGPShort(totalIncome)}
            color={theme.income}
            icon="arrow-up"
            theme={theme}
          />
          <StatCard
            label={t("totalOut")}
            value={formatEGPShort(totalExpense)}
            color={theme.expense}
            icon="arrow-down"
            theme={theme}
          />
        </View>

        {/* 6-Month Chart */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: theme.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {t("last6Months")}
          </Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.income }]} />
              <Text style={[styles.legendLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {t("income")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.expense }]} />
              <Text style={[styles.legendLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {t("expense")}
              </Text>
            </View>
          </View>
          <View style={styles.barChart}>
            {last6Months.map((m, i) => (
              <BarGroup
                key={i}
                data={m}
                max={maxBar}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* Top Income Categories */}
        {incomeByCategory.length > 0 && (
          <CategoryBreakdown
            title={t("topIncomeSources")}
            data={incomeByCategory}
            total={totalIncome}
            color={theme.income}
            theme={theme}
            categoryLabel={categoryLabel}
          />
        )}

        {/* Top Expense Categories */}
        {expenseByCategory.length > 0 && (
          <CategoryBreakdown
            title={t("topExpenseCategories")}
            data={expenseByCategory}
            total={totalExpense}
            color={theme.expense}
            theme={theme}
            categoryLabel={categoryLabel}
          />
        )}

        {transactions.length === 0 && (
          <View style={styles.emptyContent}>
            <Feather name="bar-chart-2" size={44} color={theme.textSecondary} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
            >
              Add transactions to see analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
  theme: typeof Colors.dark;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text
        style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
      >
        {label}
      </Text>
    </View>
  );
}

function BarGroup({
  data,
  max,
  theme,
}: {
  data: { label: string; income: number; expense: number };
  max: number;
  theme: typeof Colors.dark;
}) {
  const BAR_HEIGHT = 120;
  const incomeH = (data.income / max) * BAR_HEIGHT;
  const expenseH = (data.expense / max) * BAR_HEIGHT;

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barContainer, { height: BAR_HEIGHT }]}>
        <View style={styles.barPair}>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(incomeH, 2),
                backgroundColor: theme.income,
                opacity: incomeH < 2 ? 0.3 : 1,
              },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                height: Math.max(expenseH, 2),
                backgroundColor: theme.expense,
                opacity: expenseH < 2 ? 0.3 : 1,
              },
            ]}
          />
        </View>
      </View>
      <Text
        style={[
          styles.barLabel,
          { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
        ]}
      >
        {data.label}
      </Text>
    </View>
  );
}

function CategoryBreakdown({
  title,
  data,
  total,
  color,
  theme,
  categoryLabel,
}: {
  title: string;
  data: [string, number][];
  total: number;
  color: string;
  theme: typeof Colors.dark;
  categoryLabel: (cat: string) => string;
}) {
  return (
    <View
      style={[
        styles.chartCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          { color: theme.text, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title}
      </Text>
      {data.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0;
        return (
          <View key={cat} style={styles.catRow}>
            <View style={styles.catInfo}>
              <Text
                style={[
                  styles.catName,
                  { color: theme.text, fontFamily: "Inter_500Medium" },
                ]}
                numberOfLines={1}
              >
                {categoryLabel(cat)}
              </Text>
              <Text
                style={[
                  styles.catPct,
                  { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
                ]}
              >
                {pct.toFixed(0)}%
              </Text>
            </View>
            <View
              style={[styles.catBarBg, { backgroundColor: theme.border }]}
            >
              <View
                style={[
                  styles.catBar,
                  { width: `${pct}%` as any, backgroundColor: color },
                ]}
              />
            </View>
            <Text
              style={[
                styles.catAmt,
                { color: theme.text, fontFamily: "Inter_600SemiBold" },
              ]}
              numberOfLines={1}
            >
              {formatEGPShort(amt)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28 },
  scroll: { padding: 20, gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 12 },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardTitle: { fontSize: 16 },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12 },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  barGroup: { flex: 1, alignItems: "center", gap: 6 },
  barContainer: { justifyContent: "flex-end", width: "100%" },
  barPair: {
    flexDirection: "row",
    gap: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  bar: { width: 10, borderRadius: 4 },
  barLabel: { fontSize: 10 },
  catRow: { gap: 6 },
  catInfo: { flexDirection: "row", justifyContent: "space-between" },
  catName: { fontSize: 13, flex: 1 },
  catPct: { fontSize: 12 },
  catBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  catBar: { height: 6, borderRadius: 3 },
  catAmt: { fontSize: 13, textAlign: "right" },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 40,
  },
  emptyText: { fontSize: 15, textAlign: "center" },
});
