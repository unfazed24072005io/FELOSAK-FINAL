import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";

interface Member {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

export default function BookMembersScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState("");
  const [addRole, setAddRole] = useState<"viewer" | "editor">("viewer");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const myMembership = members.find((m) => m.userId === user?.id);
  const isOwner = myMembership?.role === "owner";
  const isEditor = isOwner || myMembership?.role === "editor";

  const fetchMembers = useCallback(async () => {
    if (!bookId) return;
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/books/${bookId}/members`, baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (_e) {
      console.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = useCallback(async () => {
    if (!addUsername.trim()) {
      setError("Enter a username");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await apiRequest("POST", `/api/books/${bookId}/members`, {
        username: addUsername.trim(),
        role: addRole,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddUsername("");
      setShowAdd(false);
      fetchMembers();
    } catch (e: any) {
      const msg = e.message || "Failed to add member";
      try {
        const parsed = JSON.parse(msg.split(":").slice(1).join(":").trim());
        setError(parsed.message || msg);
      } catch {
        setError(msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg);
      }
    } finally {
      setAdding(false);
    }
  }, [addUsername, addRole, bookId, fetchMembers]);

  const handleChangeRole = useCallback(
    (member: Member) => {
      if (!isOwner) return;
      const roles = ["viewer", "editor", "owner"].filter((r) => r !== member.role);
      Alert.alert(
        "Change Role",
        `Change ${member.displayName}'s role?`,
        [
          { text: "Cancel", style: "cancel" },
          ...roles.map((role) => ({
            text: role.charAt(0).toUpperCase() + role.slice(1),
            onPress: async () => {
              try {
                await apiRequest("PUT", `/api/books/${bookId}/members/${member.id}`, { role });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchMembers();
              } catch (_e) {
                Alert.alert("Error", "Failed to update role");
              }
            },
          })),
        ]
      );
    },
    [isOwner, bookId, fetchMembers]
  );

  const handleRemoveMember = useCallback(
    (member: Member) => {
      if (!isOwner) return;
      if (member.userId === user?.id) {
        Alert.alert("Cannot Remove", "You cannot remove yourself as owner.");
        return;
      }
      Alert.alert(
        "Remove Member",
        `Remove ${member.displayName} from this book?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await apiRequest("DELETE", `/api/books/${bookId}/members/${member.id}`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchMembers();
              } catch (_e) {
                Alert.alert("Error", "Failed to remove member");
              }
            },
          },
        ]
      );
    },
    [isOwner, user, bookId, fetchMembers]
  );

  const roleColor = (role: string) => {
    if (role === "owner") return theme.tint;
    if (role === "editor") return theme.income;
    return theme.textSecondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          Members
        </Text>
        {isEditor ? (
          <Pressable
            onPress={() => setShowAdd(!showAdd)}
            accessibilityLabel="Add member"
            accessibilityRole="button"
          >
            <Feather name={showAdd ? "x" : "user-plus"} size={20} color={theme.tint} />
          </Pressable>
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>

      {showAdd && (
        <View style={[styles.addSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TextInput
            style={[
              styles.addInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={addUsername}
            onChangeText={setAddUsername}
            placeholder="Enter username to add"
            placeholderTextColor={theme.textSecondary + "88"}
            autoCapitalize="none"
            autoCorrect={false}
            testID="add-member-input"
          />
          <View style={styles.roleToggle}>
            <Pressable
              onPress={() => setAddRole("viewer")}
              style={[
                styles.roleBtn,
                {
                  backgroundColor: addRole === "viewer" ? theme.textSecondary + "22" : "transparent",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.roleBtnText, { color: addRole === "viewer" ? theme.text : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Viewer
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAddRole("editor")}
              style={[
                styles.roleBtn,
                {
                  backgroundColor: addRole === "editor" ? theme.income + "22" : "transparent",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.roleBtnText, { color: addRole === "editor" ? theme.income : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Editor
              </Text>
            </Pressable>
          </View>
          {error ? (
            <Text style={[styles.addError, { color: theme.expense, fontFamily: "Inter_400Regular" }]}>
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={handleAddMember}
            disabled={adding}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: theme.tint, opacity: pressed || adding ? 0.7 : 1 },
            ]}
            testID="add-member-submit"
          >
            {adding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Add Member
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          scrollEnabled={!!members.length}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 40 },
          ]}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: roleColor(item.role) + "22" }]}>
                <Text style={[styles.memberInitial, { color: roleColor(item.role), fontFamily: "Inter_700Bold" }]}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {item.displayName}
                  {item.userId === user?.id ? " (You)" : ""}
                </Text>
                <Text style={[styles.memberUsername, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  @{item.username}
                </Text>
              </View>
              <Pressable
                onPress={() => handleChangeRole(item)}
                disabled={!isOwner}
                style={[styles.roleBadge, { backgroundColor: roleColor(item.role) + "22" }]}
              >
                <Text style={[styles.roleBadgeText, { color: roleColor(item.role), fontFamily: "Inter_500Medium" }]}>
                  {item.role}
                </Text>
              </Pressable>
              {isOwner && item.userId !== user?.id && (
                <Pressable
                  onPress={() => handleRemoveMember(item)}
                  accessibilityLabel={`Remove ${item.displayName}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, marginLeft: 4 }]}
                >
                  <Feather name="x-circle" size={18} color={theme.expense} />
                </Pressable>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <Feather name="users" size={36} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                No members found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17 },
  addSection: {
    padding: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  roleToggle: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  roleBtnText: { fontSize: 13 },
  addError: { fontSize: 13, textAlign: "center" },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#FFF", fontSize: 15 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: { fontSize: 17 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, marginBottom: 2 },
  memberUsername: { fontSize: 12 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 12, textTransform: "capitalize" },
  separator: { height: StyleSheet.hairlineWidth },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyText: { fontSize: 15 },
});
