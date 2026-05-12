import { Platform, Alert, Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme, ActivityIndicator } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { loadCurrency } from '@/utils/format';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Image } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import favicon from '@/assets/images/favicon.png';
import React, { useCallback, useMemo, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, CashBook, Transaction } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort, formatTime, formatDate, getCurrencySymbol, getCurrencyCode, subscribeToCurrencyChanges } from "@/utils/format";
import { getPaymentModeLabel } from "@/app/add-transaction";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
const screenWidth = Dimensions.get("window").width;

type SortOption = "lastUpdated" | "nameAtoZ" | "balanceHighLow" | "balanceLowHigh" | "lastCreated";
type DashFilter = "all" | "income" | "expense";

const AVAILABLE_ICONS = [
  "book", "shopping-bag", "coffee", "car", "home", "heart", "briefcase", 
  "gift", "dollar-sign", "credit-card", "smartphone", "watch", "camera", 
  "headphones", "airplay", "cloud", "sun", "moon", "star", "award",
  "trending-up", "trending-down", "bar-chart-2", "pie-chart", "activity"
];

interface ProfileData {
  name: string;
  phoneNumber: string;
  address: string;
  taxId: string;
  bankAccount: string;
  paymentLink: string;
  photo: string;  // Make sure this is here
}

const STORAGE_KEY = "user_profile_data";
const ORGANIZATION_KEY = "user_organization_data";

// ==================== PROFILE MODAL COMPONENT ====================
function ProfileModal({ visible, onClose, theme, isDark, onLogout, onDeleteAccount, onProfileUpdate }: { 
  visible: boolean; 
  onClose: () => void; 
  theme: typeof Colors.dark; 
  isDark: boolean; 
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onProfileUpdate?: () => void;
}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    phoneNumber: "",
    address: "",
    taxId: "",
    bankAccount: "",
    paymentLink: "",
    photo: "",
  });
  const [orgData, setOrgData] = useState({ organizationName: "", industry: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pickProfilePhoto = async () => {
  try {
    // For Web - use file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg,image/webp';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          // Check file size (limit to 2MB)
          if (file.size > 2 * 1024 * 1024) {
            Alert.alert("Error", "Image size should be less than 2MB");
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setProfile({ ...profile, photo: base64String });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }
    
    // For Native (iOS/Android)
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "We need access to your photos to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
      aspect: [1, 1],
    });
    
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setProfile({ ...profile, photo: `data:image/jpeg;base64,${asset.base64}` });
      } else if (asset.uri) {
        setProfile({ ...profile, photo: asset.uri });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image");
  }
};

