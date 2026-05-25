import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SectionHeader } from "../components/Base";
import { AnalyticsCard, InsightCard } from "../components/Cards";
import { lastNDays, toDateKey } from "../domain/date";
import { getAnalyticsData, getAnalyticsTrends, getAverage, getCompletedFocusHours, getGoalBalanceScore, getTasksForDate, round } from "../domain/stats";
import { useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

type AnalyticsDetailMode = "insights" | "goals" | "time";

export function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const [detailMode, setDetailMode] = useState<AnalyticsDetailMode>("insights");
  const today = toDateKey();
  const analytics = useMemo(() => getAnalyticsData(data.goals, data.tasks, today), [data.goals, data.tasks, today]);
  const trends = useMemo(() => getAnalyticsTrends(data.goals, data.tasks, today), [data.goals, data.tasks, today]);
  const goalTitleById = useMemo(() => Object.fromEntries(data.goals.map((goal) => [goal.id, goal.title])), [data.goals]);
  const goalProgressItems = useMemo(
    () => data.goals.map((goal) => analytics.goalProgressMap[goal.id]).filter(Boolean),
    [analytics.goalProgressMap, data.goals],
  );
  const balanceTrend = useMemo(
    () => lastNDays(7, today).map((dateKey) => getGoalBalanceScore(data.tasks, data.goals, dateKey)),
    [data.goals, data.tasks, today],
  );
  const heatmap = useMemo(
    () => lastNDays(30, today).map((dateKey) => getCompletedFocusHours(getTasksForDate(data.tasks, dateKey))),
    [data.tasks, today],
  );
  const maxHeat = Math.max(...heatmap, 1);
  const weeklyCompletionRate = Math.round(getAverage(analytics.overallWeeklyCompletion));
  const avgDailyFocusHours = round(getAverage(analytics.overallFocusHours), 1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Analytics</Text>
        <Text style={styles.title}>Performance{"\n"}Overview</Text>
      </View>

      <View style={styles.cardList}>
        <AnalyticsCard
          title="Daily Momentum"
          value={`${analytics.totalStreakDays} days`}
          trend={trends.streak}
          data={analytics.overallFocusHours}
          color={colors.accent}
        />
        <AnalyticsCard
          title="Goal Balance"
          value={`${analytics.goalBalanceScore}%`}
          trend={trends.balance}
          data={balanceTrend}
          color={colors.success}
        />
      </View>

      <View style={styles.modeRow}>
        {(["insights", "goals", "time"] as AnalyticsDetailMode[]).map((mode) => {
          const active = detailMode === mode;
          return (
            <TouchableOpacity key={mode} style={[styles.modeButton, active && styles.modeButtonActive]} onPress={() => setDetailMode(mode)}>
              <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{mode.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {detailMode === "insights" ? (
        <View style={styles.detailList}>
          {analytics.insights.map((insight) => (
            <InsightCard
              key={`${insight.type}-${insight.title}`}
              icon={insight.icon}
              title={insight.title}
              body={insight.body}
              type={insight.severity}
            />
          ))}
        </View>
      ) : null}

      {detailMode === "goals" ? (
        <View style={styles.card}>
          <SectionHeader title="Goal Progress" subtitle="This Week" />
          <View style={styles.goalProgressList}>
            {goalProgressItems.length ? (
              goalProgressItems.map((progress) => (
                <View key={progress.goalId} style={styles.goalProgressRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalProgressTitle}>{goalTitleById[progress.goalId]}</Text>
                    <Text style={typography.micro}>
                      {progress.weeklyProgress}/{progress.weeklyTarget} target days
                    </Text>
                  </View>
                  <View style={styles.goalProgressStats}>
                    <View>
                      <Text style={typography.micro}>Streak</Text>
                      <Text style={styles.goalProgressValue}>{progress.currentStreak}</Text>
                    </View>
                    <View>
                      <Text style={typography.micro}>Best</Text>
                      <Text style={styles.goalProgressValue}>{progress.longestStreak}</Text>
                    </View>
                    <View>
                      <Text style={typography.micro}>Trend</Text>
                      <Text style={[styles.goalProgressValue, { color: progress.velocityTrend >= 0 ? colors.success : colors.danger }]}>
                        {progress.velocityTrend >= 0 ? "+" : ""}
                        {progress.velocityTrend}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={typography.bodySmall}>Create goals and link tasks to see goal progress.</Text>
            )}
          </View>
        </View>
      ) : null}

      {detailMode === "time" ? (
        <View style={styles.card}>
          <SectionHeader title="Time" subtitle="This Week" />
          <View style={styles.timeStats}>
            {[
              { label: "Completion", value: `${weeklyCompletionRate}%`, color: colors.success },
              { label: "Avg Focus", value: `${avgDailyFocusHours}h`, color: colors.warning },
              { label: "Active Days", value: `${analytics.activeDays30}/30`, color: colors.accent },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1 }}>
                <Text style={typography.micro}>{item.label}</Text>
                <Text style={[styles.heatStatValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.heatmap}>
            {heatmap.map((hours, index) => {
              const intensity = hours / maxHeat;
              const backgroundColor = intensity > 0.66 ? colors.accent : intensity > 0.25 ? colors.accentGlow : colors.border;
              return <View key={`${hours}-${index}`} style={[styles.heatCell, { backgroundColor }]} />;
            })}
          </View>
          <View style={styles.heatStats}>
            <View style={{ flex: 1 }}>
              <Text style={typography.micro}>Active Days</Text>
              <Text style={[styles.heatStatValue, { color: colors.textPrimary }]}>{analytics.activeDays30}/30</Text>
            </View>
          </View>
        </View>
      ) : null}

    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    label: { marginBottom: 6, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.7, lineHeight: 36 },
    cardList: { gap: spacingValue.md },
    modeRow: { flexDirection: "row", gap: spacingValue.sm },
    modeButton: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    modeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    modeButtonText: { color: colors.textTertiary, fontSize: 11, fontWeight: "800" },
    modeButtonTextActive: { color: colors.accent },
    detailList: { gap: spacingValue.md },
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
    },
    goalProgressList: { gap: spacingValue.md },
    goalProgressRow: {
      gap: spacingValue.md,
      padding: spacingValue.md,
      borderRadius: radiusValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    goalProgressTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
    goalProgressStats: { flexDirection: "row", justifyContent: "space-between", gap: spacingValue.md },
    goalProgressValue: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    timeStats: {
      flexDirection: "row",
      gap: spacingValue.md,
      paddingBottom: spacingValue.md,
      marginBottom: spacingValue.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    distList: { gap: spacingValue.md },
    distRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacingValue.xs },
    distLabelRow: { flexDirection: "row", alignItems: "center", gap: spacingValue.sm },
    distDot: { width: 8, height: 8, borderRadius: 4 },
    distLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
    distPct: { fontSize: 14, fontWeight: "800" },
    distTrack: { height: 5, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
    distFill: { height: "100%", borderRadius: 4, opacity: 0.9 },
    heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: spacingValue.lg },
    heatCell: { width: 16, height: 16, borderRadius: 3 },
    heatStats: { flexDirection: "row", marginTop: spacingValue.lg, gap: spacingValue.md },
    heatStatValue: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  });
}
