// app/compliance.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP } from "@/utils/format";

interface RegionInfo {
  id: string;
  n: string;
  ar: string;
  fl: string;
  cur: string;
  vr: number;
  vl: string;
  auth: string;
  ct: number;
  ctT: number;
  eM: boolean;
  fmt: string;
  sig: string;
  arch: number;
  pc: string;
  rt: boolean;
  tin?: string;
  profVat?: number;
  vatThreshold?: number;
  wht?: string;
  eInvModel?: string;
  eInvFields?: { l: string; d: string }[];
  smeTiers?: { max: number; rate: string }[];
  smeThreshold?: number;
  uinLen?: number;
  socialIns?: string;
  implSteps?: string[];
  cal: { e: string; d: string; r: boolean }[];
  v26: { t: string; d: string }[] | null;
  pays: string[];
}

// Region data (same as in your web app)
const RG: Record<string, RegionInfo> = {
  EG: {
    id: "EG", n: "Egypt", ar: "مصر", fl: "🇪🇬", cur: "EGP",
    vr: 0.14, vl: "VAT 14%", auth: "ETA", ct: 0.225, ctT: 0,
    eM: true, fmt: "XML/JSON", sig: "E-Signature/E-Seal", arch: 5,
    pc: "GS1 GPC", rt: true, tin: "9-digit TIN", profVat: 0.10,
    vatThreshold: 500000, wht: "1%–3% on services",
    eInvModel: "Clearance (real-time ETA validation)",
    eInvFields: [
      { l: "UUID", d: "Unique Universal Identifier per invoice" },
      { l: "Seller & Buyer TIN", d: "Validated 9-digit Tax ID for both parties (B2B)" },
      { l: "Buyer Info", d: "Name, Address, Phone number" },
      { l: "Item Codes", d: "GS1 or GPC coding standards for each line item" },
      { l: "UIN", d: "39-character Unique Identification Number (since Nov 2024)" },
      { l: "QR Code", d: "Machine-readable code for verification" },
      { l: "E-Signature", d: "Digital signature via licensed provider" },
    ],
    smeTiers: [
      { max: 250000, rate: "0.4%" }, { max: 500000, rate: "0.5%" },
      { max: 1000000, rate: "0.75%" }, { max: 2000000, rate: "1.0%" },
      { max: 3000000, rate: "1.25%" }, { max: 10000000, rate: "1.5%" },
      { max: 20000000, rate: "1.5%" },
    ],
    smeThreshold: 20000000, uinLen: 39,
    socialIns: "11% employee + 18.75% employer",
    implSteps: [
      "Obtain Digital Signature/Seal from licensed provider",
      "Register on ETA Portal & set up company profile",
      "Integrate billing system (API) with ETA SDK",
      "Map all products/services to GS1/GPC codes",
      "Enable automated VAT (14%) & WHT (1%–3%) calculation",
      "Implement B2B buyer TIN + UIN (39-char) validation",
    ],
    pays: ["Fawry", "Vodafone Cash", "InstaPay", "Paymob", "Meeza"],
    cal: [
      { e: "Monthly VAT Return", d: "Within 30 days after tax period end", r: true },
      { e: "Annual Corporate Tax Return", d: "April 30", r: true },
      { e: "Withholding Tax Filing", d: "Quarterly", r: true },
      { e: "Payroll Tax Reconciliation", d: "Annual", r: true },
    ],
    v26: [
      { t: "Law 5 & 6 of 2025 — SME Incentives", d: "Turnover ≤ EGP 20M: simplified fixed-rate tax (0.4%–1.5% of revenue)" },
      { t: "UIN Validation (Nov 2024)", d: "39-character Unique Identification Number required for all B2B transactions" },
      { t: "E-Receipts (B2C) Expansion", d: "Mandatory POS integration with ETA for B2C transactions" },
    ],
  },
  AE: {
    id: "AE", n: "UAE", ar: "الإمارات", fl: "🇦🇪", cur: "AED",
    vr: 0.05, vl: "VAT 5%", auth: "FTA", ct: 0.09, ctT: 375000,
    eM: false, fmt: "Peppol CTC", sig: "Digital Cert", arch: 5,
    pc: "TBD", rt: false, tin: "TRN (15-digit)",
    pays: ["Apple Pay", "Google Pay", "Tabby", "Tamara", "PayTabs"],
    cal: [
      { e: "VAT Return", d: "28 days after period", r: true },
      { e: "Corporate Tax", d: "9 months after FY", r: true },
      { e: "E-Invoice Pilot", d: "July 2026", r: false },
      { e: "E-Invoice Mandatory", d: "2027", r: false },
    ],
    v26: [
      { t: "Reverse Charge Simplified", d: "No self-invoices. Retain supplier docs." },
      { t: "5-Year Refund Deadline", d: "Unclaimed VAT expires after 5 years." },
      { t: "Anti-Evasion", d: "FTA can deny input VAT linked to evasion." },
    ],
  },
};

