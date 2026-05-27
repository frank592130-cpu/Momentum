import React, { useCallback, useMemo, useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedBackground } from "./src/components/AnimatedBackground";
import { LoadingState } from "./src/components/Base";
import { BottomNav, TabId } from "./src/components/BottomNav";
import { MotionBanner, MotionScreen } from "./src/components/Motion";
import { GoalMetrics } from "./src/domain/models";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { GoalDetailScreen } from "./src/screens/GoalDetailScreen";
import { GoalsScreen } from "./src/screens/GoalsScreen";
import { PlannerScreen } from "./src/screens/PlannerScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AppProvider, useAppActions, useAppState } from "./src/store/AppStore";
import { AppThemeProvider, ThemeColors, useAppTheme } from "./src/theme";

function AppContent() {
  const { data } = useAppState();
  return (
    <AppThemeProvider preference={data.settings.themePreference}>
      <MomentumApp />
    </AppThemeProvider>
  );
}

function MomentumApp() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { isReady, error, toast } = useAppState();
  const actions = useAppActions();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [activeGoalId, setActiveGoalId] = useState<string | undefined>();
  const [showGoalDetail, setShowGoalDetail] = useState(false);
  const [settingsSubRouteActive, setSettingsSubRouteActive] = useState(false);

  const handleTabPress = useCallback((id: TabId) => {
    setActiveTab(id);
    if (id !== "goals") setShowGoalDetail(false);
    if (id !== "settings") setSettingsSubRouteActive(false);
  }, []);

  const handleGoalPress = useCallback((goal: GoalMetrics) => {
    setActiveGoalId(goal.id);
    setActiveTab("goals");
    setShowGoalDetail(true);
  }, []);
  const screenMotionKey = `${activeTab}:${showGoalDetail ? activeGoalId ?? "detail" : "list"}`;

  const renderScreen = () => {
    if (!isReady) return <LoadingState />;
    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen onGoalPress={handleGoalPress} />;
      case "planner":
        return <PlannerScreen />;
      case "goals":
        return showGoalDetail && activeGoalId ? (
          <GoalDetailScreen goalId={activeGoalId} onBack={() => setShowGoalDetail(false)} />
        ) : (
          <GoalsScreen onGoalPress={handleGoalPress} />
        );
      case "analytics":
        return <AnalyticsScreen />;
      case "settings":
        return <SettingsScreen onNavigate={handleTabPress} onSubRouteChange={setSettingsSubRouteActive} />;
      case "account":
        return <AccountScreen onBack={() => setActiveTab("dashboard")} />;
      default:
        return <DashboardScreen onGoalPress={handleGoalPress} />;
    }
  };

  const bottomOffset = activeTab === "account" ? insets.bottom + 20 : insets.bottom + 100;

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        

        <View style={styles.content}>
          <MotionScreen motionKey={screenMotionKey}>{renderScreen()}</MotionScreen>
        </View>

        {error ? (
          <MotionBanner style={[styles.errorBanner, { bottom: bottomOffset }]}>
            <Text style={styles.errorText} selectable>
              {error}
            </Text>
          </MotionBanner>
        ) : null}

        {toast ? (
          <MotionBanner style={[styles.toast, { bottom: bottomOffset }]}>
            <Text style={styles.toastText}>{toast.message}</Text>
            {toast.undoType ? (
              <TouchableOpacity onPress={actions.undoDelete} activeOpacity={0.75}>
                <Text style={styles.toastAction}>Undo</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={actions.clearToast} activeOpacity={0.75}>
              <Text style={styles.toastClose}>Close</Text>
            </TouchableOpacity>
          </MotionBanner>
        ) : null}

        {activeTab !== "account" && !(activeTab === "settings" && settingsSubRouteActive) && (
          <View style={[styles.navWrap, { bottom: insets.bottom }]}>
            <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("./src/theme").spacing, radiusValue: typeof import("./src/theme").radius) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      flex: 1,
    },
    navWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      backgroundColor: "transparent",
    },
    toast: {
      position: "absolute",
      left: spacingValue.xl,
      right: spacingValue.xl,
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
    },
    toastText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    toastAction: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
    },
    toastClose: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "700",
    },
    errorBanner: {
      position: "absolute",
      left: spacingValue.xl,
      right: spacingValue.xl,
      backgroundColor: colors.dangerSubtle,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