const takeProfilePhoto = async () => {
  try {
    // For Web - camera not supported, use file input with capture
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg';
      input.capture = 'environment';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            Alert.alert("Error", "Image size should be less than 2MB");
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setProfile({ ...profile, photo: base64String });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }
    
    // For Native (iOS/Android)
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
      aspect: [1, 1],
    });
    
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setProfile({ ...profile, photo: `data:image/jpeg;base64,${asset.base64}` });
      } else if (asset.uri) {
        setProfile({ ...profile, photo: asset.uri });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error) {
    console.error("Error taking photo:", error);
    Alert.alert("Error", "Failed to take photo");
  }
};
  const loadProfile = async () => {
  if (!user) return;
  try {
    setLoading(true);
    const userId = user.id;
    
    const [savedData, savedOrg] = await Promise.all([
      AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`),
      AsyncStorage.getItem(`${ORGANIZATION_KEY}_${userId}`)
    ]);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log("Loaded photo data:", parsed.photo ? "Photo present" : "No photo");
      setProfile({
        name: parsed.name || "",
        phoneNumber: parsed.phoneNumber || "",
        address: parsed.address || "",
        taxId: parsed.taxId || "",
        bankAccount: parsed.bankAccount || "",
        paymentLink: parsed.paymentLink || "",
        photo: parsed.photo || "", // Make sure photo is loaded
      });
    }
    
    if (savedOrg) {
      const parsedOrg = JSON.parse(savedOrg);
      setOrgData({
        organizationName: parsedOrg.organizationName || "",
        industry: parsedOrg.industry || ""
      });
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (visible && user) {
      loadProfile();
    }
  }, [visible, user]);

  const saveProfile = async () => {
  if (!user) return;
  try {
    const userId = user.id;
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(profile));
    await AsyncStorage.setItem(`${ORGANIZATION_KEY}_${userId}`, JSON.stringify(orgData));
    
    if (onProfileUpdate) onProfileUpdate();
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
    onClose();
  } catch (error) {
    console.error("Error saving profile:", error);
    Alert.alert("Error", "Failed to save profile");
  }
};
  const handleLogoutPress = () => {
  Alert.alert(
    "Sign Out",
    "Are you sure you want to sign out?",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Sign Out", 
        style: "destructive", 
        onPress: async () => {
          // REMOVE THIS LINE:
          // await AsyncStorage.clear();
          onLogout();
        }
      }
    ]
  );
};

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            if (onDeleteAccount) {
              onDeleteAccount();
            } else {
              await AsyncStorage.clear();
              onLogout();
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalContent, { backgroundColor: isDark ? '#1f2937' : '#FFFFFF' }]}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.profileModalContent, { width: "95%", maxWidth: 500, backgroundColor: isDark ? '#1f2937' : '#FFFFFF' }]}>
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
                <Pressable onPress={isEditing ? () => {
                  Alert.alert(
                    "Profile Photo",
                    "Choose an option",
                    [
                      { text: "Take Photo", onPress: takeProfilePhoto },
                      { text: "Choose from Gallery", onPress: pickProfilePhoto },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                } : undefined}>
                  {profile.photo ? (
  <Image 
    source={{ uri: profile.photo }} 
    style={styles.profileAvatarImage}
    onError={() => console.log("Failed to load image, URI:", profile.photo?.substring(0, 100))}
  />
) : (
  <View style={[styles.profileAvatar, { backgroundColor: theme.tint + '20' }]}>
    <Feather name="user" size={32} color={theme.tint} />
  </View>
)}
                  {isEditing && (
                    <View style={styles.editPhotoBadge}>
                      <Feather name="camera" size={14} color="#FFF" />
                    </View>
                  )}
                </Pressable>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
              </View>

              {!isEditing ? (
                <>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Full Name</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.name || "Not set"}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.phoneNumber || "Not set"}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Address</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{profile.address || "Not set"}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Organization</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{orgData.organizationName || "Not set"}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>Industry</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{orgData.industry || "Not set"}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={[styles.profileInfoLabel, { color: theme.textSecondary }]}>GSTIN Number</Text>
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
                  
                  <Pressable onPress={() => setIsEditing(true)} style={[styles.profileEditBtn, { backgroundColor: theme.tint }]}>
                    <Feather name="edit-2" size={18} color="#FFF" />
                    <Text style={[styles.profileEditBtnText, { color: "#FFF" }]}>Edit Profile</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Full Name</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="Enter your name" placeholderTextColor={theme.textSecondary} value={profile.name} onChangeText={(text) => setProfile({ ...profile, name: text })} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Phone Number</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="+1 234 567 8900" placeholderTextColor={theme.textSecondary} value={profile.phoneNumber} onChangeText={(text) => setProfile({ ...profile, phoneNumber: text })} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Address</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="Your address" placeholderTextColor={theme.textSecondary} value={profile.address} onChangeText={(text) => setProfile({ ...profile, address: text })} multiline numberOfLines={2} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>GSTIN Number</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="GSTIN number" placeholderTextColor={theme.textSecondary} value={profile.taxId} onChangeText={(text) => setProfile({ ...profile, taxId: text })} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Bank Account</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="Bank Name - Account Number" placeholderTextColor={theme.textSecondary} value={profile.bankAccount} onChangeText={(text) => setProfile({ ...profile, bankAccount: text })} />
                  </View>
                  <View style={styles.profileField}>
                    <Text style={[styles.profileLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Payment Link</Text>
                    <TextInput style={[styles.profileInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: theme.text, borderColor: theme.border }]} placeholder="https://..." placeholderTextColor={theme.textSecondary} value={profile.paymentLink} onChangeText={(text) => setProfile({ ...profile, paymentLink: text })} />
                  </View>
                  <View style={styles.profileModalActions}>
                    <Pressable onPress={() => setIsEditing(false)} style={[styles.profileCancelBtn, { backgroundColor: theme.surface }]}><Text style={[styles.profileBtnText, { color: theme.text }]}>Cancel</Text></Pressable>
                    <Pressable onPress={saveProfile} style={[styles.profileSaveBtn, { backgroundColor: theme.tint }]}><Text style={[styles.profileBtnText, { color: "#FFF" }]}>Save</Text></Pressable>
                  </View>
                </>
              )}

              <View style={[styles.profileDivider, { backgroundColor: theme.border }]} />
              
              <Pressable onPress={handleDeleteAccount} style={[styles.profileDeleteBtn, { backgroundColor: theme.expense + '15', borderColor: theme.expense, marginBottom: 12 }]}>
                <Feather name="trash-2" size={20} color={theme.expense} />
                <Text style={[styles.profileDeleteText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>Delete Account</Text>
              </Pressable>
              
              <Pressable onPress={handleLogoutPress} style={[styles.profileLogoutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Feather name="log-out" size={20} color={theme.textSecondary} />
                <Text style={[styles.profileLogoutText, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>Sign Out</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Delete Account</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDeleteConfirm(false)} style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDeleteAccount} style={[styles.modalBtn, { backgroundColor: theme.expense }]}>
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

// ==================== TX ITEM COMPONENT ====================
// ==================== TX ITEM COMPONENT ====================
function TxItem({ tx, theme, onEdit, onDelete }: { tx: Transaction; theme: typeof Colors.dark; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void }) {
  if (!tx || !tx.id) return null;
  const isIncome = tx.type === "income";
  const modeLabel = tx.paymentMode && tx.paymentMode !== "cash" ? getPaymentModeLabel(tx.paymentMode) : null;
  
  return (
    <Pressable onPress={() => onEdit(tx)} onLongPress={() => onDelete(tx)} style={({ pressed }) => [styles.txItem, { backgroundColor: pressed ? theme.surface : "transparent" }]}>
      <View style={[styles.txIcon, { backgroundColor: isIncome ? theme.income + '15' : theme.expense + '15' }]}>
        <Feather name={isIncome ? "trending-up" : "trending-down"} size={20} color={isIncome ? theme.income : theme.expense} />
      </View>
      <View style={styles.txContent}>
        <View style={styles.txCatRow}>
          <Text style={[styles.txCat, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{tx.category}</Text>
          {modeLabel && <Text style={[styles.txPayMode, { color: theme.textSecondary }]}>• {modeLabel}</Text>}
        </View>
        {tx.note ? <Text style={[styles.txNote, { color: theme.textSecondary }]} numberOfLines={1}>{tx.note}</Text> : null}
        <View style={styles.txMeta}>
          <Text style={[styles.txDate, { color: theme.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmt, { color: isIncome ? theme.income : theme.expense, fontFamily: "Inter_600SemiBold" }]}>
          {isIncome ? "+" : "-"} {formatEGP(tx.amount)}
        </Text>
      </View>
    </Pressable>
  );
}

// ==================== BOOK DASHBOARD ====================
function BookDashboard() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  // ✅ Make sure transactions is included here
  const { activeBook, setActiveBook, transactions, deleteTransaction } = useApp();
  const { t } = useLanguage();

  const [filter, setFilter] = useState<DashFilter>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
useFocusEffect(
    useCallback(() => {
      loadCurrency();
    }, [])
  );
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);
useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing dashboard");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
const generatePDF = useCallback(async () => {
  if (!activeBook || !transactions || transactions.length === 0) {
    Alert.alert("No Data", "No transactions to export");
    return;
  }

  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const currencySymbol = getCurrencySymbol();
    const currencyCode = getCurrencyCode();
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });
    
    // HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${activeBook.name} - Transactions</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; margin: 0; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }
          .header h1 { color: #3B82F6; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0 0; font-size: 12px; }
          .summary { background: #F3F4F6; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
          .summary h3 { margin: 0 0 10px; color: #111; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .income { color: #22C55E; font-weight: bold; }
          .expense { color: #EF4444; font-weight: bold; }
          .balance { color: #3B82F6; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3B82F6; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
          .amount-income { color: #22C55E; font-weight: bold; }
          .amount-expense { color: #EF4444; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #E5E7EB; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${activeBook.name}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-row"><span>Total Income:</span><span class="income">${currencyCode} ${totalIncome.toLocaleString('en-EG')}</span></div>
          <div class="summary-row"><span>Total Expense:</span><span class="expense">${currencyCode} ${totalExpense.toLocaleString('en-EG')}</span></div>
          <div class="summary-row"><span>Net Balance:</span><span class="balance">${currencyCode} ${(totalIncome - totalExpense).toLocaleString('en-EG')}</span></div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Category</th><th>Payment</th><th>Note</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                <td>${t.type === 'income' ? 'Income' : 'Expense'}</td>
                <td>${t.category}</td>
                <td>${t.paymentMode || 'cash'}</td>
                <td>${t.note || '-'}</td>
                <td class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${t.type === 'income' ? '+' : '-'} ${currencyCode} ${t.amount.toLocaleString('en-EG')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Transactions: ${transactions.length}</p>
          <p>Generated from Felosak App</p>
        </div>
      </body>
      </html>
    `;
    
    if (Platform.OS === 'web') {
      const win = window.open();
      win?.document.write(htmlContent);
      win?.document.close();
      win?.print();
      Alert.alert("Success", "Print dialog opened. You can save as PDF.");
    } else {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
      Alert.alert("Success", "PDF generated and shared!");
    }
  } catch (error) {
    console.error("PDF Error:", error);
    Alert.alert("Error", "Failed to generate PDF: " + (error as Error).message);
  }
}, [activeBook, transactions]);
  const filtered = useMemo(() => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) return [];
    if (filter === "all") return transactions;
    return transactions.filter((t) => t?.type === filter);
  }, [transactions, filter]);

  const handleDelete = useCallback((tx: Transaction) => {
    if (!tx?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTxToDelete(tx);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (txToDelete?.id) {
      deleteTransaction(txToDelete.id);
    }
    setShowDeleteModal(false);
    setTxToDelete(null);
  }, [txToDelete, deleteTransaction]);

  const handleEdit = useCallback((tx: Transaction) => {
    if (!tx?.id) return;
    router.push({ pathname: "/add-transaction", params: { editId: tx.id } });
  }, []);

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Select a Book</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Select a book to view transactions</Text>
        </View>
      </View>
    );
  }

  return (
  <View style={[styles.container, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveBook(null); }} hitSlop={8} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
        <Feather name="arrow-left" size={24} color={theme.text} />
      </Pressable>
      <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" }]} numberOfLines={1}>{activeBook.name || "Book"}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Members Button */}
        <Pressable onPress={() => router.push("/members")} style={({ pressed }) => [styles.addBtn, { backgroundColor: '#8B5CF6', opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="users" size={18} color="#FFF" />
        </Pressable>
        {/* PDF Download Button */}
        <Pressable onPress={generatePDF} style={({ pressed }) => [styles.addBtn, { backgroundColor: '#EF4444', opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="download" size={18} color="#FFF" />
        </Pressable>
        {/* Add Transaction Button */}
        <Pressable onPress={() => router.push("/add-transaction")} style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="plus" size={18} color="#FFF" />
        </Pressable>
      </View>
    </View>

    <View style={[styles.filterRow, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {(["all", "income", "expense"] as DashFilter[]).map((f) => (
        <Pressable key={f} onPress={() => { Haptics.selectionAsync(); setFilter(f); }} style={[styles.filterTab, filter === f && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]}>
          <Text style={[styles.filterLabel, { color: filter === f ? theme.tint : theme.textSecondary }]}>
            {f === "all" ? (t("all") || "All") : f === "income" ? (t("income") || "Income") : (t("expense") || "Expense")}
          </Text>
        </Pressable>
      ))}
    </View>

    <FlatList
      data={filtered}
      keyExtractor={(item) => item?.id || Math.random().toString()}
renderItem={({ item }) => <TxItem key={`${item.id}-${currencyRefreshKey}`} tx={item} theme={theme} onEdit={handleEdit} onDelete={handleDelete} />}
      contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }, (!filtered || filtered.length === 0) && styles.emptyContainer]}
      ListEmptyComponent={
        <View style={styles.emptyContent}>
          <Feather name="inbox" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No transactions found</Text>
          <Pressable onPress={() => router.push("/add-transaction")} style={({ pressed }) => [styles.emptyBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.emptyBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>Add Transaction</Text>
          </Pressable>
        </View>
      }
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
    />

    <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? "#0A1F15" : "#FFFFFF" }]}>
          <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Confirm Delete</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{txToDelete ? `Delete "${txToDelete.category}" — ${formatEGP(txToDelete.amount)}?` : "Delete this transaction?"}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setShowDeleteModal(false)} style={[styles.modalBtn, { backgroundColor: theme.surface }]}><Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text></Pressable>
            <Pressable onPress={handleConfirmDelete} style={[styles.modalBtn, { backgroundColor: theme.expense }]}><Text style={[styles.modalBtnText, { color: "#FFF" }]}>Delete</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>
);
}

// ==================== BOOK CARD ====================
function BookCard({ book, theme, onPress, onLongPress, onIconChange }: { book: CashBook; theme: typeof Colors.dark; onPress: () => void; onLongPress: () => void; onIconChange?: (bookId: string, icon: string) => void }) {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const roleLabel = book.role === "owner" ? t("owner") : book.role === "editor" ? t("editor") : t("viewer");
  const [isHovered, setIsHovered] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  const handleIconSelect = (icon: string) => {
    if (onIconChange) onIconChange(book.id, icon);
  };
  
  return (
    <>
      <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} onHoverIn={() => setIsHovered(true)} onHoverOut={() => setIsHovered(false)} style={({ pressed: isPressed }) => [styles.bookCardInner, { transform: [{ translateY: pressed || isPressed || isHovered ? -6 : 0 }, { scale: pressed || isPressed ? 0.97 : (isHovered ? 1.02 : 1) }], shadowOpacity: pressed || isPressed || isHovered ? 0.3 : 0.2, shadowRadius: pressed || isPressed || isHovered ? 16 : 12, elevation: pressed || isPressed || isHovered ? 12 : 8 }]}>
        <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bookCardHighlight} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bookCardShadow} />
        <LinearGradient colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookCardLeftEdge} />
        
        <View style={styles.bookCardTop}>
          <Pressable onPress={() => setShowIconPicker(true)} style={({ pressed: iconPressed }) => [styles.bookIcon, { backgroundColor: theme.tint + "15", transform: [{ scale: iconPressed ? 0.95 : 1 }] }]}>
            <Feather name={(book.icon as any) || "book"} size={22} color={theme.tint} />
          </Pressable>
          <View style={[styles.bookBadge, { backgroundColor: book.isCloud ? theme.income + "15" : '#F3F4F6' }]}>
            <Text style={[styles.bookBadgeText, { color: book.isCloud ? theme.income : '#6B7280' }]}>{book.isCloud ? "Business" : "Personal"}</Text>
          </View>
        </View>
        
        <Text style={[styles.bookName, { color: '#111827' }]} numberOfLines={1}>{book.name}</Text>
        {book.description ? <Text style={[styles.bookDesc, { color: '#6B7280' }]} numberOfLines={2}>{book.description}</Text> : null}
        
        <View style={styles.bookFooter}>
          <View style={styles.bookFooterLeft}><Feather name="users" size={12} color="#9CA3AF" /><Text style={[styles.bookRole, { color: '#6B7280' }]}>{roleLabel}</Text></View>
          <View style={styles.bookFooterRight}><Text style={[styles.bookBalance, { color: theme.tint }]}>{formatEGPShort((book as any).balance || 0)}</Text><Feather name="chevron-right" size={14} color={theme.tint} /></View>
        </View>
      </Pressable>
      
      <IconPickerModal visible={showIconPicker} onClose={() => setShowIconPicker(false)} onSelectIcon={handleIconSelect} currentIcon={book.icon || "book"} theme={theme} isDark={isDark} />
    </>
  );
}

