import React, { useMemo } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GoalMetrics, Task } from "../domain/models";
import { ThemeColors, ThemeMode, useAppTheme } from "../theme";
import { AppCard, RiskBadge, TagChip } from "./Base";
import { MiniBar, ProgressRing } from "./Charts";
import { useEntranceProgress } from "./Motion";
import { BlurView } from "expo-blur";

function getRiskColor(colors: ThemeColors, risk: GoalMetrics["risk"]) {
  return {
    low: colors.success,
    medium: colors.warning,
    high: colors.danger,
  }[risk];
}

interface GoalCardProps {
  goal: GoalMetrics;
  onPress?: () => void;
}

export const GoalCard = React.memo(function GoalCard({ goal, onPress }: GoalCardProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const riskColor = getRiskColor(colors, goal.risk);
  return (
    <AppCard onPress={onPress}>
      <View style={styles.goalHeader}>
        <View style={styles.goalHeaderText}>
          <Text style={[typography.label, styles.goalCategory]}>{goal.category.toUpperCase()}</Text>
          <Text style={[typography.titleMedium, styles.goalTitle]}>{goal.title}</Text>
        </View>
        <ProgressRing size={52} progress={goal.progress} color={riskColor} strokeWidth={4}>
          <Text style={[styles.ringLabel, { color: riskColor }]}>{goal.progress}%</Text>
        </ProgressRing>
      </View>

      <View style={styles.goalFooter}>
        <View style={styles.goalStats}>
          <View>
            <Text style={typography.micro}>Streak</Text>
            <Text style={styles.goalStatValue}>{goal.currentStreak}d</Text>
          </View>
          <View>
            <Text style={typography.micro}>Daily Target</Text>
            <Text style={styles.goalStatValue}>{goal.dailyTargetHours}h</Text>
          </View>
          <View>
            <Text style={typography.micro}>Days Left</Text>
            <Text style={styles.goalStatValue}>{goal.daysLeft}</Text>
          </View>
        </View>
        <View style={styles.goalRight}>
          <RiskBadge level={goal.risk} />
          <MiniBar data={goal.weeklyHours} color={riskColor} height={18} />
        </View>
      </View>
    </AppCard>
  );
});

type InsightType = "info" | "neutral" | "warning" | "positive";

interface InsightCardProps {
  icon: string;
  title: string;
  body: string;
  type?: InsightType;
}

