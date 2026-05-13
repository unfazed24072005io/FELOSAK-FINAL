import { Feather } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import React from "react";
import Colors from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { Text } from "react-native";
function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs initialRouteName="index">
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>{t("books")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="debtors">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>inOut</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
        <Label>Inventory</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useLanguage();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: isDark ? "#0A1F15" : "#F7F5F0",
            web: isDark ? "#0A1F15" : "#F7F5F0",
          }),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          elevation: 0,
          height: Platform.OS === "web" ? 84 : undefined,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: "hidden",
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("books"),
          tabBarIcon: ({ color, size }) => {
            const { Feather } = require("@expo/vector-icons");
            return <Feather name="book-open" size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="debtors"
        options={{
          title: "Customer",
          tabBarIcon: ({ color, size }) => {
            const { Feather } = require("@expo/vector-icons");
            return <Feather name="users" size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
  name="invoices"
  options={{
    title: "Documents",
    tabBarLabel: "Documents",
    tabBarIcon: ({ color, size }) => (
      <Feather name="file-text" size={size} color={color} />
    ),
  }}
/>
      <Tabs.Screen
        name="store"
        options={{
          title: t("inventory"),
          tabBarIcon: ({ color, size }) => {
            const { Feather } = require("@expo/vector-icons");
            return <Feather name="shopping-bag" size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => {
            const { Feather } = require("@expo/vector-icons");
            return <Feather name="settings" size={size} color={color} />;
          },
        }}
      />
    </Tabs>
  );
}	

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}