// ==================== BOOKS LIST VIEW ====================
function BooksListView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = Colors.light;
const { books, setActiveBook, deleteBook, updateBook, refreshBooks, activeBook } = useApp();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<CashBook | null>(null);
  const [showCannotDeleteModal, setShowCannotDeleteModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("lastUpdated");
  const [pendingSort, setPendingSort] = useState<SortOption>("lastUpdated");
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [loading, setLoading] = useState(false);
useFocusEffect(
    useCallback(() => {
      loadCurrency();
    }, [])
  );
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing books list");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
// Add this state
const [initialLoadDone, setInitialLoadDone] = useState(false);

// Add this useEffect to refresh once after initial load
useEffect(() => {
  // If no books found after 2 seconds, force a refresh
  if (!initialLoadDone && books.length === 0 && user) {
    const timer = setTimeout(async () => {
      console.log("🔄 No books found, forcing refresh...");
      await refreshBooks();
      setInitialLoadDone(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [books.length, user, initialLoadDone, refreshBooks]);
  // Load profile name and photo
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) {
        console.log("No user object yet");
        setIsLoadingName(false);
        return;
      }
      
      const userId = user.id;
      if (!userId) {
        console.log("No user.id available");
        setIsLoadingName(false);
        return;
      }
      
      try {
        console.log("Loading profile for user ID:", userId);
        const savedData = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
        console.log("Raw saved data:", savedData);
        
        if (savedData) {
          const profile = JSON.parse(savedData);
          console.log("Parsed profile:", profile);
          setProfileName(profile.name || "");
          setProfilePhoto(profile.photo || "");
        } else {
          console.log("No saved data found, using fallback");
          setProfileName(user.displayName || user.email?.split('@')[0] || "");
          setProfilePhoto("");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setProfileName(user.displayName || user.email?.split('@')[0] || "");
        setProfilePhoto("");
      } finally {
        setIsLoadingName(false);
      }
    };
    
    loadProfileData();
  }, [user]);

  const getGreetingName = () => {
    if (profileName) {
      return profileName.split(' ')[0];
    }
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "User";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);
      
      const booksQuery = query(collection(db, 'books'), where('userId', '==', user.id));
      const booksSnapshot = await getDocs(booksQuery);
      for (const bookDoc of booksSnapshot.docs) {
        await deleteDoc(bookDoc.ref);
      }
      
      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.id));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      for (const transactionDoc of transactionsSnapshot.docs) {
        await deleteDoc(transactionDoc.ref);
      }
      
      await user.delete();
      await AsyncStorage.clear();
      router.replace("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  }, [user]);

  // Calculate total balance from all transactions
  const [allBooksTotals, setAllBooksTotals] = useState({ totalBalance: 0, totalIncome: 0, totalExpense: 0 });
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!user) {
        setIsLoadingTransactions(false);
        return;
      }
      
      setIsLoadingTransactions(true);
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', user.id));
        const snapshot = await getDocs(q);
        const fetchedTransactions: Transaction[] = [];
        snapshot.forEach(doc => {
          fetchedTransactions.push({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now()
          } as Transaction);
        });
        setAllTransactions(fetchedTransactions);
      } catch (error) {
        console.error('Error fetching all transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    
    fetchAllTransactions();
  }, [user]);

  useEffect(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    allTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else if (transaction.type === 'expense') {
        totalExpense += transaction.amount;
      }
    });
    
    setAllBooksTotals({
      totalBalance: totalIncome - totalExpense,
      totalIncome: totalIncome,
      totalExpense: totalExpense
    });
  }, [allTransactions]);

  const getBookBalance = useCallback((bookId: string) => {
    let income = 0;
    let expense = 0;
    
    allTransactions.forEach(transaction => {
      if (transaction.bookId === bookId) {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else if (transaction.type === 'expense') {
          expense += transaction.amount;
        }
      }
    });
    
    return income - expense;
  }, [allTransactions]);

  const topPad = 40;
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  
  const sortedBooks = useMemo(() => {
    if (isLoadingTransactions) return [];
    
    const sorted = [...books];
    const booksWithBalance = sorted.map(book => ({
      ...book,
      balance: getBookBalance(book.id)
    }));
    
    switch (sortBy) {
      case "nameAtoZ": booksWithBalance.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "balanceHighLow": booksWithBalance.sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)); break;
      case "balanceLowHigh": booksWithBalance.sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0)); break;
      case "lastCreated": booksWithBalance.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
      default: booksWithBalance.sort((a, b) => ((b as any).updatedAt || b.createdAt || 0) - ((a as any).updatedAt || a.createdAt || 0)); break;
    }
    return booksWithBalance;
  }, [books, sortBy, getBookBalance, isLoadingTransactions]);
  
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
  
  const handleLogout = useCallback(async () => {
    setProfileModalVisible(false);
    // REMOVED AsyncStorage.clear() - data persists after logout
    await logout();
    router.dismissAll();
    router.replace("/auth");
  }, [logout]);

  // Refresh profile data after saving
  const refreshProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const savedData = await AsyncStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (savedData) {
        const profile = JSON.parse(savedData);
        setProfileName(profile.name || "");
        setProfilePhoto(profile.photo || "");
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  }, [user]);

  const chartData = [30, 32, 31, 34, 32, 35, 36];
  const chartHeight = 140;
  const chartWidth = screenWidth - 100;
  const padding = 20;
  const maxValue = Math.max(...chartData); 
  const minValue = Math.min(...chartData);
  const getYPosition = (value: number) => {
    const availableHeight = chartHeight - (padding * 2);
    return padding + availableHeight - ((value - minValue) / (maxValue - minValue || 1)) * availableHeight;
  };

  const generateLinePath = () => {
    const stepX = chartWidth / (chartData.length - 1);
    let path = "";
    chartData.forEach((value, index) => {
      const x = index * stepX;
      const y = getYPosition(value);
      if (index === 0) path += `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
    });
    return path;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <ProfileModal 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
        theme={theme} 
        isDark={isDark} 
        onLogout={handleLogout} 
        onDeleteAccount={handleDeleteAccount}
        onProfileUpdate={refreshProfileData}
      />
      
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.headerRow, { marginTop: 0 }]}>
          <Image source={favicon} style={styles.headerLogo} resizeMode="contain" />
          <Pressable onPress={() => setProfileModalVisible(true)} style={({ pressed }) => [styles.notificationBtn, { opacity: pressed ? 0.8 : 1 }]}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.headerAvatar} />
            ) : (
              <Feather name="user" size={22} color="#3B82F6" />
            )}
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
        
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.userNameText}>{getGreetingName()}!</Text>
        </View>

        <View style={styles.totalBalanceCard}>
  <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCardGradient} />
  <View style={styles.balanceCardContent}>
    <Text style={styles.balanceLabel}>Total Balance</Text>
    <Text style={styles.balanceAmount}>{getCurrencyCode()} {(allBooksTotals.totalBalance || 0).toLocaleString('en-EG')}</Text>
    
    <View style={styles.chartWrapper}>
              <Svg height={chartHeight} width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <Defs>
                  <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Path d={`${generateLinePath()} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#areaGradient)" opacity="0.3" />
                <Path d={generateLinePath()} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <Path d={`M ${chartWidth - 12} ${getYPosition(chartData[chartData.length - 1]) - 5} L ${chartWidth} ${getYPosition(chartData[chartData.length - 1])} L ${chartWidth - 12} ${getYPosition(chartData[chartData.length - 1]) + 5} Z`} fill="#FFFFFF" />
                {chartData.map((value, index) => {
                  const stepX = chartWidth / (chartData.length - 1);
                  const x = index * stepX;
                  const y = getYPosition(value);
                  return (
                    <React.Fragment key={index}>
                      <Circle cx={x} cy={y} r="6" fill="#FFFFFF" opacity="0.3" />
                      <Circle cx={x} cy={y} r="3.5" fill="#FFFFFF" />
                      <Circle cx={x} cy={y} r="1.5" fill="#3B82F6" />
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          </View>
        </View>

        <Text style={[styles.myBooksTitle, { color: "#000000" }]}>{t("myBooks")}</Text>

        {books.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="book-open" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t("noBooksYet")}{"\n"}{t("createBook")}</Text>
          </View>
        ) : (
          <View style={styles.booksGrid}>
            {sortedBooks.map((book) => (
  <View key={`${book.id}-${currencyRefreshKey}`} style={styles.bookCardWrapper}>
                <View style={styles.bookCardHeader}>
                  <View style={styles.bookHeaderLeft}>
                    <Pressable onPress={() => handleIconChange(book.id, AVAILABLE_ICONS[(AVAILABLE_ICONS.indexOf(book.icon || "book") + 1) % AVAILABLE_ICONS.length])} style={styles.bookIconSmall}>
                      <Feather name={(book.icon as any) || "book"} size={18} color="#3B82F6" />
                    </Pressable>
                    <Text style={styles.bookNameHeader} numberOfLines={1}>{book.name}</Text>
                  </View>
                </View>
                <View style={styles.bookTypeContainer}>
                  <View style={styles.bookTypeBadge}>
                    <Text style={[styles.bookTypeText, { color: book.isCloud ? '#3B82F6' : '#6B7280' }]}>{book.isCloud ? "Business" : "Personal"}</Text>
                  </View>
                </View>

                <View style={styles.bookCardBody}>
                  <View style={styles.balanceSection}>
                    <Text style={styles.balanceLabelSmall}>Balance</Text>
                    <Text style={styles.balanceAmountLarge}>{getCurrencyCode()} {(book.balance || 0).toLocaleString('en-EG')}</Text>
                  </View>
                  <View style={styles.bookActionsRow}>
                    <Pressable
                      onPress={() => handleDeleteBook(book)}
                      style={({ pressed }) => [
                        styles.deleteButtonSmall,
                        { opacity: pressed ? 0.7 : 1 }
                      ]}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </Pressable>
                    <Pressable onPress={() => handleOpenBook(book)} style={styles.arrowButton}>
                      <Feather name="arrow-right" size={24} color="#3B82F6" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/create-book"); }} style={({ pressed }) => [styles.createBookBtnFixed, { opacity: pressed ? 0.85 : 1 }]}>
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.createBookBtnText}>Create New Business</Text>
      </Pressable>
      
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={handleCancelDelete}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{t("deleteBook")}</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{bookToDelete ? t("deleteBookConfirm", { name: bookToDelete.name }) : ""}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={handleCancelDelete} style={[styles.modalBtn, { backgroundColor: theme.surface }]}><Text style={[styles.modalBtnText, { color: theme.text }]}>{t("cancel")}</Text></Pressable>
            <Pressable onPress={handleConfirmDelete} style={[styles.modalBtn, { backgroundColor: theme.expense }]}><Text style={[styles.modalBtnText, { color: "#FFF" }]}>{t("delete")}</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal visible={showCannotDeleteModal} transparent animationType="fade" onRequestClose={() => setShowCannotDeleteModal(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{t("cannotDelete")}</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{t("onlyOwnerDelete")}</Text>
          <View style={styles.modalActions}><Pressable onPress={() => setShowCannotDeleteModal(false)} style={[styles.modalBtn, { backgroundColor: theme.surface }]}><Text style={[styles.modalBtnText, { color: theme.text }]}>{t("cancel")}</Text></Pressable></View>
        </View></View>
      </Modal>

      <Modal visible={showSortModal} transparent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.sortModalOverlay} onPress={() => setShowSortModal(false)}>
          <Pressable style={[styles.sortModalContent, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.sortModalHeader}><Text style={[styles.sortModalTitle, { color: theme.text }]}>{t("sortBooksBy")}</Text><Pressable onPress={() => setShowSortModal(false)} hitSlop={8}><Feather name="x" size={20} color={theme.textSecondary} /></Pressable></View>
            {([{ key: "lastUpdated" as SortOption, label: t("lastUpdated"), icon: "clock" }, { key: "nameAtoZ" as SortOption, label: t("nameAtoZ"), icon: "type" }, { key: "balanceHighLow" as SortOption, label: t("netBalanceHighLow"), icon: "trending-up" }, { key: "balanceLowHigh" as SortOption, label: t("netBalanceLowHigh"), icon: "trending-down" }, { key: "lastCreated" as SortOption, label: t("lastCreated"), icon: "calendar" }]).map((opt) => (
              <Pressable key={opt.key} onPress={() => setPendingSort(opt.key)} style={[styles.sortOption, { backgroundColor: pendingSort === opt.key ? theme.tint + "12" : "transparent", borderColor: pendingSort === opt.key ? theme.tint : theme.border }]}>
                <View style={[styles.sortOptionRadio, { borderColor: pendingSort === opt.key ? theme.tint : theme.border }]}>{pendingSort === opt.key && <View style={[styles.sortOptionRadioInner, { backgroundColor: theme.tint }]} />}</View>
                <Feather name={opt.icon as any} size={16} color={pendingSort === opt.key ? theme.tint : theme.textSecondary} />
                <Text style={[styles.sortOptionText, { color: pendingSort === opt.key ? theme.tint : theme.text }]}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { setSortBy(pendingSort); setShowSortModal(false); Haptics.selectionAsync(); }} style={[styles.sortApplyBtn, { backgroundColor: theme.tint }]}><Text style={[styles.sortApplyBtnText]}>{t("apply")}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
// ==================== MAIN EXPORT ====================
export default function OverviewScreen() {
  const { activeBook } = useApp();
  if (activeBook) return <BookDashboard />;
  return <BooksListView />;
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { padding: 4, width: 40 },
  title: { fontSize: 20, flex: 1, textAlign: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  filterTab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterLabel: { fontSize: 15 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  emptyContainer: { flex: 1 },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnTxt: { color: "#FFF", fontSize: 15 },
  separator: { height: StyleSheet.hairlineWidth },
  txItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txContent: { flex: 1 },
  txCatRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txCat: { fontSize: 15, marginBottom: 3 },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  txDate: { fontSize: 12 },
  txPayMode: { fontSize: 12, flexShrink: 1 },
  dot: { fontSize: 12 },
  txNote: { fontSize: 12, flexShrink: 1 },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 32 },
  modalContent: { width: "100%", maxWidth: 340, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -25, marginLeft: -20},
  myBooksTitle: { fontSize: 34, marginBottom: 20, textAlign: "left" },
  headerLogo: { width: 160, height: 160, resizeMode: 'contain' },
  notificationBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: '#F3F4F6', position: 'relative' },
  notificationBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  greetingSection: { marginTop:-35, marginBottom: 28 },
  greetingText: { fontSize: 16, color: '#6B7280', fontFamily: "Inter_400Regular" },
  userNameText: { fontSize: 28, color: '#111827', fontFamily: "Inter_700Bold", marginTop: 4 },
  totalBalanceCard: { borderRadius: 24, marginBottom: 20, overflow: 'hidden', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 5}, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12, minHeight: 100, paddingBottom: -0 },
  balanceCardGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  balanceCardContent: { padding: 20 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: "Inter_400Regular"},
  balanceAmount: { fontSize: 20, color: '#FFFFFF', fontFamily: "Inter_700Bold"},
  chartWrapper: { marginTop: 8 },
  bookCardWrapper: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0' },
  bookCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bookHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookIconSmall: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  bookNameHeader: { fontSize: 16, color: '#111827', fontFamily: "Inter_600SemiBold", flex: 1, marginTop: -5 },
  bookMenuBtn: { padding: 4 },
  bookCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  balanceSection: { flex: 1 },
  balanceLabelSmall: { fontSize: 12, color: '#9CA3AF', fontFamily: "Inter_400Regular"},
  balanceAmountLarge: { fontSize: 20, color: '#3B82F6', fontFamily: "Inter_700Bold" },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  createBookBtnFixed: { position: 'absolute', bottom: 110, left: 55, right: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createBookBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: "Inter_600SemiBold" },
  bookTypeContainer: { marginBottom: 12 },
  bookTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 40, marginTop: -40 },
  bookTypeText: { fontSize: 11, fontWeight: '500' },
  emptyBox: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  booksGrid: { gap: 20, width: '100%' },
  profileModalContent: { borderRadius: 24, padding: 24, maxHeight: "80%" },
  profileModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  profileModalTitle: { fontSize: 20 },
  profileField: { marginBottom: 16 },
  profileLabel: { fontSize: 14, marginBottom: 8 },
  profileInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  profileModalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  profileCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  profileSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  profileBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileUserSection: { alignItems: "center", marginBottom: 24, position: 'relative' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  profileAvatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  editPhotoBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3B82F6', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileEmail: { fontSize: 14, marginBottom: 8 },
  profileDivider: { height: 1, marginVertical: 20 },
  profileLogoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  profileLogoutText: { fontSize: 16 },
  profileInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  profileInfoLabel: { fontSize: 14, flex: 1 },
  profileInfoValue: { fontSize: 14, flex: 2, textAlign: "right" },
  profileEditBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  profileEditBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  iconPickerContent: { width: "90%", maxWidth: 400, borderRadius: 24, padding: 20, maxHeight: "80%" },
  iconPickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  iconPickerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  iconOption: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
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
  bookCardInner: { borderRadius: 22, padding: 20, gap: 12, backgroundColor: '#FFFFFF', overflow: 'hidden', position: 'relative', borderRightWidth: 10, borderBottomWidth: 10, borderLeftWidth: 0.1, borderTopWidth: 0.1, borderRightColor: 'rgba(0,0,0,0.1)', borderTopColor: 'rgba(0,0,0,0.1)', borderLeftColor: 'rgba(0,0,0,0.1)', borderBottomColor: 'rgba(0,0,0,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  bookCardHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', borderTopLeftRadius: 22, borderTopRightRadius: 22, zIndex: 1, pointerEvents: 'none' },
  bookCardShadow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', borderBottomLeftRadius: 22, borderBottomRightRadius: 22, zIndex: 1, pointerEvents: 'none' },
  bookCardLeftEdge: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, borderTopLeftRadius: 22, borderBottomLeftRadius: 22, zIndex: 1, pointerEvents: 'none' },
  bookCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 2 },
  bookIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  bookBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bookBadgeText: { fontSize: 11, fontWeight: '600' },
  bookName: { fontSize: 18, fontWeight: '700', marginTop: 8, zIndex: 2 },
  bookDesc: { fontSize: 13, lineHeight: 19, zIndex: 2 },
  bookFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, zIndex: 2 },
  bookFooterLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  bookFooterRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  bookRole: { fontSize: 12, textTransform: "capitalize" },
  bookBalance: { fontSize: 14, fontWeight: '600' },
  menuCard: { position: "absolute", minWidth: 200, borderRadius: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: "hidden" },
  menuDivider: { height: StyleSheet.hairlineWidth },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15 },
  bookDeleteBtn: { marginBottom: -40, marginLeft: 290 },
  bookActionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  deleteButtonSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: "center", justifyContent: "center" },
  profileDeleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  profileDeleteText: { fontSize: 16 },
headerAvatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
  resizeMode: "cover",
},
});