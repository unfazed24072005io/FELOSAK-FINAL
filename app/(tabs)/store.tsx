import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Product } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP } from "@/utils/format";
import { getApiUrl } from "@/lib/query-client";

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { products, activeBook, updateProduct, deleteProduct } = useApp();
  const { t } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleShare = useCallback(async () => {
    if (!activeBook) return;
    const url = getApiUrl() + "/store/" + activeBook.id;
    try {
      if (Platform.OS === "web") {
        (window as any).open(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.error("Failed to open store URL", e);
    }
  }, [activeBook]);

  const handleLongPress = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteTargetId(product.id);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTargetId) {
      deleteProduct(deleteTargetId);
    }
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  }, [deleteTargetId, deleteProduct]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  }, []);

  const handleToggleStock = useCallback((product: Product) => {
    Haptics.selectionAsync();
    updateProduct(product.id, { inStock: !product.inStock });
  }, [updateProduct]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <Pressable
        onPress={() =>
          router.push({ pathname: "/add-product", params: { editId: item.id } })
        }
        onLongPress={() => handleLongPress(item)}
        style={({ pressed }) => [
          styles.productCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: theme.surface }]}>
            <Feather name="package" size={32} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
            {formatEGP(item.price)}
          </Text>
          {item.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: theme.tint + "22" }]}>
              <Text
                style={[styles.categoryText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
          ) : null}
          <View style={styles.stockRow}>
            <Text
              style={[
                styles.stockLabel,
                {
                  color: item.inStock ? theme.income : theme.expense,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {item.inStock ? t("inStock") : t("outOfStock")}
            </Text>
            <Switch
              value={item.inStock}
              onValueChange={() => handleToggleStock(item)}
              trackColor={{ false: theme.border, true: theme.income + "66" }}
              thumbColor={item.inStock ? theme.income : theme.textSecondary}
              style={styles.stockSwitch}
            />
          </View>
        </View>
      </Pressable>
    ),
    [theme, t, handleLongPress, handleToggleStock]
  );

  if (!activeBook) {
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
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {t("store")}
          </Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("selectBookTransactions")}
          </Text>
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
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {t("store")}
        </Text>
        {activeBook.isCloud && (
        <Pressable
          testID="share-store-btn"
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareBtn,
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="share-2" size={18} color="#FFF" />
        </Pressable>
        )}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        scrollEnabled={products.length > 0}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: bottomPad + (Platform.OS === "web" ? 84 : 50) + 20,
          },
          !products.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="shopping-bag" size={44} color={theme.textSecondary} />
            <Text
              style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
            >
              {t("noProducts")}
            </Text>
            <Text
              style={[styles.emptySubtext, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            >
              {t("addFirstProduct")}
            </Text>
          </View>
        }
      />

      <Pressable
        testID="add-product-fab"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-product");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: bottomPad + (Platform.OS === "web" ? 84 : 50) + 16,
            backgroundColor: "#C9A84C",
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="plus" size={26} color="#FFF" />
      </Pressable>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("confirmDelete")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("confirmDeleteMessage")}
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
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 12, paddingTop: 12 },
  columnWrapper: { gap: 10 },
  emptyContainer: { flex: 1 },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 80,
  },
  emptyText: { fontSize: 17 },
  emptySubtext: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  productCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
    maxWidth: "49%" as any,
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    padding: 10,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 15,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 11,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  stockLabel: {
    fontSize: 11,
  },
  stockSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
