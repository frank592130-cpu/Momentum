import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { RiskLevel } from "../domain/models";
import { ThemeColors, ThemeMode, useAppTheme } from "../theme";
import { useEntranceProgress, usePressScale } from "./Motion";
import { BlurView } from "expo-blur";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  onPress?: () => void;
}

export function AppCard({ children, style, glow, onPress }: AppCardProps) {
  const { colors, spacing, radius, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const cardStyle = [styles.card, glow && styles.cardGlow, style];
  const entrance = useEntranceProgress();
  const { pressScale, onPressIn, onPressOut } = usePressScale();
  const animatedCardStyle = [
    cardStyle,
    {
      opacity: entrance,
      transform: [
        {
          translateY: entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0],
          }),
        },
        { scale: pressScale },
      ],
    },
  ];

  const tint = mode === "dark" ? "dark" : "light";

  if (onPress) {
    return (
      <AnimatedTouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={animatedCardStyle}
      >
        <BlurView tint={tint} intensity={60} style={styles.blurBg} />
        {children}
      </AnimatedTouchableOpacity>
    );
  }
  return (
    <Animated.View style={animatedCardStyle}>
      <BlurView tint={tint} intensity={30} style={styles.blurBg} />
      {children}
    </Animated.View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, action, onAction }: SectionHeaderProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  return (
    <View style={styles.sectionHeader}>
      <View>
        {subtitle ? <Text style={[typography.label, styles.sectionSubtitle]}>{subtitle.toUpperCase()}</Text> : null}
        <Text style={typography.titleLarge}>{title}</Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, sub, color, style }: StatCardProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  return (
    <AppCard style={[styles.statCard, style]}>
      <Text style={[typography.label, styles.statLabel]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: color ?? colors.textPrimary }]}>{value}</Text>
      {sub ? <Text style={typography.bodySmall}>{sub}</Text> : null}
    </AppCard>
  );
}

function getRiskStyle(colors: ThemeColors, level: RiskLevel) {
  const riskMap = {
    low: { label: "Low Risk", bg: colors.successSubtle, color: colors.success },
    medium: { label: "Med Risk", bg: colors.warningSubtle, color: colors.warning },
    high: { label: "High Risk", bg: colors.dangerSubtle, color: colors.danger },
  };
  return riskMap[level];
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { colors, spacing, radius, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const risk = getRiskStyle(colors, level);
  return (
    <View style={[styles.badge, { backgroundColor: risk.bg }]}>
      <Text style={[styles.badgeText, { color: risk.color }]}>{risk.label}</Text>
    </View>
  );
}

function getTagStyle(colors: ThemeColors, label: string) {
  const tagMap: Record<string, { bg: string; color: string }> = {
    Focus: { bg: colors.accentSubtle, color: colors.accent },
    Meeting: { bg: colors.warningSubtle, color: colors.warning },
    Work: { bg: "rgba(90,90,120,0.15)", color: "#9090C0" },
    Health: { bg: colors.successSubtle, color: colors.success },
    Learning: { bg: "rgba(120,100,60,0.15)", color: "#C0A060" },
  };
  if (tagMap[label]) return tagMap[label];
  const palette = ["#5ED3F3", "#F06BA8", "#7DD87D", "#FF8F5C", "#B88CFF", "#45C7B8", "#F5C542"];
  const color = palette[Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
  return { bg: `${color}24`, color };
}

export function TagChip({ label }: { label: string }) {
  const { colors, spacing, radius, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const tag = getTagStyle(colors, label);
  return (
    <View style={[styles.tag, { backgroundColor: tag.bg }]}>
      <Text style={[styles.tagText, { color: tag.color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  return (
    <View style={styles.empty}>
      <Text style={typography.titleSmall}>{title}</Text>
      <Text style={[typography.bodySmall, styles.emptyBody]}>{body}</Text>
    </View>
  );
}

export function LoadingState({ label = "Loading Momentum" }: { label?: string }) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={typography.bodySmall}>{label}</Text>
    </View>
  );
}

function createStyles(
  colors: ThemeColors,
  spacingValue: typeof import("../theme").spacing,
  radiusValue: typeof import("../theme").radius,
  mode: ThemeMode
) {
  return StyleSheet.create({
    card: {
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
      borderWidth: 1,
      borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      backgroundColor: mode === "dark" ? "rgba(15, 15, 20, 0.6)" : "rgba(255, 255, 255, 0.6)",
    },
    cardGlow: {
      borderColor: colors.accent,
      shadowColor: mode === "dark" ? "rgba(147, 51, 234, 0.6)" : "rgba(0,0,0,0.12)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 6,
    },
    blurBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radiusValue.lg,
      overflow: "hidden",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: spacingValue.lg,
    },
    sectionSubtitle: {
      marginBottom: 4,
    },
    sectionAction: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "600",
    },
    statCard: {
      flex: 1,
    },
    statLabel: {
      marginBottom: spacingValue.sm,
    },
    statValue: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.8,
      lineHeight: 32,
    },
    badge: {
      paddingHorizontal: spacingValue.sm,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    tag: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
    },
    tagText: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    empty: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radiusValue.md,
      padding: spacingValue.lg,
      gap: spacingValue.xs,
    },
    emptyBody: {
      lineHeight: 18,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacingValue.md,
      backgroundColor: colors.bg,
    },
  });
}
