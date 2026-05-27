import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SectionHeader } from "../components/Base";
import { DonutChart } from "../components/Charts";
import { addDays, dateRange, diffInDays, formatDateLabel, lastNDays, parseDateKey, toDateKey } from "../domain/date";
import { Goal, Task } from "../domain/models";
import {
  getAverage,
  getCompletedFocusHours,
  getCompletionRate,
  getStreakDays,
  getTasksForDate,
  getTasksForGoal,
  getTrendPercent,
  normalizeDailyGoalHours,
  round,
} from "../domain/stats";
import { useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

type AnalyticsDetailMode = "trends" | "goals" | "patterns";
type LongTermScope = "30" | "90" | "365" | "all";

interface DailyStat {
  dateKey: string;
  focusHours: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  active: boolean;
}

interface TrendPoint {
  label: string;
  focusHours: number;
  completionRate: number;
  activeDays: number;
}

interface GoalConsistency {
  goalId: string;
  title: string;
  totalHours: number;
  activeDays: number;
  daysMet: number;
  eligibleDays: number;
  consistencyRate: number;
  bestStreak: number;
  trend: number;
}

interface GoalFocusSlice {
  id: string;
  label: string;
  hours: number;
  pct: number;
}

interface WeekdayPattern {
  index: number;
  label: string;
  focusHours: number;
  activeDays: number;
  completionRate: number;
}

interface LongTermStats {
  periodDays: number;
  dailyStats: DailyStat[];
  heatmapWeeks: DailyStat[][];
  trendPoints: TrendPoint[];
  periodCompletionRate: number;
  periodFocusHours: number;
  periodActiveDays: number;
  activeRate: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  lifetimeFocusHours: number;
  lifetimeCompletedTasks: number;
  lifetimeActiveDays: number;
  longestActiveStreak: number;
  focusTrend: number | null;
  completionTrend: number | null;
  goalRows: GoalConsistency[];
  goalFocusMix: GoalFocusSlice[];
  weekdayRows: WeekdayPattern[];
  bestWeekday?: WeekdayPattern;
  bestTrendPoint?: TrendPoint;
}

const scopeOptions: LongTermScope[] = ["30", "90", "365", "all"];
const detailModes: AnalyticsDetailMode[] = ["trends", "goals", "patterns"];
const weekdayOrder = [
  { index: 1, label: "Mon" },
  { index: 2, label: "Tue" },
  { index: 3, label: "Wed" },
  { index: 4, label: "Thu" },
  { index: 5, label: "Fri" },
  { index: 6, label: "Sat" },
  { index: 0, label: "Sun" },
];

export function AnalyticsScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const styles = useMemo(() => createStyles(colors, spacing, radius, compact), [colors, spacing, radius, compact]);
  const { data } = useAppState();
  const [detailMode, setDetailMode] = useState<AnalyticsDetailMode>("trends");
  const [scope, setScope] = useState<LongTermScope>("365");
  const today = toDateKey();
  const periodLabel = getScopeLabel(scope);
  const longTerm = useMemo(
    () => buildLongTermStats(data.goals, data.tasks, today, scope),
    [data.goals, data.tasks, scope, today],
  );
  const maxTrendHours = Math.max(...longTerm.trendPoints.map((point) => point.focusHours), 1);
  const maxWeekdayHours = Math.max(...longTerm.weekdayRows.map((row) => row.focusHours), 1);
  const maxHeat = Math.max(...longTerm.dailyStats.map((day) => day.focusHours), 1);
  const donutData = longTerm.goalFocusMix.slice(0, 5).map((item, index) => ({
    label: item.label,
    value: item.hours,
    color: getPaletteColor(colors, index),
  }));
  const overviewItems = [
    {
      label: "Done",
      value: `${longTerm.periodCompletionRate}%`,
      sub: `${longTerm.completedTasks}/${longTerm.totalTasks} tasks`,
      color: colors.success,
    },
    {
      label: "Focus",
      value: formatHours(longTerm.periodFocusHours),
      sub: longTerm.focusTrend === null ? "All focus" : `Focus ${formatTrend(longTerm.focusTrend)}`,
      color: colors.accent,
    },
    {
      label: "Active",
      value: `${longTerm.periodActiveDays}`,
      sub: `${longTerm.activeRate}% active`,
      color: colors.warning,
    },
    {
      label: "Best",
      value: `${longTerm.longestActiveStreak}d`,
      sub: `Now ${longTerm.currentStreak}d`,
      color: colors.textPrimary,
    },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={[typography.label, styles.label]}>Stats</Text>
        <Text style={styles.title}>Statistics</Text>
      </View>

      <View style={styles.scopeRow}>
        {scopeOptions.map((option) => {
          const active = scope === option;
          return (
            <TouchableOpacity key={option} style={[styles.scopeButton, active && styles.scopeButtonActive]} onPress={() => setScope(option)}>
              <Text style={[styles.scopeButtonText, active && styles.scopeButtonTextActive]}>{getScopeButtonLabel(option)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <SectionHeader title="Long-Term Overview" subtitle={periodLabel} />
        <View style={styles.overviewGrid}>
          {overviewItems.map((item) => (
            <View key={item.label} style={styles.overviewMetric}>
              <Text style={typography.micro}>{item.label}</Text>
              <Text selectable style={[styles.metricValue, { color: item.color }]}>
                {item.value}
              </Text>
              <Text style={styles.metricSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                {item.sub}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.lifetimeStrip}>
          <View>
            <Text style={typography.micro}>Since Start</Text>
            <Text selectable style={styles.lifetimeValue}>
              {formatHours(longTerm.lifetimeFocusHours)}
            </Text>
          </View>
          <Text style={styles.lifetimeMeta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            {formatLifetimeSummary(longTerm.lifetimeCompletedTasks, longTerm.lifetimeActiveDays)}
          </Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        {detailModes.map((mode) => {
          const active = detailMode === mode;
          return (
            <TouchableOpacity key={mode} style={[styles.modeButton, active && styles.modeButtonActive]} onPress={() => setDetailMode(mode)}>
              <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{mode.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {detailMode === "trends" ? (
        <View style={styles.detailList}>
          <View style={styles.card}>
            <SectionHeader
              title="Focus Trend"
              subtitle={scope === "365" || scope === "all" ? "Monthly history" : "Weekly history"}
            />
            <View style={styles.trendHeader}>
              <View>
                <Text selectable style={styles.trendValue}>
                  {formatHours(longTerm.periodFocusHours)}
                </Text>
                <View style={styles.trendBadgeRow}>
                  <Text style={styles.trendBadge} numberOfLines={1}>
                    Focus {formatTrend(longTerm.focusTrend, "All time")}
                  </Text>
                  <Text style={styles.trendBadge} numberOfLines={1}>
                    Done {formatTrend(longTerm.completionTrend, "All time")}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.trendBars}>
              {longTerm.trendPoints.map((point, index) => (
                <View key={`${point.label}-${index}`} style={styles.trendColumn}>
                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          height: `${Math.max(6, (point.focusHours / maxTrendHours) * 100)}%`,
                          backgroundColor: index === longTerm.trendPoints.length - 1 ? colors.accent : colors.accentGlow,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.trendBarLabel} numberOfLines={1}>
                    {point.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <SectionHeader title="Activity Map" subtitle={periodLabel} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapContent}>
              {longTerm.heatmapWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.heatWeek}>
                  {week.map((day) => (
                    <View
                      key={day.dateKey}
                      style={[
                        styles.heatCell,
                        {
                          backgroundColor: getHeatColor(colors, day.focusHours, maxHeat),
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={styles.heatStats}>
              <View>
                <Text style={typography.micro}>Active Rate</Text>
                <Text selectable style={styles.heatStatValue}>
                  {longTerm.activeRate}%
                </Text>
              </View>
              <View>
                <Text style={typography.micro}>Avg Active Day</Text>
                <Text selectable style={styles.heatStatValue}>
                  {formatHours(getAverage(longTerm.dailyStats.filter((day) => day.active).map((day) => day.focusHours)))}
                </Text>
              </View>
              <View>
                <Text style={typography.micro}>Latest</Text>
                <Text selectable style={styles.heatStatValue}>
                  {formatDateLabel(today)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {detailMode === "goals" ? (
        <View style={styles.detailList}>
          <View style={styles.card}>
            <SectionHeader title="Long-Term Focus Mix" subtitle={periodLabel} />
            <View style={styles.pieRow}>
              <View style={styles.pieWrap}>
                <DonutChart data={donutData} />
                <View style={styles.pieCenter}>
                  <Text selectable style={styles.pieCenterValue}>
                    {formatHours(longTerm.periodFocusHours)}
                  </Text>
                  <Text style={styles.pieCenterLabel}>focus</Text>
                </View>
              </View>
              <View style={styles.pieLegend}>
                {longTerm.goalFocusMix.length ? (
                  longTerm.goalFocusMix.slice(0, 5).map((item, index) => (
                    <View key={item.id} style={styles.pieLegendItem}>
                      <View style={[styles.pieDot, { backgroundColor: getPaletteColor(colors, index) }]} />
                      <View style={styles.pieLegendTextWrap}>
                        <Text style={styles.pieLegendLabel} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={typography.micro}>{formatHours(item.hours)}</Text>
                      </View>
                      <Text style={[styles.piePct, { color: getPaletteColor(colors, index) }]}>{item.pct}%</Text>
                    </View>
                  ))
                ) : (
                  <Text style={typography.bodySmall}>Link tasks to goals to see focus mix.</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <SectionHeader title="Goal Consistency" subtitle={periodLabel} />
            <View style={styles.goalProgressList}>
              {longTerm.goalRows.length ? (
                longTerm.goalRows.slice(0, 6).map((goal) => (
                  <View key={goal.goalId} style={styles.goalProgressRow}>
                    <View style={styles.goalProgressHeader}>
                      <View style={styles.goalProgressTitleWrap}>
                        <Text style={styles.goalProgressTitle} numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <Text style={typography.micro} numberOfLines={1}>
                          {goal.daysMet}/{goal.eligibleDays} days | {formatHours(goal.totalHours)}
                        </Text>
                      </View>
                      <Text selectable style={styles.goalProgressValue}>
                        {goal.consistencyRate}%
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${goal.consistencyRate}%` }]} />
                    </View>
                    <View style={styles.goalMetaRow}>
                      <Text style={styles.goalMetaText}>Best {goal.bestStreak}d</Text>
                      <Text style={[styles.goalMetaText, { color: goal.trend >= 0 ? colors.success : colors.danger }]}>
                        {formatTrend(goal.trend)} last 30d
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={typography.bodySmall}>Link tasks to goals to see consistency.</Text>
              )}
            </View>
          </View>
        </View>
      ) : null}

      {detailMode === "patterns" ? (
        <View style={styles.detailList}>
          <View style={styles.card}>
            <SectionHeader title="Weekly Rhythm" subtitle={periodLabel} />
            <View style={styles.weekdayList}>
              {longTerm.weekdayRows.map((row) => (
                <View key={row.label} style={styles.weekdayRow}>
                  <Text style={styles.weekdayLabel}>{row.label}</Text>
                  <View style={styles.weekdayTrack}>
                    <View
                      style={[
                        styles.weekdayFill,
                        {
                          width: `${Math.max(4, (row.focusHours / maxWeekdayHours) * 100)}%`,
                          backgroundColor: row.index === longTerm.bestWeekday?.index ? colors.success : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text selectable style={styles.weekdayValue}>
                    {formatHours(row.focusHours)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <SectionHeader title="Long-Range Baseline" subtitle="Lifetime" />
            <View style={styles.baselineGrid}>
              <View style={styles.baselineItem}>
                <Text style={typography.micro}>Completion</Text>
                <Text selectable style={styles.baselineValue}>
                  {longTerm.lifetimeCompletedTasks}
                </Text>
                <Text style={styles.metricSub}>done</Text>
              </View>
              <View style={styles.baselineItem}>
                <Text style={typography.micro}>Active Days</Text>
                <Text selectable style={styles.baselineValue}>
                  {longTerm.lifetimeActiveDays}
                </Text>
                <Text style={styles.metricSub}>history</Text>
              </View>
              <View style={styles.baselineItem}>
                <Text style={typography.micro}>Best Day</Text>
                <Text selectable style={styles.baselineValue}>
                  {longTerm.bestWeekday?.label ?? "None"}
                </Text>
                <Text style={styles.metricSub}>by focus hours</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function buildLongTermStats(goals: Goal[], tasks: Task[], todayKey: string, scope: LongTermScope): LongTermStats {
  const historicalTasks = tasks.filter((task) => diffInDays(task.date, todayKey) >= 0);
  const firstRelevantDate = getFirstRelevantDate(goals, historicalTasks, todayKey);
  const periodDates = scope === "all" ? dateRange(firstRelevantDate, todayKey) : lastNDays(Number(scope), todayKey);
  const periodDays = periodDates.length;
  const periodStart = periodDates[0] ?? todayKey;
  const previousStart = addDays(periodStart, -periodDays);
  const previousEnd = addDays(periodStart, -1);
  const lifetimeDates = dateRange(firstRelevantDate, todayKey);
  const periodTasks = getTasksInRange(historicalTasks, periodStart, todayKey);
  const previousTasks = scope === "all" ? [] : getTasksInRange(historicalTasks, previousStart, previousEnd);
  const dailyStats = buildDailyStats(historicalTasks, periodDates);
  const lifetimeDailyStats = buildDailyStats(historicalTasks, lifetimeDates);
  const trendPoints = buildTrendPoints(dailyStats, periodDays);
  const periodFocusHours = round(dailyStats.reduce((sum, day) => sum + day.focusHours, 0), 1);
  const previousFocusHours = getCompletedFocusHours(previousTasks);
  const periodActiveDays = dailyStats.filter((day) => day.active).length;
  const lifetimeActiveDays = lifetimeDailyStats.filter((day) => day.active).length;
  const goalRows = buildGoalConsistencyRows(goals, historicalTasks, periodDates, todayKey);
  const goalFocusMix = buildGoalFocusMix(goals, periodTasks);
  const weekdayRows = buildWeekdayRows(dailyStats);
  const bestWeekday = weekdayRows.slice().sort((a, b) => b.focusHours - a.focusHours)[0];
  const bestTrendPoint = trendPoints.slice().sort((a, b) => b.focusHours - a.focusHours)[0];

  return {
    periodDays,
    dailyStats,
    heatmapWeeks: chunkIntoWeeks(dailyStats),
    trendPoints,
    periodCompletionRate: getCompletionRate(periodTasks),
    periodFocusHours,
    periodActiveDays,
    activeRate: Math.round((periodActiveDays / Math.max(periodDays, 1)) * 100),
    totalTasks: periodTasks.length,
    completedTasks: periodTasks.filter((task) => task.done).length,
    currentStreak: getStreakDays(historicalTasks, todayKey),
    lifetimeFocusHours: getCompletedFocusHours(historicalTasks),
    lifetimeCompletedTasks: historicalTasks.filter((task) => task.done).length,
    lifetimeActiveDays,
    longestActiveStreak: getLongestActiveStreak(lifetimeDailyStats),
    focusTrend: scope === "all" ? null : getTrendPercent(periodFocusHours, previousFocusHours),
    completionTrend: scope === "all" ? null : getTrendPercent(getCompletionRate(periodTasks), getCompletionRate(previousTasks)),
    goalRows,
    goalFocusMix,
    weekdayRows,
    bestWeekday,
    bestTrendPoint,
  };
}

function getFirstRelevantDate(goals: Goal[], historicalTasks: Task[], todayKey: string) {
  const candidates = [
    ...historicalTasks.map((task) => task.date),
    ...goals.map((goal) => goal.startDate).filter((dateKey) => diffInDays(dateKey, todayKey) >= 0),
  ];
  return candidates.sort()[0] ?? todayKey;
}

function buildDailyStats(tasks: Task[], dateKeys: string[]): DailyStat[] {
  return dateKeys.map((dateKey) => {
    const dayTasks = getTasksForDate(tasks, dateKey);
    const completedTasks = dayTasks.filter((task) => task.done).length;
    const focusHours = getCompletedFocusHours(dayTasks);
    return {
      dateKey,
      focusHours,
      completedTasks,
      totalTasks: dayTasks.length,
      completionRate: getCompletionRate(dayTasks),
      active: completedTasks > 0,
    };
  });
}

function getTasksInRange(tasks: Task[], startDateKey: string, endDateKey: string) {
  return tasks.filter((task) => diffInDays(startDateKey, task.date) >= 0 && diffInDays(task.date, endDateKey) >= 0);
}

function buildTrendPoints(dailyStats: DailyStat[], periodDays: number): TrendPoint[] {
  if (periodDays > 120) {
    const monthGroups = dailyStats.reduce<Record<string, DailyStat[]>>((acc, day) => {
      const key = day.dateKey.slice(0, 7);
      acc[key] = acc[key] ?? [];
      acc[key].push(day);
      return acc;
    }, {});

    return Object.entries(monthGroups).map(([monthKey, days]) => summarizeTrendGroup(formatMonthLabel(monthKey), days));
  }

  const weeks: TrendPoint[] = [];
  for (let index = 0; index < dailyStats.length; index += 7) {
    const days = dailyStats.slice(index, index + 7);
    if (!days.length) continue;
    weeks.push(summarizeTrendGroup(formatDateLabel(days[0].dateKey), days));
  }
  return weeks;
}

function summarizeTrendGroup(label: string, days: DailyStat[]): TrendPoint {
  const totalTasks = days.reduce((sum, day) => sum + day.totalTasks, 0);
  const completedTasks = days.reduce((sum, day) => sum + day.completedTasks, 0);
  return {
    label,
    focusHours: round(days.reduce((sum, day) => sum + day.focusHours, 0), 1),
    completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    activeDays: days.filter((day) => day.active).length,
  };
}

function formatMonthLabel(monthKey: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(parseDateKey(`${monthKey}-01`));
}

function chunkIntoWeeks(dailyStats: DailyStat[]) {
  const weeks: DailyStat[][] = [];
  for (let index = 0; index < dailyStats.length; index += 7) {
    weeks.push(dailyStats.slice(index, index + 7));
  }
  return weeks;
}

function buildGoalConsistencyRows(goals: Goal[], tasks: Task[], dateKeys: string[], todayKey: string): GoalConsistency[] {
  return goals
    .map((goal) => {
      const goalTasks = getTasksForGoal(tasks, goal.id);
      const targetHours = normalizeDailyGoalHours(goal.dailyGoalHours);
      const eligibleDates = dateKeys.filter(
        (dateKey) =>
          diffInDays(goal.startDate, dateKey) >= 0 &&
          diffInDays(dateKey, goal.deadline) >= 0 &&
          diffInDays(dateKey, todayKey) >= 0,
      );
      const dailyHours = eligibleDates.map((dateKey) => getCompletedFocusHours(getTasksForDate(goalTasks, dateKey)));
      const daysMet = dailyHours.filter((hours) => hours >= targetHours).length;
      const totalHours = round(dateKeys.reduce((sum, dateKey) => sum + getCompletedFocusHours(getTasksForDate(goalTasks, dateKey)), 0), 1);
      const recentHours = lastNDays(30, todayKey).reduce((sum, dateKey) => sum + getCompletedFocusHours(getTasksForDate(goalTasks, dateKey)), 0);
      const previousHours = dateRange(addDays(todayKey, -59), addDays(todayKey, -30)).reduce(
        (sum, dateKey) => sum + getCompletedFocusHours(getTasksForDate(goalTasks, dateKey)),
        0,
      );

      return {
        goalId: goal.id,
        title: goal.title,
        totalHours,
        activeDays: dailyHours.filter((hours) => hours > 0).length,
        daysMet,
        eligibleDays: eligibleDates.length,
        consistencyRate: eligibleDates.length ? Math.round((daysMet / eligibleDates.length) * 100) : 0,
        bestStreak: getLongestBooleanStreak(dailyHours.map((hours) => hours >= targetHours)),
        trend: getTrendPercent(recentHours, previousHours),
      };
    })
    .sort((a, b) => b.consistencyRate - a.consistencyRate || b.totalHours - a.totalHours);
}

function buildGoalFocusMix(goals: Goal[], tasks: Task[]): GoalFocusSlice[] {
  const titleByGoalId = Object.fromEntries(goals.map((goal) => [goal.id, goal.title]));
  const minutesByGoalId: Record<string, number> = {};

  tasks
    .filter((task) => task.done)
    .forEach((task) => {
      const legacyGoalId = (task as Task & { goalId?: string }).goalId;
      const linkedGoalIds = Array.from(new Set([...(task.goalIds ?? []), ...(legacyGoalId ? [legacyGoalId] : [])])).filter(
        (goalId) => titleByGoalId[goalId],
      );
      const minutes = getTaskFocusMinutes(task);

      if (!linkedGoalIds.length) {
        minutesByGoalId.unlinked = (minutesByGoalId.unlinked ?? 0) + minutes;
        return;
      }

      linkedGoalIds.forEach((goalId) => {
        minutesByGoalId[goalId] = (minutesByGoalId[goalId] ?? 0) + minutes / linkedGoalIds.length;
      });
    });

  const totalMinutes = Object.values(minutesByGoalId).reduce((sum, minutes) => sum + minutes, 0);
  if (!totalMinutes) return [];

  return Object.entries(minutesByGoalId)
    .map(([id, minutes]) => ({
      id,
      label: id === "unlinked" ? "Unlinked" : titleByGoalId[id],
      hours: round(minutes / 60, 1),
      pct: Math.round((minutes / totalMinutes) * 100),
    }))
    .sort((a, b) => b.hours - a.hours);
}

function buildWeekdayRows(dailyStats: DailyStat[]): WeekdayPattern[] {
  return weekdayOrder.map(({ index, label }) => {
    const days = dailyStats.filter((day) => parseDateKey(day.dateKey).getDay() === index);
    const totalTasks = days.reduce((sum, day) => sum + day.totalTasks, 0);
    const completedTasks = days.reduce((sum, day) => sum + day.completedTasks, 0);
    return {
      index,
      label,
      focusHours: round(days.reduce((sum, day) => sum + day.focusHours, 0), 1),
      activeDays: days.filter((day) => day.active).length,
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  });
}

function getLongestActiveStreak(dailyStats: DailyStat[]) {
  return getLongestBooleanStreak(dailyStats.map((day) => day.active));
}

function getLongestBooleanStreak(values: boolean[]) {
  return values.reduce(
    (state, active) => {
      const current = active ? state.current + 1 : 0;
      return {
        current,
        best: Math.max(state.best, current),
      };
    },
    { current: 0, best: 0 },
  ).best;
}

function getTaskFocusMinutes(task: Task) {
  return Math.max(0, task.focusMinutes || task.duration || 0);
}

function getPaletteColor(colors: ThemeColors, index: number) {
  const palette = [colors.accent, colors.success, colors.warning, "#5ED3F3", "#F06BA8", "#45C7B8"];
  return palette[index % palette.length];
}

function getHeatColor(colors: ThemeColors, hours: number, maxHours: number) {
  if (hours <= 0) return colors.borderSubtle;
  const intensity = hours / maxHours;
  if (intensity > 0.66) return colors.success;
  if (intensity > 0.33) return colors.accent;
  return colors.accentGlow;
}

function getScopeLabel(scope: LongTermScope) {
  if (scope === "all") return "All time";
  return `Last ${scope === "365" ? "365" : scope} days`;
}

function getScopeButtonLabel(scope: LongTermScope) {
  if (scope === "all") return "All";
  if (scope === "365") return "1Y";
  return `${scope}D`;
}

function formatTrend(value: number | null, fallback = "N/A") {
  if (value === null) return fallback;
  const rounded = round(value, 1);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function formatLifetimeSummary(tasks: number, activeDays: number) {
  const taskLabel = tasks === 1 ? "task" : "tasks";
  const dayLabel = activeDays === 1 ? "day" : "days";
  return `${tasks} ${taskLabel} / ${activeDays} ${dayLabel}`;
}

function formatHours(hours: number) {
  if (hours >= 1000) return `${round(hours / 1000, 1)}k h`;
  return `${round(hours, 1)}h`;
}

function createStyles(
  colors: ThemeColors,
  spacingValue: typeof import("../theme").spacing,
  radiusValue: typeof import("../theme").radius,
  compact: boolean,
) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: {
      padding: compact ? spacingValue.lg : spacingValue.xl,
      paddingTop: spacingValue.sm,
      gap: spacingValue.xl,
      paddingBottom: 130,
    },
    label: { marginBottom: 6, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: 0, lineHeight: 36 },
    scopeRow: {
      flexDirection: "row",
      alignSelf: "stretch",
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radiusValue.md,
      padding: 4,
      gap: 0,
    },
    scopeButton: {
      flex: 1,
      minWidth: 0,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    scopeButtonActive: { backgroundColor: colors.bgElevated },
    scopeButtonText: { color: colors.textTertiary, fontSize: 12, fontWeight: "800", letterSpacing: 0 },
    scopeButtonTextActive: { color: colors.textPrimary },
    modeRow: {
      flexDirection: "row",
      gap: 0,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radiusValue.md,
      padding: 4,
    },
    modeButton: {
      flex: 1,
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    modeButtonActive: {
      backgroundColor: colors.bgElevated,
    },
    modeButtonText: { color: colors.textTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 0 },
    modeButtonTextActive: { color: colors.textPrimary },
    detailList: { gap: spacingValue.md },
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: compact ? spacingValue.lg : spacingValue.xl,
    },
    overviewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacingValue.lg,
    },
    overviewMetric: {
      width: compact ? "47%" : "46%",
      gap: 4,
      paddingBottom: spacingValue.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    metricValue: { fontSize: 24, fontWeight: "800", letterSpacing: 0, lineHeight: 29 },
    metricSub: { color: colors.textSecondary, fontSize: 11, fontWeight: "600", lineHeight: 15 },
    lifetimeStrip: {
      marginTop: spacingValue.lg,
      paddingTop: spacingValue.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacingValue.md,
    },
    lifetimeValue: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: 0 },
    lifetimeMeta: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", lineHeight: 17 },
    trendHeader: {
      alignItems: "flex-start",
      marginBottom: spacingValue.xl,
    },
    trendValue: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", letterSpacing: 0, lineHeight: 34 },
    trendBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacingValue.xs, marginTop: spacingValue.xs },
    trendBadge: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "800",
      backgroundColor: colors.bgElevated,
      borderRadius: 7,
      paddingHorizontal: spacingValue.sm,
      paddingVertical: 4,
      overflow: "hidden",
    },
    trendBars: {
      height: 118,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 5,
    },
    trendColumn: { flex: 1, height: "100%", alignItems: "center", gap: 6 },
    trendBarTrack: {
      flex: 1,
      width: "100%",
      justifyContent: "flex-end",
      borderRadius: 5,
      backgroundColor: colors.borderSubtle,
      overflow: "hidden",
    },
    trendBarFill: { width: "100%", borderRadius: 5 },
    trendBarLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: "700", maxWidth: 28 },
    heatmapContent: { gap: 3, paddingRight: spacingValue.sm },
    heatWeek: { gap: 3 },
    heatCell: { width: 9, height: 9, borderRadius: 2 },
    heatStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacingValue.md,
      marginTop: spacingValue.lg,
    },
    heatStatValue: { color: colors.textPrimary, fontSize: 15, fontWeight: "800", marginTop: 3 },
    pieRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.lg,
    },
    pieWrap: {
      width: 106,
      height: 106,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    pieCenter: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: 70,
    },
    pieCenterValue: { color: colors.textPrimary, fontSize: 16, fontWeight: "800", lineHeight: 20, textAlign: "center" },
    pieCenterLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: "700" },
    pieLegend: { flex: 1, gap: spacingValue.sm },
    pieLegendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.sm,
    },
    pieDot: { width: 8, height: 8, borderRadius: 4 },
    pieLegendTextWrap: { flex: 1 },
    pieLegendLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    piePct: { fontSize: 12, fontWeight: "800" },
    goalProgressList: { gap: spacingValue.md },
    goalProgressRow: {
      gap: spacingValue.md,
      padding: spacingValue.md,
      borderRadius: radiusValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    goalProgressHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacingValue.md },
    goalProgressTitleWrap: { flex: 1, gap: 3 },
    goalProgressTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
    goalProgressValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", letterSpacing: 0 },
    progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 6, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.success, borderRadius: 6 },
    goalMetaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacingValue.md },
    goalMetaText: { color: colors.textTertiary, fontSize: 11, fontWeight: "700" },
    weekdayList: { gap: spacingValue.md },
    weekdayRow: { flexDirection: "row", alignItems: "center", gap: spacingValue.md },
    weekdayLabel: { width: 32, color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    weekdayTrack: { flex: 1, height: 8, borderRadius: 8, backgroundColor: colors.borderSubtle, overflow: "hidden" },
    weekdayFill: { height: "100%", borderRadius: 8 },
    weekdayValue: { width: 52, color: colors.textPrimary, fontSize: 12, fontWeight: "800", textAlign: "right" },
    baselineGrid: { flexDirection: "row", gap: spacingValue.md },
    baselineItem: { flex: 1, gap: 4 },
    baselineValue: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: 0 },
  });
}
