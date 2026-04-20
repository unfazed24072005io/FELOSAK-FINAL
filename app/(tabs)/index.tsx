import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";
import { Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Image } from "react-native";
import Svg, { Path } from 'react-native-svg';
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
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

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - 60;

type SortOption = "lastUpdated" | "nameAtoZ" | "balanceHighLow" | "balanceLowHigh" | "lastCreated";
type DashFilter = "all" | "income" | "expense";
type DashPayFilter = "all" | string;

// Available icons for cash books
const AVAILABLE_ICONS = [
  "book", "shopping-bag", "coffee", "car", "home", "heart", "briefcase", 
  "gift", "dollar-sign", "credit-card", "smartphone", "watch", "camera", 
  "headphones", "airplay", "cloud", "sun", "moon", "star", "award",
  "trending-up", "trending-down", "bar-chart-2", "pie-chart", "activity"
];

// Profile data type
interface ProfileData {
  name: string;
  taxId: string;
  bankAccount: string;
  paymentLink: string;
}

const STORAGE_KEY = "user_profile_data";

const generateWavyPath = (data, height, maxValue, width) => {
  const stepX = width / (data.length - 1);
  let path = "";

  data.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxValue) * height;

    if (index === 0) {
      path += `M ${x} ${y}`;
    } else {
      const prevX = (index - 1) * stepX;
      const prevY = height - (data[index - 1] / maxValue) * height;

      const cp1X = prevX + stepX / 2;
      const cp1Y = prevY;

      const cp2X = x - stepX / 2;
      const cp2Y = y;

      path += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${y}`;
    }
  });

  return path;
};

// ==================== PROFILE MODAL COMPONENT (FULLY FIXED) ====================
// ==================== PROFILE MODAL COMPONENT (FIXED WITH ASYNCSTORAGE) ====================
function ProfileModal({ visible, onClose, theme, isDark, onLogout }: { visible: boolean; onClose: () => void; theme: typeof Colors.dark; isDark: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    taxId: "",
    bankAccount: "",
    paymentLink: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (visible && user) {
        try {
          const savedData = await AsyncStorage.getItem(`${STORAGE_KEY}_${user.uid}`);
          if (savedData) {
            setProfile(JSON.parse(savedData));
          } else {
            setProfile({
              name: user.displayName || user.email?.split('@')[0] || "",
              taxId: "",
              bankAccount: "",
              paymentLink: "",
            });
          }
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
    };
    loadProfile();
  }, [visible, user]);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.clear();
            onLogout();
          }
        }
      ]
    );
  };

  const saveProfile = async () => {
    if (user) {
      try {
        await AsyncStorage.setItem(`${STORAGE_KEY}_${user.uid}`, JSON.stringify(profile));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsEditing(false);
        onClose();
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.profileModalContent,
          {
            width: "95%",
            maxWidth: 500,
            backgroundColor: isDark ? '#1f2937' : '#FFFFFF',
          }
        ]}>
          <View style={styles.profileModalHeader}>
            <Text style={[styles.profileModalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {isEditing ? "Edit Profile" : "Profile"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileUserSection}>
              <View style={[styles.profileAvatar, { backgroundColor: theme.tint + '20' }]}>
                <Feather name="user" size={32} color={theme.tint} />
              </View>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
            </View>

            {!isEditing ? (
              // View Mode
              <>
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Full Name</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.name || "Not set"}</Text>
                </View>
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Tax ID / GSTIN</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.taxId || "Not set"}</Text>
                </View>
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Bank Account</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.bankAccount || "Not set"}</Text>
                </View>
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Payment Link</Text>
                  <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.paymentLink || "Not set"}</Text>
                </View>
                
                <Pressable
                  onPress={() => setIsEditing(true)}
                  style={({ pressed }) => [
                    styles.profileEditBtn,
                    {
                      backgroundColor: theme.tint,
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                >
                  <Feather name="edit-2" size={18} color="#FFF" />
                  <Text style={[styles.profileEditBtnText, { color: "#FFF" }]}>Edit Profile</Text>
                </Pressable>
              </>
            ) : (
              // Edit Mode
              <>
                <View style={styles.profileField}>
                  <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Full Name
                  </Text>
                  <TextInput
                    style={[
                      styles.profileInput,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        color: theme.text,
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.textSecondary}
                    value={profile.name}
                    onChangeText={(text) => setProfile({ ...profile, name: text })}
                  />
                </View>

                <View style={styles.profileField}>
                  <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Tax ID / GSTIN
                  </Text>
                  <TextInput
                    style={[
                      styles.profileInput,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        color: theme.text,
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder="Enter Tax ID"
                    placeholderTextColor={theme.textSecondary}
                    value={profile.taxId}
                    onChangeText={(text) => setProfile({ ...profile, taxId: text })}
                  />
                </View>

                <View style={styles.profileField}>
                  <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Bank Account
                  </Text>
                  <TextInput
                    style={[
                      styles.profileInput,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        color: theme.text,
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder="Bank Name - Account Number"
                    placeholderTextColor={theme.textSecondary}
                    value={profile.bankAccount}
                    onChangeText={(text) => setProfile({ ...profile, bankAccount: text })}
                  />
                </View>

                <View style={styles.profileField}>
                  <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Payment Link
                  </Text>
                  <TextInput
                    style={[
                      styles.profileInput,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        color: theme.text,
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder="https://..."
                    placeholderTextColor={theme.textSecondary}
                    value={profile.paymentLink}
                    onChangeText={(text) => setProfile({ ...profile, paymentLink: text })}
                  />
                </View>

                <View style={styles.profileModalActions}>
                  <Pressable
                    onPress={() => setIsEditing(false)}
                    style={({ pressed }) => [
                      styles.profileCancelBtn,
                      {
                        backgroundColor: theme.surface,
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Text style={[styles.profileBtnText, { color: theme.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveProfile}
                    style={({ pressed }) => [
                      styles.profileSaveBtn,
                      {
                        backgroundColor: theme.tint,
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Text style={[styles.profileBtnText, { color: "#FFF" }]}>Save</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={[styles.profileDivider, { backgroundColor: theme.border }]} />

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.profileLogoutBtn,
                {
                  backgroundColor: theme.expense + '15',
                  borderColor: theme.expense,
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
            >
              <Feather name="log-out" size={20} color={theme.expense} />
              <Text style={[styles.profileLogoutText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
                Sign Out
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==================== ICON PICKER MODAL ====================
function IconPickerModal({ visible, onClose, onSelectIcon, currentIcon, theme, isDark }: { visible: boolean; onClose: () => void; onSelectIcon: (icon: string) => void; currentIcon: string; theme: typeof Colors.dark; isDark: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.iconPickerContent, { backgroundColor: isDark ? '#1f2937' : '#FFFFFF' }]}>
          <View style={styles.iconPickerHeader}>
            <Text style={[styles.iconPickerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Choose Icon</Text>
            <Pressable onPress={onClose} hitSlop={8}><Feather name="x" size={24} color={theme.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.iconGrid}>
            {AVAILABLE_ICONS.map((icon) => (
              <Pressable key={icon} onPress={() => { onSelectIcon(icon); onClose(); }} style={[styles.iconOption, { backgroundColor: currentIcon === icon ? theme.tint + '20' : 'transparent', borderColor: currentIcon === icon ? theme.tint : theme.border }]}>
                <Feather name={icon as any} size={24} color={currentIcon === icon ? theme.tint : theme.textSecondary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==================== BOOK DASHBOARD COMPONENT ====================
function BookDashboard() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const {
    activeBook,
    setActiveBook,
    transactions,
    deleteTransaction,
  } = useApp();
  const { t } = useLanguage();

  const [menuVisible, setMenuVisible] = useState(false);
  const [entryFilter, setEntryFilter] = useState<DashFilter>("all");
  const [payFilter, setPayFilter] = useState<DashPayFilter>("all");
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // Filter Modal States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempEntryFilter, setTempEntryFilter] = useState<DashFilter>("all");
  const [tempPayFilter, setTempPayFilter] = useState<DashPayFilter>("all");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Sync temp filters when modal opens
  useEffect(() => {
    if (showFilterModal) {
      setTempEntryFilter(entryFilter);
      setTempPayFilter(payFilter);
    }
  }, [showFilterModal, entryFilter, payFilter]);

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
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={[styles.dashHeader, { marginTop: insets.top + 40 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveBook(null); }} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.dashHeaderCenter}>
          <Text style={[styles.dashTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {activeBook.name}
          </Text>
        </View>
        <View style={styles.dashHeaderRight}>
          {activeBook.isCloud && (
            <Pressable onPress={() => router.push({ pathname: "/book-members", params: { bookId: activeBook.id } })} hitSlop={6}>
              <Feather name="users" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Button */}
      <Pressable 
        onPress={() => setShowFilterModal(true)}
        style={({ pressed }) => [
          styles.filterButton,
          { 
            backgroundColor: (entryFilter !== "all" || payFilter !== "all") ? theme.tint : theme.card,
            borderColor: (entryFilter !== "all" || payFilter !== "all") ? theme.tint : theme.border,
            transform: [{ scale: pressed ? 0.97 : 1 }]
          }
        ]}
      >
        <Feather name="filter" size={18} color={(entryFilter !== "all" || payFilter !== "all") ? "#FFF" : theme.text} />
        <Text style={[
          styles.filterButtonText, 
          { color: (entryFilter !== "all" || payFilter !== "all") ? "#FFF" : theme.text }
        ]}>
          {t("filter")}
          {(entryFilter !== "all" || payFilter !== "all") && (
            <Text style={styles.filterBadge}> • Active</Text>
          )}
        </Text>
        {(entryFilter !== "all" || payFilter !== "all") && (
          <Pressable 
            onPress={(e) => { e.stopPropagation(); setEntryFilter("all"); setPayFilter("all"); }}
            style={styles.clearFilterIcon}
          >
            <Feather name="x" size={14} color="#FFF" />
          </Pressable>
        )}
      </Pressable>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad + 130 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.dashContent}>
            <View style={[styles.summaryCard]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>{t("netBalance")}</Text>
                <Text style={[styles.summaryValue, { color: filteredTotals.balance >= 0 ? "#10B981" : "#EF4444" }]}>₹ {filteredTotals.balance?.toLocaleString() || "0"}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>{t("totalInPlus")}</Text>
                <Text style={[styles.summaryIncome, { color: "#10B981" }]}>₹ {filteredTotals.income?.toLocaleString() || "0"}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>{t("totalOutMinus")}</Text>
                <Text style={[styles.summaryExpense, { color: "#EF4444" }]}>₹ {filteredTotals.expense?.toLocaleString() || "0"}</Text>
              </View>
            </View>
            <Text style={[styles.entryCount, { color: theme.textSecondary }]}>{t("showingEntries", { count: filtered.length, label: filtered.length === 1 ? t("entry") : t("entries") })}</Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHeader}><Text style={[styles.dateHeaderText, { color: theme.textSecondary }]}>{title}</Text></View>
        )}
        renderItem={({ item }) => (<EntryRow tx={item} theme={theme} onPress={() => { router.push({ pathname: "/add-transaction", params: { editId: item.id } }); }} />)}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 16 }]}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t("noEntriesYet")}{"\n"}{t("tapCashInOut")}</Text>
          </View>
        }
      />

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? bottomPad + 4 : Math.max(insets.bottom, 12), marginBottom: Platform.OS === "web" ? 84 : 80, backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/add-transaction", params: { type: "income" } }); }}
          style={({ pressed }) => [styles.cashInBtn, { backgroundColor: "#10B981", opacity: pressed ? 0.85 : 1 }]} testID="cash-in-btn">
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={[styles.cashBtnText]}>{t("cashInCaps")}</Text>
        </Pressable>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/add-transaction", params: { type: "expense" } }); }}
          style={({ pressed }) => [styles.cashOutBtn, { backgroundColor: "#EF4444", opacity: pressed ? 0.85 : 1 }]} testID="cash-out-btn">
          <Feather name="minus" size={18} color="#FFFFFF" />
          <Text style={[styles.cashBtnText]}>{t("cashOutCaps")}</Text>
        </Pressable>
      </View>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border, top: topPad + 48 }]}>
            <MenuItem icon="settings" label={t("bookSettings")} theme={theme} onPress={() => { setMenuVisible(false); router.push("/book-settings"); }} />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            {activeBook.isCloud && (<><MenuItem icon="users" label={t("teamMembers")} theme={theme} onPress={() => { setMenuVisible(false); router.push({ pathname: "/book-members", params: { bookId: activeBook.id } }); }} /><View style={[styles.menuDivider, { backgroundColor: theme.border }]} /></>)}
            <MenuItem icon="bar-chart-2" label={t("viewReports")} theme={theme} onPress={() => { setMenuVisible(false); router.push("/(tabs)/analytics" as any); }} />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            <MenuItem icon="download" label={t("generateReport")} theme={theme} onPress={() => { setMenuVisible(false); router.push("/generate-report" as any); }} />
            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
            <MenuItem icon="trash-2" label={t("deleteAllEntries")} theme={theme} color={theme.expense} onPress={handleDeleteAll} />
          </View>
        </Pressable>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal visible={showDeleteAllModal} transparent animationType="fade" onRequestClose={() => setShowDeleteAllModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t("deleteAllEntries")}</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{t("confirmDeleteMessage")}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDeleteAllModal(false)} style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 }]}><Text style={[styles.modalBtnText, { color: theme.text }]}>{t("cancel")}</Text></Pressable>
              <Pressable onPress={handleConfirmDeleteAll} style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 }]}><Text style={[styles.modalBtnText, { color: "#FFF" }]}>{t("delete")}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                {t("Filter") || "Filter Transactions"}
              </Text>
              <Pressable onPress={() => setShowFilterModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Entry Type Section */}
              <Text style={[styles.filterSectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("entryType") || "Entry Type"}
              </Text>
              <View style={styles.filterOptionsRow}>
                {[
                  { value: "all", label: t("all") || "All", icon: "list" },
                  { value: "income", label: t("cashIn") || "Income", icon: "trending-up" },
                  { value: "expense", label: t("cashOut") || "Expense", icon: "trending-down" },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setTempEntryFilter(option.value as DashFilter)}
                    style={({ pressed }) => [
                      styles.filterOption,
                      {
                        backgroundColor: tempEntryFilter === option.value ? theme.tint + "20" : theme.surface,
                        borderColor: tempEntryFilter === option.value ? theme.tint : theme.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      }
                    ]}
                  >
                    <Feather name={option.icon as any} size={18} color={tempEntryFilter === option.value ? theme.tint : theme.textSecondary} />
                    <Text style={[styles.filterOptionText, { color: tempEntryFilter === option.value ? theme.tint : theme.text }]}>
                      {option.label}
                    </Text>
                    {tempEntryFilter === option.value && (
                      <Feather name="check" size={16} color={theme.tint} />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Payment Mode Section */}
              <Text style={[styles.filterSectionLabel, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
                {t("paymentMode") || "Payment Mode"}
              </Text>
              <View style={styles.filterOptionsGrid}>
                {[
                  { value: "all", label: t("all") || "All", icon: "grid" },
                  { value: "cash", label: "Cash", icon: "dollar-sign" },
                  { value: "instapay", label: "Instapay", icon: "smartphone" },
                  { value: "vodafone_cash", label: "Vodafone Cash", icon: "phone" },
                  { value: "fawry", label: "Fawry", icon: "credit-card" },
                  { value: "bank_transfer", label: "Bank Transfer", icon: "building" },
                  { value: "international", label: "International", icon: "globe" },
                  { value: "cheque", label: "Cheque", icon: "file-text" },
                  { value: "other", label: "Other", icon: "more-horizontal" },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setTempPayFilter(option.value as DashPayFilter)}
                    style={({ pressed }) => [
                      styles.filterOptionGrid,
                      {
                        backgroundColor: tempPayFilter === option.value ? theme.tint + "20" : theme.surface,
                        borderColor: tempPayFilter === option.value ? theme.tint : theme.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      }
                    ]}
                  >
                    <Feather name={option.icon as any} size={16} color={tempPayFilter === option.value ? theme.tint : theme.textSecondary} />
                    <Text style={[styles.filterOptionGridText, { color: tempPayFilter === option.value ? theme.tint : theme.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Active Filters Summary */}
              {(tempEntryFilter !== "all" || tempPayFilter !== "all") && (
                <View style={[styles.activeFiltersSummary, { backgroundColor: theme.tint + "10", borderColor: theme.tint + "30" }]}>
                  <Feather name="filter" size={14} color={theme.tint} />
                  <Text style={[styles.activeFiltersText, { color: theme.textSecondary }]}>
                    Active filters: 
                    {tempEntryFilter !== "all" && ` ${tempEntryFilter === "income" ? "Income" : "Expense"}`}
                    {tempPayFilter !== "all" && ` • ${getPaymentModeLabel(tempPayFilter)}`}
                  </Text>
                </View>
              )}

              {/* Modal Actions */}
              <View style={styles.filterModalActions}>
                <Pressable
                  onPress={() => {
                    setTempEntryFilter("all");
                    setTempPayFilter("all");
                  }}
                  style={({ pressed }) => [
                    styles.filterResetBtn,
                    { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1 
                    }
                  ]}
                >
                  <Feather name="refresh-ccw" size={16} color={theme.textSecondary} />
                  <Text style={[styles.filterResetText, { color: theme.textSecondary }]}>{t("reset") || "Reset"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEntryFilter(tempEntryFilter);
                    setPayFilter(tempPayFilter);
                    setShowFilterModal(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  style={({ pressed }) => [
                    styles.filterApplyBtn,
                    { 
                      backgroundColor: theme.tint,
                      opacity: pressed ? 0.85 : 1 
                    }
                  ]}
                >
                  <Feather name="check" size={18} color="#FFF" />
                  <Text style={[styles.filterApplyText, { color: "#FFF" }]}>{t("apply") || "Apply"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== MENU ITEM ====================
function MenuItem({ icon, label, theme, color, onPress }: { icon: string; label: string; theme: typeof Colors.dark; color?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon as any} size={18} color={color || theme.text} />
      <Text style={[styles.menuItemText, { color: color || theme.text }]}>{label}</Text>
    </Pressable>
  );
}

// ==================== ENTRY ROW ====================
function EntryRow({ tx, theme, onPress }: { tx: Transaction & { runningBalance: number }; theme: typeof Colors.dark; onPress: () => void }) {
  const isIncome = tx.type === "income";
  const modeLabel = tx.paymentMode && tx.paymentMode !== "cash" ? getPaymentModeLabel(tx.paymentMode) : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.entryRow, { backgroundColor: pressed ? theme.surface : "transparent" }]}>
      <View style={styles.entryLeft}>
        <View style={styles.entryBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: isIncome ? theme.income + "18" : theme.expense + "18", borderColor: isIncome ? theme.income + "44" : theme.expense + "44" }]}>
            <Text style={[styles.categoryBadgeText, { color: isIncome ? theme.income : theme.expense }]}>{tx.category}</Text>
          </View>
          {modeLabel ? (<View style={[styles.paymentBadge, { backgroundColor: theme.tint + "15", borderColor: theme.tint + "33" }]}><Feather name="credit-card" size={10} color={theme.tint} /><Text style={[styles.paymentBadgeText, { color: theme.tint }]}>{modeLabel}</Text></View>) : null}
          {tx.attachment ? (<Feather name="paperclip" size={12} color={theme.textSecondary} />) : null}
        </View>
        {tx.note ? (<Text style={[styles.entryNote, { color: theme.text }]} numberOfLines={2}>{tx.note}</Text>) : null}
        <Text style={[styles.entryMeta, { color: theme.textSecondary }]}>Entry by You at {formatTime(tx.createdAt)}</Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, { color: isIncome ? theme.income : theme.expense }]}>{formatEGP(isIncome ? tx.amount : -tx.amount)}</Text>
        <Text style={[styles.entryBalance, { color: theme.textSecondary }]}>Balance: {formatEGP(tx.runningBalance)}</Text>
      </View>
    </Pressable>
  );
}

// ==================== BOOK CARD ====================
function BookCard({ book, theme, onPress, onLongPress, onIconChange, balance }: 
  { book: CashBook; theme: typeof Colors.dark; onPress: () => void; onLongPress: () => void; onIconChange?: (bookId: string, icon: string) => void; balance?: number }) {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const roleLabel = book.role === "owner" ? t("owner") : book.role === "editor" ? t("editor") : t("viewer");
  const [isHovered, setIsHovered] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  const handleIconSelect = (icon: string) => {
    if (onIconChange) {
      onIconChange(book.id, icon);
    }
  };
  
  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed: isPressed }) => [
          styles.bookCardInner,  // Directly use bookCardInner as the outer style
          {
            transform: [
              { translateY: pressed || isPressed || isHovered ? -6 : 0 },
              { scale: pressed || isPressed ? 0.97 : (isHovered ? 1.02 : 1) }
            ],
            shadowOpacity: pressed || isPressed || isHovered ? 0.3 : 0.2,
            shadowRadius: pressed || isPressed || isHovered ? 16 : 12,
            elevation: pressed || isPressed || isHovered ? 12 : 8,
          },
        ]}
        testID={`book-${book.id}`}
      >
        {/* Remove LinearGradient wrapper, keep only the inner content */}
        <LinearGradient
          colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bookCardHighlight}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bookCardShadow}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bookCardLeftEdge}
        />
        
        <View style={styles.bookCardTop}>
          <Pressable 
            onPress={() => setShowIconPicker(true)} 
            style={({ pressed: iconPressed }) => [
              styles.bookIcon, 
              { 
                transform: [{ scale: iconPressed ? 0.95 : 1 }]
              }
            ]}
          >
            <Feather name={(book.icon as any) || "book"} size={22} color={theme.tint} />
          </Pressable>
          <View style={[styles.bookBadge, {  }]}>
            <Text style={[styles.bookBadgeText, { color: book.isCloud ? theme.income : '#6B7280' }]}>
              {book.isCloud ? "Business" : "Personal"}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.bookName, { color: '#111827' }]} numberOfLines={1}>
          {book.name}
        </Text>
        
        {book.description ? (
          <Text style={[styles.bookDesc, { color: '#6B7280' }]} numberOfLines={2}>
            {book.description}
          </Text>
        ) : null}
        
        <View style={styles.bookFooter}>
          <View style={styles.bookFooterLeft}>
            <Feather name="users" size={12} color="#9CA3AF" />
            <Text style={[styles.bookRole, { color: '#6B7280' }]}>{roleLabel}</Text>
          </View>
          <View style={styles.bookFooterRight}>
    <Text style={[styles.bookBalance, { color: theme.tint }]}>
      {formatEGPShort(balance || 0)}
    </Text>
    <Feather name="chevron-right" size={14} color={theme.tint} />
  </View>
        </View>
      </Pressable>
      
      <IconPickerModal 
        visible={showIconPicker} 
        onClose={() => setShowIconPicker(false)} 
        onSelectIcon={handleIconSelect}
        currentIcon={book.icon || "book"}
        theme={theme}
        isDark={isDark}
      />
    </>
  );
}

// ==================== BOOKS LIST VIEW ====================
function BooksListView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = Colors.light;
  const { books, setActiveBook, deleteBook, updateBook, signOut } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<CashBook | null>(null);
  const [showCannotDeleteModal, setShowCannotDeleteModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("lastUpdated");
  const [pendingSort, setPendingSort] = useState<SortOption>("lastUpdated");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [bookBalances, setBookBalances] = useState<Record<string, number>>({});
  const [allBooksTotals, setAllBooksTotals] = useState({ totalBalance: 0, totalIncome: 0, totalExpense: 0 });
  const [isLoadingTotals, setIsLoadingTotals] = useState(true);

  // Debug user
  useEffect(() => {
    if (user) {
      console.log("MY CURRENT USER ID IS:", user.id);
    }
  }, [user]);

  // Get book balance function
  const getBookBalance = useCallback(async (bookId: string) => {
    if (!user || !user.id) return 0;
    
    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.id),
        where('bookId', '==', bookId)
      );
      const snapshot = await getDocs(transactionsQuery);
      
      let balance = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') {
          balance += data.amount || 0;
        } else if (data.type === 'expense') {
          balance -= data.amount || 0;
        }
      });
      return balance;
    } catch (error) {
      console.error("Error calculating book balance:", error);
      return 0;
    }
  }, [user]);

  // Fetch all transactions totals
  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!user || !user.id) {
        console.log("No user or ID available yet");
        setIsLoadingTotals(false);
        return;
      }
      
      setIsLoadingTotals(true);
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.id)
        );
        const snapshot = await getDocs(transactionsQuery);
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'income') {
            totalIncome += data.amount || 0;
          } else if (data.type === 'expense') {
            totalExpense += data.amount || 0;
          }
        });
        
        console.log("Fetched totals for user:", user.id, "Income:", totalIncome, "Expense:", totalExpense);
        
        setAllBooksTotals({
          totalBalance: totalIncome - totalExpense,
          totalIncome: totalIncome,
          totalExpense: totalExpense
        });
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoadingTotals(false);
      }
    };
    
    fetchAllTransactions();
  }, [user]);

  // Load individual book balances
  useEffect(() => {
    const loadAllBalances = async () => {
      if (!user || books.length === 0) return;
      
      const balances: Record<string, number> = {};
      for (const book of books) {
        const balance = await getBookBalance(book.id);
        balances[book.id] = balance;
      }
      setBookBalances(balances);
    };
    
    loadAllBalances();
  }, [books, user, getBookBalance]);

  const topPad = 40;
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  
  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "nameAtoZ": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "balanceHighLow": sorted.sort((a, b) => (bookBalances[b.id] || 0) - (bookBalances[a.id] || 0)); break;
      case "balanceLowHigh": sorted.sort((a, b) => (bookBalances[a.id] || 0) - (bookBalances[b.id] || 0)); break;
      case "lastCreated": sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
      default: sorted.sort((a, b) => ((b as any).updatedAt || b.createdAt || 0) - ((a as any).updatedAt || a.createdAt || 0)); break;
    }
    return sorted;
  }, [books, sortBy, bookBalances]);

  const handleDeleteBook = useCallback((book: CashBook) => {
    if (book.role !== "owner") { setShowCannotDeleteModal(true); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBookToDelete(book);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => { if (bookToDelete) { deleteBook(bookToDelete.id); } setShowDeleteModal(false); setBookToDelete(null); }, [bookToDelete, deleteBook]);
  const handleCancelDelete = useCallback(() => { setShowDeleteModal(false); setBookToDelete(null); }, []);
  const handleOpenBook = useCallback((book: CashBook) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveBook(book); }, [setActiveBook]);
  const handleIconChange = useCallback((bookId: string, icon: string) => { updateBook(bookId, { icon } as any); }, [updateBook]);
  
  const handleCreateBookPress = useCallback(() => {
    if (!user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowSignInModal(true);
      AsyncStorage.setItem('redirectAfterLogin', '/create-book');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push("/create-book");
    }
  }, [user]);

  const handleSignIn = useCallback(() => {
    setShowSignInModal(false);
    router.push("/auth");
  }, []);
  
  const handleLogout = useCallback(() => {
  setProfileModalVisible(false);
  
  AsyncStorage.clear();
  
  if (signOut) {
    signOut();
  }
  
  // Force navigation and prevent going back
  router.dismissAll();
  router.replace("/auth");
}, [signOut]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ProfileModal 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
        theme={theme} 
        isDark={isDark}
        onLogout={handleLogout}
      />
      
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.headerRow, { marginBottom: 20, marginTop: 0 }]}>
          <Image 
            source={{ uri: "https://i.ibb.co/b5k4pDfK/Whats-App-Image-2026-04-17-at-1-27-37-AM-removebg-preview.jpg" }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerBtns}>
            <Pressable onPress={() => setProfileModalVisible(true)} style={({ pressed }) => [styles.profileBtn, { backgroundColor: '#3B82F6', opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="user" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        
        <Text style={[styles.myBooksTitle, { color: "#000000" }]}>{t("myBooks")}</Text>

        <View style={styles.balanceCard}>
          <Image 
            source={{ uri: "https://i.ibb.co/ZRLnt45M/DDDD-removebg-preview.png" }} 
            style={{ 
              position: "absolute", 
              bottom: 0, 
              right: 0,
              width: 250,
              height: 130,
              resizeMode: "contain", 
              opacity: 1,
              zIndex: 1
            }} 
          />
          
          <View style={{ padding: 0, zIndex: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#6B7280", fontSize: 14, fontWeight: '500' }}>
                Total Balance (All Books)
              </Text>
              <Text style={{ fontSize: 16, color: (allBooksTotals.totalBalance || 0) >= 0 ? "#10B981" : "#EF4444" }}>
                {(allBooksTotals.totalBalance || 0) >= 0 ? "↗" : "↘"}
              </Text>
            </View>
            <Text style={{ color: "#111827", fontSize: 32, fontWeight: '700', marginTop: 8 }}>
              ₹ {(allBooksTotals.totalBalance || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {books.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="book-open" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t("noBooksYet")}{"\n"}{t("createBook")}</Text>
          </View>
        ) : (
          <View style={styles.booksGrid}>
            {sortedBooks.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                theme={theme} 
                onPress={() => handleOpenBook(book)} 
                onLongPress={() => handleDeleteBook(book)} 
                onIconChange={handleIconChange}
                balance={bookBalances[book.id] || 0}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable 
        onPress={handleCreateBookPress}
        style={({ pressed }) => [styles.fabOuter, { bottom: bottomPad + 80, transform: [{ scale: pressed ? 0.93 : 1 }] }]}
      >
        <View style={styles.fabWhiteOuterBorder}>
          <View style={styles.fabWhiteInnerBorder}>
            <View style={styles.fabBlueBackground}>
              <Feather name="plus" size={28} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </Pressable>

      <Modal visible={showSignInModal} transparent animationType="fade" onRequestClose={() => setShowSignInModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.profileAvatar, { backgroundColor: '#3B82F6', width: 60, height: 60, borderRadius: 30 }]}>
                <Feather name="log-in" size={28} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center' }]}>
              Sign In Required
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, textAlign: 'center' }]}>
              Please sign in to create a new book and manage your finances.
            </Text>
            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setShowSignInModal(false)} 
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1, flex: 1 }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleSignIn} 
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: '#3B82F6', opacity: pressed ? 0.8 : 1, flex: 1 }]}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={handleCancelDelete}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t("deleteBook")}</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{bookToDelete ? t("deleteBookConfirm", { name: bookToDelete.name }) : ""}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={handleCancelDelete} style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable onPress={handleConfirmDelete} style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>{t("delete")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCannotDeleteModal} transparent animationType="fade" onRequestClose={() => setShowCannotDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t("cannotDelete")}</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{t("onlyOwnerDelete")}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowCannotDeleteModal(false)} style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSortModal} transparent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.sortModalOverlay} onPress={() => setShowSortModal(false)}>
          <Pressable style={[styles.sortModalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.sortModalHeader}>
              <Text style={[styles.sortModalTitle, { color: theme.text }]}>{t("sortBooksBy")}</Text>
              <Pressable onPress={() => setShowSortModal(false)} hitSlop={8}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            {([{ key: "lastUpdated" as SortOption, label: t("lastUpdated"), icon: "clock" }, 
               { key: "nameAtoZ" as SortOption, label: t("nameAtoZ"), icon: "type" }, 
               { key: "balanceHighLow" as SortOption, label: t("netBalanceHighLow"), icon: "trending-up" }, 
               { key: "balanceLowHigh" as SortOption, label: t("netBalanceLowHigh"), icon: "trending-down" }, 
               { key: "lastCreated" as SortOption, label: t("lastCreated"), icon: "calendar" }]).map((opt) => (
              <Pressable key={opt.key} onPress={() => setPendingSort(opt.key)} style={({ pressed }) => [styles.sortOption, { backgroundColor: pendingSort === opt.key ? theme.tint + "12" : "transparent", borderColor: pendingSort === opt.key ? theme.tint : theme.border, opacity: pressed ? 0.7 : 1 }]}>
                <View style={[styles.sortOptionRadio, { borderColor: pendingSort === opt.key ? theme.tint : theme.border }]}>
                  {pendingSort === opt.key && <View style={[styles.sortOptionRadioInner, { backgroundColor: theme.tint }]} />}
                </View>
                <Feather name={opt.icon as any} size={16} color={pendingSort === opt.key ? theme.tint : theme.textSecondary} />
                <Text style={[styles.sortOptionText, { color: pendingSort === opt.key ? theme.tint : theme.text }]}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { setSortBy(pendingSort); setShowSortModal(false); Haptics.selectionAsync(); }} style={({ pressed }) => [styles.sortApplyBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.sortApplyBtnText]}>{t("apply")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ==================== MAIN EXPORT ====================
export default function OverviewScreen() {
  const { activeBook } = useApp();
  if (activeBook) { return <BookDashboard />; }
  return <BooksListView />;
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 0 },
  logoText: { fontSize: 24 },
  myBooksTitle: { fontSize: 34, marginBottom: 20, textAlign: "left" },
  
  balanceCard: {
    borderRadius: 22,  // Changed from 24 to match bookCardInner
    padding: 40,       // Changed from 28 to match bookCardInner
    gap: 12,           // Added to match bookCardInner
    backgroundColor: '#FFFFFF',  // Changed from rgba to solid white
    overflow: 'hidden',
    position: 'relative',
    
    // Borders only on right and bottom (matching bookCardInner)
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0.1,
    borderTopWidth: 0.1,
    borderRightColor: 'rgba(0, 0, 0, 0.1)',
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    
    // Shadow effects matching bookCardInner
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    
    marginBottom: 24,
},
  glassReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glassHighlight: {
    position: 'absolute',
    top: 5,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 2,
  },
  summaryCard: {
  borderRadius: 24,
  paddingTop: 16,
  paddingLeft: 16,
  paddingRight: 16,
  paddingBottom: 8,
  marginBottom: 16,
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',  // Solid white background
},
  
  // Profile Modal Styles
  profileModalContent: {
    borderRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  profileModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  profileModalTitle: { fontSize: 20 },
  profileField: { marginBottom: 16 },
  profileLabel: { fontSize: 14, marginBottom: 8 },
  profileInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  profileModalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  profileCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  profileSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  profileBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  
  profileUserSection: { alignItems: "center", marginBottom: 24 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  profileEmail: { fontSize: 14, marginBottom: 8 },
  profileDivider: { height: 1, marginVertical: 20 },
  profileLogoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  profileLogoutText: { fontSize: 16 },
  profileInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  profileInfoLabel: { fontSize: 14, flex: 1 },
  profileInfoValue: { fontSize: 14, flex: 2, textAlign: "right" },
  profileEditBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  profileEditBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  
  // Icon Picker Styles
  iconPickerContent: { width: "90%", maxWidth: 400, borderRadius: 24, padding: 20, maxHeight: "80%" },
  iconPickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  iconPickerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  iconOption: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  
  // FAB with Double Border
  // FAB with Blue Color & White Double Borders
fabOuter: {
  position: "absolute",
  right: 20,
  width: 68,
  height: 68,
  borderRadius: 34,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 12,
  top: 550
},
fabWhiteOuterBorder: {
  width: 66,
  height: 68,
  borderRadius: 34,
  backgroundColor: '#3B82F6',
  padding: 0.40,
},
fabWhiteInnerBorder: {
  width: 62,
  height: 62,
  borderRadius: 32,
  backgroundColor: '#FFFFFF',
  padding: 0.40,
},
fabBlueBackground: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#3B82F6',
  alignItems: "center",
  justifyContent: "center",
},
  
  // Book Card Styles
  bookCardOuter: {
    borderRadius: 24,
    padding: 2,
    backgroundColor: 'transparent',
    width: '100%',
  },
  bookCardGradientBorder: {
    borderRadius: 24,
    padding: 10,
    backgroundColor: 'transparent',
  },
  bookCardInner: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    // Remove these two lines:
    // borderWidth: 1,
    // borderColor: 'rgba(0, 0, 0, 0.08)',
    
    // Add individual borders for RIGHT and BOTTOM only:
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0.1,
    borderTopWidth: 0.1,
    borderRightColor: 'rgba(0, 0, 0, 0.1)',
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
},
  bookCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 1,
    pointerEvents: 'none',
  },
  bookCardShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    zIndex: 1,
    pointerEvents: 'none',
  },
  bookCardLeftEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    zIndex: 1,
    pointerEvents: 'none',
  },
  bookCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },bookIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    // Remove any backgroundColor
    // Remove any shadow
},

bookBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    // Remove any backgroundColor
    // Remove any shadow
},
  bookBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    zIndex: 2,
  },
  bookDesc: {
    fontSize: 13,
    lineHeight: 19,
    zIndex: 2,
  },
  bookFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    zIndex: 2,
  },
  bookFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookRole: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  bookBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  booksGrid: {
    gap: 20,
    width: '100%',
  },
  headerLogo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  profileBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBtns: { flexDirection: "row", gap: 8 },
  emptyBox: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  filterBar: { paddingVertical: 8 },
  filterBarContent: { paddingHorizontal: 16, gap: 8, flexDirection: "row", marginBottom: 10 },
  filterChip: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderRadius: 8, 
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13 },
  dashHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  dashHeaderCenter: { flex: 1 },
  dashTitle: { fontSize: 18 },
  dashHeaderRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  dashContent: { paddingHorizontal: 16, paddingTop: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 22 },
  summaryIncome: { fontSize: 16 },
  summaryExpense: { fontSize: 16 },
  entryCount: { textAlign: "center", fontSize: 13, marginBottom: 12 },
  dateHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dateHeaderText: { fontSize: 13 },
  entryRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.15)" },
  entryLeft: { flex: 1, gap: 4 },
  entryBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  paymentBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  paymentBadgeText: { fontSize: 10 },
  categoryBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  categoryBadgeText: { fontSize: 12 },
  entryNote: { fontSize: 14, marginTop: 2 },
  entryMeta: { fontSize: 11, marginTop: 2 },
  entryRight: { alignItems: "flex-end", justifyContent: "center", marginLeft: 12 },
  entryAmount: { fontSize: 17 },
  entryBalance: { fontSize: 11, marginTop: 2 },
  bottomBar: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  cashInBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashOutBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashBtnText: { color: "#FFFFFF", fontSize: 15 },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  menuCard: { position: "absolute", right: 16, minWidth: 200, borderRadius: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: "hidden" },
  menuDivider: { height: StyleSheet.hairlineWidth },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 32 },
  modalContent: { width: "100%", maxWidth: 340, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15 },
  sortModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sortModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  sortModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sortModalTitle: { fontSize: 17 },
  sortOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sortOptionRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  sortOptionRadioInner: { width: 10, height: 10, borderRadius: 5 },
  sortOptionText: { fontSize: 15, flex: 1 },
  sortApplyBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  sortApplyBtnText: { color: "#FFF", fontSize: 15 },
  reportImage: { width: 500, height: 80, marginTop: 50, backgroundColor: "transparent", resizeMode: "contain" },
// Filter Button
filterButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 30,
  borderWidth: 1,
  marginHorizontal: 16,
  marginVertical: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
filterButtonText: {
  fontSize: 15,
  fontFamily: "Inter_600SemiBold",
},
filterBadge: {
  fontSize: 12,
  fontWeight: "400",
},
clearFilterIcon: {
  marginLeft: 4,
  padding: 2,
},

// Filter Modal
filterModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "flex-end",
},
filterModalContent: {
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  maxHeight: "85%",
},
filterModalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
},
filterModalTitle: {
  fontSize: 20,
},
filterSectionLabel: {
  fontSize: 14,
  marginBottom: 12,
},
filterOptionsRow: {
  flexDirection: "row",
  gap: 12,
  marginBottom: 8,
},
filterOption: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
},
filterOptionText: {
  fontSize: 14,
  fontFamily: "Inter_500Medium",
},
filterOptionsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 8,
},
filterOptionGrid: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  borderWidth: 1,
  minWidth: "30%",
},
filterOptionGridText: {
  fontSize: 13,
  fontFamily: "Inter_500Medium",
},
activeFiltersSummary: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  padding: 12,
  borderRadius: 10,
  borderWidth: 1,
  marginTop: 20,
  marginBottom: 8,
},
activeFiltersText: {
  fontSize: 12,
  flex: 1,
},
filterModalActions: {
  flexDirection: "row",
  gap: 12,
  marginTop: 24,
  marginBottom: 8,
},
filterResetBtn: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
  borderWidth: 1,
},
filterResetText: {
  fontSize: 15,
  fontFamily: "Inter_600SemiBold",
},
filterApplyBtn: {
  flex: 2,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
},
filterApplyText: {
  fontSize: 15,
  fontFamily: "Inter_600SemiBold",
},
});