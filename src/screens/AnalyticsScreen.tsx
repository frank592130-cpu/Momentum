import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "../components/Base";
import { AnalyticsCard } from "../components/Cards";
import { lastNDays, toDateKey } from "../domain/date";
import { getAnalyticsData, getAnalyticsTrends, getCompletedFocusHours, getTasksForDate } from "../domain/stats";
import { useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

export function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const today = toDateKey();
  const analytics = useMemo(() => getAnalyticsData(data.goals, data.tasks, today), [data.goals, data.tasks, today]);
  const trends = useMemo(() => getAnalyticsTrends(data.goals, data.tasks, today), [data.goals, data.tasks, today]);
  const heatmap = useMemo(
    () => lastNDays(30, today).map((dateKey) => getCompletedFocusHours(getTasksForDate(data.tasks, dateKey))),
    [data.tasks, today],
  );
  const maxHeat = Math.max(...heatmap, 1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Analytics</Text>
        <Text style={styles.title}>Performance{"\n"}Overview</Text>
      </View>

      <View style={styles.cardList}>
        <AnalyticsCard
          title="Goal Success Rate"
          value={`${analytics.avgGoalSuccessRate}%`}
          trend={trends.success}
          data={analytics.successTrend}
          color={colors.accent}
        />
        <AnalyticsCard
          title="Weekly Task Completion"
          value={`${analytics.weeklyCompletionRate}%`}
          trend={trends.completion}
          data={analytics.weeklyCompletion}
          color={colors.success}
        />
        <AnalyticsCard
          title="Avg Daily Work Hours"
          value={`${analytics.avgDailyFocusHours}h`}
          trend={trends.focus}
          data={analytics.focusHours}
          color={colors.warning}
        />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Time Distribution" subtitle="This Week" />
        <View style={styles.distList}>
          {analytics.workloadDist.length ? (
            analytics.workloadDist.map((workload, index) => {
              const barColors = [colors.accent, colors.warning, colors.success, colors.textTertiary, colors.danger];
              const color = barColors[index % barColors.length];
              return (
                <View key={workload.label}>
                  <View style={styles.distRow}>
                    <View style={styles.distLabelRow}>
                      <View style={[styles.distDot, { backgroundColor: color }]} />
                      <Text style={styles.distLabel}>{workload.label}</Text>
                    </View>
                    <Text style={[styles.distPct, { color }]}>{workload.pct}%</Text>
                  </View>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${workload.pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={typography.bodySmall}>No workload data yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Consistency" subtitle="30 Days" />
        <View style={styles.heatmap}>
          {heatmap.map((hours, index) => {
            const intensity = hours / maxHeat;
            const backgroundColor = intensity > 0.66 ? colors.accent : intensity > 0.25 ? colors.accentGlow : colors.border;
            return <View key={`${hours}-${index}`} style={[styles.heatCell, { backgroundColor }]} />;
          })}
        </View>
        <View style={styles.heatStats}>
          {[
            { label: "Active Days", value: `${analytics.activeDays30}/30`, color: colors.textPrimary },
            { label: "Streak", value: `${analytics.streakDays} days`, color: colors.accent },
            { label: "Best Week", value: analytics.bestWeekLabel, color: colors.success },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1 }}>
              <Text style={typography.micro}>{item.label}</Text>
              <Text style={[styles.heatStatValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

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
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
    },
    distList: { gap: spacingValue.md },
    distRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacingValue.xs },
    distLabelRow: { flexDirection: "row", alignItems: "center", gap: spacingValue.sm },
    distDot: { width: 8, height: 8, borderRadius: 4 },
    distLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
    distPct: { fontSize: 14, fontWeight: "800" },
    distTrack: { height: 5, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
    distFill: { height: "100%", borderRadius: 4, opacity: 0.9 },
    heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    heatCell: { width: 16, height: 16, borderRadius: 3 },
    heatStats: { flexDirection: "row", marginTop: spacingValue.lg, gap: spacingValue.md },
    heatStatValue: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  });
}
