import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, SectionHeader, StatCard } from "../components/Base";
import { TimelineItem } from "../components/Cards";
import { ProgressRing } from "../components/Charts";
import { formatDateTitle, toDateKey } from "../domain/date";
import {
  getCompletedDurationHours,
  getCompletedFocusHours,
  getCompletionRate,
  getTasksForDate,
  getTotalDurationHours,
} from "../domain/stats";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

export function DashboardScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const today = toDateKey();

  const todayTasks = useMemo(() => getTasksForDate(data.tasks, today), [data.tasks, today]);
  const goalTitleById = useMemo(() => Object.fromEntries(data.goals.map((goal) => [goal.id, goal.title])), [data.goals]);

  const completionPct = getCompletionRate(todayTasks);
  const completedTasks = todayTasks.filter((task) => task.done).length;
  const totalHours = getTotalDurationHours(todayTasks);
  const doneHours = getCompletedDurationHours(todayTasks);
  const focusHours = getCompletedFocusHours(todayTasks);
  const remainingHours = Math.max(0, totalHours - doneHours);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.greeting}>
        <Text style={[typography.label, styles.greetingDate]}>{formatDateTitle(today)}</Text>
        <Text style={styles.greetingName}>
          Momentum{"\n"}<Text style={{ color: colors.accent }}>Today</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <StatCard label="Completed" value={`${completedTasks}/${todayTasks.length}`} sub="tasks today" color={colors.accent} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Time Done" value={`${focusHours}h`} sub={`${remainingHours.toFixed(1)}h remaining`} color={colors.success} />
      </View>

      <View style={styles.ringCard}>
        <ProgressRing size={82} progress={completionPct} color={colors.accent} strokeWidth={7}>
          <Text style={styles.ringValue}>{completionPct}%</Text>
        </ProgressRing>
        <View style={styles.ringDetails}>
          <Text style={typography.titleMedium}>Daily Completion</Text>
          <Text style={typography.bodySmall}>
            {doneHours}h done / {totalHours}h planned
          </Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completionPct}%` }]} />
          </View>
          <View style={styles.progressBarLabels}>
            <Text style={typography.micro}>0h</Text>
            <Text style={typography.micro}>{data.settings.globalDailyGoalHours}h baseline</Text>
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Today's Tasks" />
        <View>
          {todayTasks.length ? (
            todayTasks.map((task, index) => (
              <TimelineItem
                key={task.id}
                task={task}
                isLast={index === todayTasks.length - 1}
                goalTitles={task.goalIds.map((goalId) => goalTitleById[goalId]).filter(Boolean)}
                onToggle={actions.toggleTask}
              />
            ))
          ) : (
            <EmptyState title="No tasks today" body="Use Planner to add work for this date." />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    greeting: { gap: spacingValue.sm },
    greetingDate: { paddingTop: 15 },
    greetingName: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.7, lineHeight: 36 },
    greetingSubtitle: { lineHeight: 20 },
    row: { flexDirection: "row" },
    ringCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.xl,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.accentGlow,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
    },
    ringValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
    ringDetails: { flex: 1, gap: spacingValue.xs },
    progressBarTrack: { marginTop: spacingValue.md, height: 4, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
    progressBarFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
    progressBarLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacingValue.xs },
  });
}
