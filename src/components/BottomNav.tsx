import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemeColors, useAppTheme } from "../theme";
import { MomentumIcon, MomentumIconName } from "./Icons";
import { motionCurves, usePressScale } from "./Motion";

export type TabId = "dashboard" | "planner" | "goals" | "analytics" | "settings" | "account";

const TABS: { id: TabId; icon: MomentumIconName; label: string }[] = [
  { id: "dashboard", icon: "today", label: "Today" },
  { id: "planner", icon: "planner", label: "Planner" },
  { id: "goals", icon: "goals", label: "Goals" },
  { id: "analytics", icon: "stats", label: "Stats" },
  { id: "settings", icon: "settings", label: "Settings" },
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface Props {
  activeTab: TabId;
  onTabPress: (id: TabId) => void;
}

export const BottomNav = React.memo(function BottomNav({ activeTab, onTabPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.pill}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return <NavTab key={tab.id} tab={tab} active={active} styles={styles} onPress={() => onTabPress(tab.id)} />;
      })}
    </View>
  );
});

function NavTab({
  tab,
  active,
  styles,
  onPress,
}: {
  tab: { id: TabId; icon: MomentumIconName; label: string };
  active: boolean;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const { pressScale, onPressIn, onPressOut } = usePressScale(0.94);
  const iconColor = active ? styles.iconActive.color : styles.iconInactive.color;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 260,
      easing: motionCurves.softPop,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  return (
    <AnimatedTouchableOpacity
      style={[styles.tab, { transform: [{ scale: pressScale }] }]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeIndicator,
          {
            opacity: progress,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.icon,
          {
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
        <MomentumIcon name={tab.icon} size={30} color={iconColor} strokeWidth={2.45} />
      </Animated.View>
      <Animated.Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{tab.label}</Animated.Text>
    </AnimatedTouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: colors.bgElevated,
      borderRadius: 36,
      paddingVertical: 10,
      paddingHorizontal: 6,
      marginHorizontal: 20,
      marginBottom: Platform.OS === "ios" ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingVertical: 6,
      position: "relative",
    },
    activeIndicator: {
      position: "absolute",
    },
    icon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    iconActive: {
      color: colors.accent,
    },
    iconInactive: {
      color: colors.textSecondary,
    },
    label: {
      fontSize: 9,
      letterSpacing: 0,
      fontWeight: "700",
    },
    labelActive: {
      color: colors.accent,
    },
    labelInactive: {
      color: colors.textTertiary,
    },
  });
}