export default function ComplianceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook, transactions, totalIncome, totalExpense } = useApp();
  const { t, isAr } = useLanguage();

  // Use Egypt as default region for now
  const R = RG.EG;
  const c = R.cur;

  const allTx = transactions;
  const tI = totalIncome;
  const tO = totalExpense;
  const pr = tI - tO;
  const oV = Math.round(tI * R.vr);
  const iV = Math.round(tO * R.vr);
  const nV = oV - iV;
  const ct = Math.round(Math.max(0, pr) * R.ct);
  const rev = tI;
  const smeEligible = R.id === "EG" && R.smeThreshold && rev <= R.smeThreshold;
  const smeTier = smeEligible && R.smeTiers ? R.smeTiers.find(t => rev <= t.max) : null;
  const smeTax = smeTier ? Math.round(rev * parseFloat(smeTier.rate) / 100) : 0;

  const formatCurrency = (amount: number) => `${c} ${amount.toLocaleString()}`;

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const bottomPad = insets.bottom + 20;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {R.fl} Compliance — {R.n}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Tax & Regulatory Compliance Dashboard
        </Text>
      </View>

      <View style={styles.content}>
        {/* Card 1: Core Tax Identifiers */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
              <Text style={styles.cardIconText}>🏛️</Text>
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Core Tax Identifiers
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                Egypt ETA Requirements
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Taxpayer ID (TIN)</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{R.tin || "9-digit TIN"}</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>ETA Registered</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>VAT on Services</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{R.wht || "1%–3% WHT"}</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>Withholding Tax</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>E-Signature VAT</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Egypt Trust / Misr Tech</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>Licensed Provider</Text>
            </View>
          </View>
        </View>

        {/* Card 2: VAT Summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
              <Text style={styles.cardIconText}>🧾</Text>
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                VAT Summary
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {R.vl}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
              <Text style={[styles.statLabel, { color: "#065F46" }]}>Output VAT</Text>
              <Text style={[styles.statValue, { color: "#064E3B", fontFamily: "Inter_700Bold" }]}>{formatCurrency(oV)}</Text>
              <Text style={[styles.statSub, { color: "#059669" }]}>On Sales</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={[styles.statLabel, { color: "#991B1B" }]}>Input VAT</Text>
              <Text style={[styles.statValue, { color: "#7F1D1D", fontFamily: "Inter_700Bold" }]}>{formatCurrency(iV)}</Text>
              <Text style={[styles.statSub, { color: "#DC2626" }]}>On Purchases</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Text style={[styles.statLabel, { color: "#92400E" }]}>Net VAT Payable</Text>
              <Text style={[styles.statValue, { color: "#78350F", fontFamily: "Inter_700Bold" }]}>{formatCurrency(nV)}</Text>
              <Text style={[styles.statSub, { color: "#D97706" }]}>Due to ETA</Text>
            </View>
          </View>

          {R.id === "EG" && (
            <Text style={[styles.noteText, { color: theme.textSecondary, backgroundColor: theme.surface }]}>
              📅 Standard VAT 14% on goods/services. Professional/consultancy services taxed at 10%. Monthly filing within 30 days after period end.
            </Text>
          )}
        </View>

        {/* Card 3: Corporate Tax */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
              <Text style={styles.cardIconText}>🏢</Text>
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Corporate Tax
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {R.id === "EG" ? "22.5% on net profits" : "0%→9% (AED 375K)"}
              </Text>
            </View>
          </View>

          <View style={styles.rowGrid}>
            <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Taxable Profit</Text>
              <Text style={[styles.rowValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{formatCurrency(Math.max(0, pr))}</Text>
              {R.id === "AE" && pr <= R.ctT && <Text style={[styles.rowSub, { color: "#10B981" }]}>✓ Below threshold</Text>}
            </View>
            <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Est. CIT</Text>
              <Text style={[styles.rowValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{formatCurrency(ct)}</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Estimated Liability</Text>
            </View>
          </View>
        </View>

        {/* SME Simplified Tax */}
        {R.id === "EG" && smeEligible && (
          <View style={[styles.card, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: "#D1FAE5" }]}>
                <Text style={styles.cardIconText}>💰</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: "#065F46", fontFamily: "Inter_600SemiBold" }]}>
                  SME Simplified Tax
                </Text>
                <Text style={[styles.cardSubtitle, { color: "#047857" }]}>
                  Law 5 & 6 of 2025
                </Text>
              </View>
            </View>

            <Text style={[styles.smeText, { color: "#065F46" }]}>
              Your revenue <Text style={{ fontFamily: "Inter_700Bold" }}>EGP {rev.toLocaleString()}</Text> qualifies for simplified fixed-rate tax instead of 22.5% CIT.
            </Text>

            <View style={styles.rowGrid}>
              <View style={[styles.rowCard, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}>
                <Text style={[styles.rowLabel, { color: "#065F46" }]}>SME Tax Rate</Text>
                <Text style={[styles.rowValue, { color: "#064E3B", fontFamily: "Inter_700Bold" }]}>{smeTier?.rate || "—"}</Text>
              </View>
              <View style={[styles.rowCard, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}>
                <Text style={[styles.rowLabel, { color: "#065F46" }]}>Est. SME Tax</Text>
                <Text style={[styles.rowValue, { color: "#064E3B", fontFamily: "Inter_700Bold" }]}>{formatCurrency(smeTax)}</Text>
              </View>
            </View>

            <Text style={[styles.savingsText, { backgroundColor: "#D1FAE5", color: "#065F46" }]}>
              💰 Savings vs CIT: <Text style={{ fontFamily: "Inter_700Bold" }}>EGP {(ct - smeTax).toLocaleString()}</Text>
            </Text>
          </View>
        )}

        {/* E-Invoicing Requirements */}
        {R.id === "EG" && R.eInvFields && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>🧾</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  E-Invoicing Requirements
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  B2B & B2G • Mandatory since April 2023
                </Text>
              </View>
            </View>

            <Text style={[styles.noteText, { color: theme.textSecondary, backgroundColor: theme.surface }]}>
              {R.eInvModel}. Paper invoices NOT recognized for tax deductions.
            </Text>

            <View style={styles.smallGrid}>
              {[
                ["Format", R.fmt],
                ["Model", "Clearance"],
                ["Coding", R.pc],
                ["B2C", "E-Receipts (POS)"],
              ].map(([l, v], i) => (
                <View key={i} style={[styles.smallCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.smallLabel, { color: theme.textSecondary }]}>{l}</Text>
                  <Text style={[styles.smallValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{v}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Mandatory Invoice Fields:</Text>
            {R.eInvFields.map((f, i) => (
              <View key={i} style={[styles.fieldItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.fieldNumber, { backgroundColor: theme.border }]}>
                  <Text style={[styles.fieldNumberText, { color: theme.textSecondary }]}>{i + 1}</Text>
                </View>
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{f.l}</Text>
                  <Text style={[styles.fieldDesc, { color: theme.textSecondary }]}>{f.d}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Legal Updates */}
        {R.v26 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>⚠️</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {R.id === "EG" ? "Egypt 2025–2026 Legal Updates" : "UAE 2026 VAT Amendments"}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Recent Regulatory Changes
                </Text>
              </View>
            </View>

            {R.v26.map((a, i) => (
              <View key={i} style={[styles.updateItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.updateTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{a.t}</Text>
                <Text style={[styles.updateDesc, { color: theme.textSecondary }]}>{a.d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Implementation Checklist */}
        {R.id === "EG" && R.implSteps && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>🚀</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Implementation Checklist
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  ETA-Compliant Setup Steps
                </Text>
              </View>
            </View>

            {R.implSteps.map((s, i) => (
              <View key={i} style={[styles.checklistItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.checklistNumber, { backgroundColor: theme.border }]}>
                  <Text style={[styles.checklistNumberText, { color: theme.textSecondary }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.checklistText, { color: theme.text }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tax Calendar */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
              <Text style={styles.cardIconText}>📅</Text>
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Tax Calendar
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                Important Filing Deadlines
              </Text>
            </View>
          </View>

          {R.cal.map((ev, i) => (
            <View key={i} style={[styles.calendarItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.calendarIcon}>{ev.r ? "🔄" : "⏰"}</Text>
              <View style={styles.calendarContent}>
                <Text style={[styles.calendarTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{ev.e}</Text>
                <Text style={[styles.calendarDate, { color: theme.textSecondary }]}>Deadline: {ev.d}</Text>
              </View>
              <View style={[styles.calendarBadge, { backgroundColor: ev.r ? "#EFF6FF" : "#F3F4F6" }]}>
                <Text style={[styles.calendarBadgeText, { color: ev.r ? "#2563EB" : "#6B7280" }]}>
                  {ev.r ? "Recurring" : "One-time"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: "Inter_700Bold" }}>Disclaimer:</Text> Tax regulations are updated frequently. Engage a local tax advisor to ensure full compliance. Data reflects laws as of 2025/2026.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 20, gap: 16 },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardIconText: { fontSize: 22 },
  cardTitle: { fontSize: 16 },
  cardSubtitle: { fontSize: 11, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "30%", padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  statLabel: { fontSize: 10, textTransform: "uppercase", marginBottom: 4 },
  statValue: { fontSize: 14, marginBottom: 2 },
  statSub: { fontSize: 9 },
  rowGrid: { flexDirection: "row", gap: 12 },
  rowCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1 },
  rowLabel: { fontSize: 10, textTransform: "uppercase", marginBottom: 4 },
  rowValue: { fontSize: 16, marginBottom: 2 },
  rowSub: { fontSize: 9 },
  noteText: { padding: 12, borderRadius: 12, fontSize: 11, lineHeight: 16 },
  smeText: { fontSize: 13, lineHeight: 20, padding: 12, borderRadius: 12, backgroundColor: "#D1FAE5" },
  savingsText: { padding: 12, borderRadius: 12, fontSize: 13, textAlign: "center" },
  smallGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallCard: { flex: 1, minWidth: "40%", padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  smallLabel: { fontSize: 9, textTransform: "uppercase", marginBottom: 2 },
  smallValue: { fontSize: 12 },
  sectionTitle: { fontSize: 11, textTransform: "uppercase", marginTop: 4 },
  fieldItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  fieldNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fieldNumberText: { fontSize: 12 },
  fieldContent: { flex: 1 },
  fieldTitle: { fontSize: 13, marginBottom: 2 },
  fieldDesc: { fontSize: 10, lineHeight: 14 },
  updateItem: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  updateTitle: { fontSize: 13 },
  updateDesc: { fontSize: 11, lineHeight: 16 },
  checklistItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  checklistNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checklistNumberText: { fontSize: 12 },
  checklistText: { flex: 1, fontSize: 12, lineHeight: 16 },
  calendarItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  calendarIcon: { fontSize: 20 },
  calendarContent: { flex: 1 },
  calendarTitle: { fontSize: 13 },
  calendarDate: { fontSize: 10, marginTop: 2 },
  calendarBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  calendarBadgeText: { fontSize: 9 },
  disclaimer: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 8, marginBottom: 20 },
  disclaimerIcon: { fontSize: 18 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});