export const InsightCard = React.memo(function InsightCard({ icon, title, body, type = "neutral" }: InsightCardProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const entrance = useEntranceProgress({ duration: 340 });
  const borderColor = {
    info: colors.accent,
    neutral: colors.accent,
    warning: colors.warning,
    positive: colors.success,
  }[type];
  const tint = mode === "dark" ? "dark" : "light";
  return (
    <Animated.View
      style={[
        styles.insightCard,
        { borderLeftColor: borderColor },
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <BlurView tint={tint} intensity={60} style={styles.blurBg} />
      <Text style={styles.insightIcon}>{icon}</Text>
      <View style={styles.insightBody}>
        <Text style={typography.titleSmall}>{title}</Text>
        <Text style={[typography.bodySmall, styles.insightText]}>{body}</Text>
      </View>
    </Animated.View>
  );
});

interface AnalyticsCardProps {
  title: string;
  value: string;
  trend: number;
  data: number[];
  color?: string;
}

export const AnalyticsCard = React.memo(function AnalyticsCard({ title, value, trend, data, color }: AnalyticsCardProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const up = trend >= 0;
  return (
    <AppCard>
      <View style={styles.analyticsRow}>
        <View style={styles.analyticsText}>
          <Text style={[typography.label, styles.analyticsLabel]}>{title.toUpperCase()}</Text>
          <Text style={styles.analyticsValue}>{value}</Text>
          <Text style={[styles.analyticsTrend, { color: up ? colors.success : colors.danger }]}>
            {up ? "+" : "-"} {Math.abs(trend)}% vs last week
          </Text>
        </View>
        <MiniTrendBars data={data} color={color ?? colors.accent} />
      </View>
    </AppCard>
  );
});

interface TimelineItemProps {
  task: Task;
  isLast?: boolean;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  goalTitles?: string[];
}

export const TimelineItem = React.memo(function TimelineItem({
  task,
  isLast,
  onToggle,
  onDelete,
  onEdit,
  goalTitles = [],
}: TimelineItemProps) {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const entrance = useEntranceProgress({ duration: 300 });
  const tint = mode === "dark" ? "dark" : "light";

  return (
    <Animated.View
      style={[
        styles.timelineRow,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.timelineLeft}>
        <Text style={styles.timelineTime}>{task.time}</Text>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>

      <View style={styles.timelineCardWrap}>
        <TouchableOpacity
          activeOpacity={onEdit ? 0.74 : 1}
          onPress={() => onEdit?.(task)}
          style={[
            styles.timelineCard,
            { borderLeftColor: task.done ? colors.textTertiary : colors.accent },
            task.done && styles.timelineCardDone,
          ]}
        >
          <BlurView tint={tint} intensity={30} style={styles.blurBg} />
          <View style={styles.timelineCardHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onToggle?.(task.id)}
              style={[styles.checkButton, task.done && styles.checkButtonDone]}
            >
              <Text style={[styles.checkText, task.done && styles.checkTextDone]}>{task.done ? "Done" : "Open"}</Text>
            </TouchableOpacity>
            <View style={styles.timelineTitleWrap}>
              <Text style={[typography.titleSmall, styles.timelineTitle, task.done && styles.timelineTitleDone]} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={typography.micro}>
                {task.duration} min{goalTitles.length ? ` / ${goalTitles.join(", ")}` : ""}
              </Text>
            </View>
            <TagChip label={task.tag} />
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

function MiniTrendBars({ data, color }: { data: number[]; color: string }) {
  const { colors, spacing, radius, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius, mode), [colors, spacing, radius, mode]);
  const normalized = data.length ? data : [0];
  const max = Math.max(...normalized, 1);
  const latest = normalized[normalized.length - 1] ?? 0;
  const average = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  return (
    <View style={styles.trendWrap}>
      <View style={styles.trendBars}>
        {normalized.map((value, index) => (
          <View key={`${value}-${index}`} style={styles.trendBarTrack}>
            <View
              style={[
                styles.trendBarFill,
                {
                  height: `${Math.max(10, (value / max) * 100)}%`,
                  backgroundColor: index === normalized.length - 1 ? color : `${color}80`,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.trendMeta}>
        <Text style={styles.trendMetaText}>Avg {Math.round(average)}</Text>
        <Text style={[styles.trendMetaText, { color }]}>Now {Math.round(latest)}</Text>
      </View>
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
    blurBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radiusValue.md,
      overflow: "hidden",
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacingValue.lg,
    },
    goalHeaderText: { flex: 1, marginRight: spacingValue.md },
    goalCategory: { marginBottom: 4 },
    goalTitle: { lineHeight: 22 },
    ringLabel: { fontSize: 11, fontWeight: "700" },
    goalFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    goalStats: { flexDirection: "row", gap: spacingValue.lg },
    goalStatValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
    goalRight: { alignItems: "flex-end", gap: spacingValue.xs },
    insightCard: {
      flexDirection: "row",
      gap: spacingValue.md,
      padding: spacingValue.md,
      paddingLeft: spacingValue.lg,
      backgroundColor: mode === "dark" ? "rgba(15, 15, 20, 0.6)" : "rgba(255, 255, 255, 0.6)",
      borderWidth: 1,
      borderLeftWidth: 2,
      borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      borderRadius: radiusValue.md,
      overflow: "hidden",
    },
    insightIcon: { fontSize: 15, marginTop: 1, color: colors.textPrimary },
    insightBody: { flex: 1, gap: 3 },
    insightText: { lineHeight: 18 },
    analyticsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacingValue.md,
    },
    analyticsText: { flex: 1 },
    analyticsLabel: { marginBottom: spacingValue.sm },
    analyticsValue: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.8 },
    analyticsTrend: { fontSize: 12, fontWeight: "600", marginTop: spacingValue.xs },
    timelineRow: {
      flexDirection: "row",
      gap: spacingValue.lg,
    },
    timelineLeft: {
      width: 48,
      alignItems: "center",
      flexShrink: 0,
    },
    timelineTime: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: "500",
      marginBottom: spacingValue.xs,
    },
    timelineLine: {
      width: 1,
      flex: 1,
      backgroundColor: colors.borderSubtle,
    },
    timelineCardWrap: {
      flex: 1,
      paddingBottom: spacingValue.md,
    },
    timelineCard: {
      backgroundColor: mode === "dark" ? "rgba(15, 15, 20, 0.6)" : "rgba(255, 255, 255, 0.6)",
      borderWidth: 1,
      borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      borderLeftWidth: 3,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
      gap: spacingValue.sm,
      overflow: "hidden",
    },
    timelineCardDone: {
      backgroundColor: mode === "dark" ? "rgba(20, 20, 25, 0.4)" : "rgba(240, 240, 240, 0.6)",
      borderColor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      opacity: 0.72,
    },
    timelineCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacingValue.sm,
    },
    timelineTitleWrap: {
      flex: 1,
      gap: 4,
    },
    timelineTitle: {
      flex: 1,
    },
    timelineTitleDone: {
      color: colors.textSecondary,
      fontWeight: "400",
      textDecorationLine: "line-through",
    },
    checkButton: {
      minWidth: 45,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: colors.borderSubtle,
      alignItems: "center",
    },
    checkButtonDone: {
      backgroundColor: colors.successSubtle,
    },
    checkText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "700",
    },
    checkTextDone: {
      color: colors.success,
    },
    trendWrap: { width: 112, gap: spacingValue.xs },
    trendBars: { height: 58, flexDirection: "row", alignItems: "flex-end", gap: 4 },
    trendBarTrack: {
      flex: 1,
      height: "100%",
      justifyContent: "flex-end",
      borderRadius: 4,
      backgroundColor: colors.borderSubtle,
      overflow: "hidden",
    },
    trendBarFill: { width: "100%", borderRadius: 4 },
    trendMeta: { flexDirection: "row", justifyContent: "space-between" },
    trendMetaText: { color: colors.textTertiary, fontSize: 9, fontWeight: "700" },
  });
}
