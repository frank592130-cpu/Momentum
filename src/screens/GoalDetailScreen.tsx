import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState, RiskBadge, SectionHeader } from "../components/Base";
import { ProgressRing } from "../components/Charts";
import { MotionPanel } from "../components/Motion";
import { WHEEL_HEIGHT, WHEEL_ITEM_HEIGHT, WheelColumn } from "../components/WheelPicker";
import { addDays, formatDateLabel, toDateKey } from "../domain/date";
import { GoalDifficulty, Task } from "../domain/models";
import { enrichGoals } from "../domain/stats";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

interface Props {
  goalId: string;
  onBack: () => void;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 9 }, (_, index) => String(new Date().getFullYear() - 1 + index));
const DIFFICULTY_OPTIONS: GoalDifficulty[] = ["easy", "standard", "hard", "extreme"];
const DIFFICULTY_LABELS: Record<GoalDifficulty, string> = {
  easy: "Easy",
  standard: "Standard",
  hard: "Hard",
  extreme: "Extreme",
};

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function GoalDetailScreen({ goalId, onBack }: Props) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const today = toDateKey();
  const storedGoal = useMemo(() => data.goals.find((item) => item.id === goalId), [data.goals, goalId]);
  const goal = useMemo(() => enrichGoals(data.goals, data.tasks, today).find((item) => item.id === goalId), [data.goals, data.tasks, goalId, today]);
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    category: "Personal",
    difficulty: "standard" as GoalDifficulty,
    startDate: today,
    deadline: addDays(today, 30),
    dailyGoalHours: data.settings.globalDailyGoalHours,
  });
  const [formError, setFormError] = useState("");
  const linkedTasks = useMemo(
    () => data.tasks.filter((task) => task.goalIds.includes(goalId)).slice().sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [data.tasks, goalId],
  );

  useEffect(() => {
    if (!goal) return;
    setDraft({
      title: goal.title,
      category: goal.category,
      difficulty: goal.difficulty,
      startDate: goal.startDate,
      deadline: goal.deadline,
      dailyGoalHours: goal.dailyTargetHours,
    });
  }, [goal]);

  if (!goal) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <EmptyState title="Goal not found" body="It may have been deleted." />
      </ScrollView>
    );
  }

  const riskColor = {
    low: colors.success,
    medium: colors.warning,
    high: colors.danger,
  }[goal.risk];
  const totalWeekHours = goal.weeklyHours.reduce((sum, value) => sum + value, 0);
  const maxHour = Math.max(...goal.weeklyHours, 1);
  const completedLinked = goal.completedLinkedTaskCount;
  const actualProgress = storedGoal?.progress ?? goal.progress;
  const updateActualProgress = (nextProgress: number) => {
    actions.updateGoalProgress(goal.id, clampProgress(nextProgress));
  };

  const metrics = [
    { label: "Goal Health", value: `${goal.healthScore}%`, color: riskColor },
    { label: "Daily Target", value: `${goal.dailyTargetHours}h`, color: colors.textPrimary },
    { label: "Days Left", value: `${goal.daysLeft}`, color: colors.textPrimary },
    { label: "Linked Tasks", value: `${completedLinked}/${linkedTasks.length}`, color: colors.textPrimary },
  ];

  const formulaRows = [
    { label: "Pace Score", value: goal.paceScore, weight: "35%", color: colors.accent },
    { label: "Effort Score", value: goal.effortScore, weight: "35%", color: colors.success },
    { label: "Planning", value: goal.planningScore, weight: "15%", color: colors.warning },
    { label: "Momentum", value: goal.momentumScore, weight: "15%", color: colors.textTertiary },
  ];
  const categoryOptions = Array.from(new Set(["Personal", "Work", "Health", "Learning", ...data.goals.map((item) => item.category).filter(Boolean)]));

  const saveGoal = () => {
    if (!draft.title.trim()) {
      setFormError("Goal title is required.");
      return;
    }
    actions.updateGoal(goal.id, { ...draft, progress: storedGoal?.progress ?? goal.progress });
    setFormError("");
    setShowEditor(false);
  };

  const deleteGoal = () => {
    actions.deleteGoal(goal.id);
    onBack();
  };

  return (
    <>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={typography.label}>{goal.category.toUpperCase()}</Text>
        <Text style={styles.title}>{goal.title}</Text>
        <View style={styles.headerMeta}>
          <RiskBadge level={goal.risk} />
          <Text style={typography.micro}>{DIFFICULTY_LABELS[goal.difficulty]} difficulty</Text>
          <Text style={typography.micro}>Deadline {formatDateLabel(goal.deadline)}</Text>
        </View>
      </View>

      <View style={styles.mainCard}>
        <View style={styles.ringRow}>
          <ProgressRing size={104} progress={goal.progress} color={riskColor} strokeWidth={8}>
            <View style={styles.ringCenter}>
              <Text style={styles.ringValue}>{goal.progress}%</Text>
              <Text style={typography.micro}>done</Text>
            </View>
          </ProgressRing>
          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metricItem}>
                <Text style={typography.micro}>{metric.label}</Text>
                <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.progressControl}>
          <View style={styles.progressControlHeader}>
            <Text style={typography.micro}>Actual Progress</Text>
            <Text style={styles.progressControlValue}>{actualProgress}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${actualProgress}%`, backgroundColor: riskColor }]} />
          </View>
          <View style={styles.progressButtonRow}>
            <TouchableOpacity style={styles.progressButton} onPress={() => updateActualProgress(actualProgress - 5)} activeOpacity={0.8}>
              <Text style={styles.progressButtonText}>-5%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.progressButton} onPress={() => updateActualProgress(actualProgress + 5)} activeOpacity={0.8}>
              <Text style={styles.progressButtonText}>+5%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.progressButton, styles.progressDoneButton]} onPress={() => updateActualProgress(100)} activeOpacity={0.8}>
              <Text style={styles.progressDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Health Formula" subtitle="Signals" />
        <View style={styles.formulaList}>
          {formulaRows.map((row) => (
            <View key={row.label}>
              <View style={styles.formulaRow}>
                <Text style={typography.bodySmall}>{row.label}</Text>
                <Text style={[styles.formulaValue, { color: row.color }]}>
                  {row.value}% x {row.weight}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${row.value}%`, backgroundColor: row.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Weekly Hours" subtitle="This Week" />
        <View style={styles.barChart}>
          {goal.weeklyHours.map((hours, index) => (
            <View key={`${hours}-${index}`} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(hours / maxHour) * 100}%`,
                      backgroundColor: index === 6 ? riskColor : `${riskColor}66`,
                    },
                  ]}
                />
              </View>
              <Text style={typography.micro}>{DAYS[index]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.weekTotal}>
          <Text style={typography.bodySmall}>This week's total</Text>
          <Text style={typography.titleSmall}>{totalWeekHours.toFixed(1)}h</Text>
        </View>
      </View>

      <View>
        <SectionHeader title="Linked Activity" subtitle="History" />
        <View style={styles.activityList}>
          {linkedTasks.length ? (
            linkedTasks.slice(0, 8).map((task) => <ActivityRow key={task.id} task={task} />)
          ) : (
            <EmptyState title="No linked tasks" body="Attach tasks to this goal from Planner." />
          )}
        </View>
      </View>
      <View style={styles.detailActions}>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => setShowEditor(true)} activeOpacity={0.8}>
          <Text style={styles.secondaryActionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerAction} onPress={deleteGoal} activeOpacity={0.8}>
          <Text style={styles.dangerActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    <GoalEditorModal
      visible={showEditor}
      draft={draft}
      categoryOptions={categoryOptions}
      error={formError}
      onClose={() => setShowEditor(false)}
      onChange={setDraft}
      onSave={saveGoal}
    />
    </>
  );
}

function GoalEditorModal({
  visible,
  draft,
  categoryOptions,
  error,
  onClose,
  onChange,
  onSave,
}: {
  visible: boolean;
  draft: { title: string; category: string; difficulty: GoalDifficulty; startDate: string; deadline: string; dailyGoalHours: number };
  categoryOptions: string[];
  error: string;
  onClose: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<{ title: string; category: string; difficulty: GoalDifficulty; startDate: string; deadline: string; dailyGoalHours: number }>
  >;
  onSave: () => void;
}) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <MotionPanel style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Goal</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose} activeOpacity={0.75}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={draft.title}
              onChangeText={(title) => onChange((prev) => ({ ...prev, title }))}
              placeholder="Goal title"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <CategorySelector options={categoryOptions} value={draft.category} onChange={(category) => onChange((prev) => ({ ...prev, category }))} />
            <DifficultySelector value={draft.difficulty} onChange={(difficulty) => onChange((prev) => ({ ...prev, difficulty }))} />
            <DailyTargetSelector value={draft.dailyGoalHours} onChange={(dailyGoalHours) => onChange((prev) => ({ ...prev, dailyGoalHours }))} />
            <DatePeriodWheel
              startDate={draft.startDate}
              endDate={draft.deadline}
              onChange={(startDate, deadline) => onChange((prev) => ({ ...prev, startDate, deadline }))}
            />
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            <TouchableOpacity style={styles.saveAction} onPress={onSave} activeOpacity={0.8}>
              <Text style={styles.saveActionText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </MotionPanel>
      </View>
    </Modal>
  );
}

function DifficultySelector({ value, onChange }: { value: GoalDifficulty; onChange: (value: GoalDifficulty) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.categoryGroup}>
      <Text style={typography.micro}>Difficulty</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {DIFFICULTY_OPTIONS.map((option) => {
          const active = option === value;
          return (
            <TouchableOpacity key={option} onPress={() => onChange(option)} style={[styles.categoryChip, active && styles.categoryChipActive]}>
              <Text style={[styles.categoryText, active && styles.categoryTextActive]} numberOfLines={1}>
                {DIFFICULTY_LABELS[option]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DailyTargetSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const options = [0.5, 1, 2, 3, 4];
  return (
    <View style={styles.categoryGroup}>
      <Text style={typography.micro}>Daily Target</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity key={option} onPress={() => onChange(option)} style={[styles.categoryChip, active && styles.categoryChipActive]}>
              <Text style={[styles.categoryText, active && styles.categoryTextActive]} numberOfLines={1}>
                {option}h
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TextInput
        value={String(value)}
        onChangeText={(nextValue) => {
          const parsed = Number(nextValue);
          onChange(Number.isFinite(parsed) ? parsed : value);
        }}
        keyboardType="decimal-pad"
        placeholder="Hours per day"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
      />
    </View>
  );
}

function CategorySelector({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.categoryGroup}>
      <Text style={typography.micro}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <TouchableOpacity key={option} onPress={() => onChange(option)} style={[styles.categoryChip, active && styles.categoryChipActive]}>
              <Text style={[styles.categoryText, active && styles.categoryTextActive]} numberOfLines={1}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TextInput value={value} onChangeText={onChange} placeholder="Create custom category" placeholderTextColor={colors.textTertiary} style={styles.input} />
    </View>
  );
}

function DatePeriodWheel({ startDate, endDate, onChange }: { startDate: string; endDate: string; onChange: (startDate: string, endDate: string) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.dateWheelPanel}>
      <Text style={typography.micro}>Date Period</Text>
      <DateWheelLine label="Start" value={startDate} onChange={(nextStart) => onChange(nextStart, addDays(nextStart, 30))} />
      <DateWheelLine label="End" value={endDate} onChange={(nextEnd) => onChange(startDate, nextEnd)} />
    </View>
  );
}

function DateWheelLine({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const date = new Date(`${value}T00:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = String(date.getFullYear());
  const update = (nextDay: string, nextMonth: string, nextYear: string) => {
    const monthIndex = MONTHS.indexOf(nextMonth);
    const yearValue = Number(nextYear);
    const dayValue = Math.min(Number(nextDay), new Date(yearValue, monthIndex + 1, 0).getDate());
    onChange(toDateKey(new Date(yearValue, monthIndex, dayValue)));
  };
  return (
    <View style={styles.dateWheelLine}>
      <Text style={typography.micro}>{label}</Text>
      <View style={styles.dateCompactRow}>
        <View pointerEvents="none" style={styles.wheelSelectionBand} />
        <WheelColumn values={DATE_DAYS} value={day} onChange={(nextDay) => update(nextDay, month, year)} />
        <WheelColumn values={MONTHS} value={month} onChange={(nextMonth) => update(day, nextMonth, year)} />
        <WheelColumn values={YEARS} value={year} onChange={(nextYear) => update(day, month, nextYear)} />
      </View>
    </View>
  );
}

function ActivityRow({ task }: { task: Task }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.activityItem}>
      <View style={{ flex: 1 }}>
        <Text style={typography.micro}>{formatDateLabel(task.date)}</Text>
        <Text style={styles.activityAction}>{task.title}</Text>
      </View>
      <Text style={[styles.activityDelta, { color: task.done ? colors.success : colors.textTertiary }]}>
        {task.done ? `+${task.duration}m` : "Open"}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    backBtn: { alignSelf: "flex-start", paddingTop: spacingValue.sm },
    backText: { fontSize: 13, color: colors.accent, fontWeight: "700" },
    header: { gap: spacingValue.sm },
    headerMeta: { flexDirection: "row", alignItems: "center", gap: spacingValue.md },
    title: { fontSize: 26, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.6, lineHeight: 32 },
    mainCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.accentGlow,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
      gap: spacingValue.lg,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
    },
    ringRow: { flexDirection: "row", alignItems: "center", gap: spacingValue.xxl },
    ringCenter: { alignItems: "center" },
    ringValue: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.6 },
    metricsGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacingValue.md },
    metricItem: { width: "46%" },
    metricValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
    formulaList: { gap: spacingValue.md },
    formulaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacingValue.xs },
    formulaValue: { fontSize: 13, fontWeight: "800" },
    track: { height: 4, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
    progressControl: { gap: spacingValue.sm, paddingTop: spacingValue.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
    progressControlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    progressControlValue: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    progressButtonRow: { flexDirection: "row", gap: spacingValue.sm },
    progressButton: {
      flex: 1,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    progressDoneButton: { backgroundColor: colors.accent, borderColor: colors.accent },
    progressDoneButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    barChart: { flexDirection: "row", alignItems: "flex-end", gap: spacingValue.sm, height: 64 },
    barCol: { flex: 1, alignItems: "center", gap: spacingValue.xs },
    barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
    barFill: { width: "100%", borderRadius: 3 },
    weekTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacingValue.lg,
      paddingTop: spacingValue.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    activityList: { gap: spacingValue.sm },
    activityItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.md,
      gap: spacingValue.md,
    },
    activityAction: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginTop: 3 },
    activityDelta: { fontSize: 13, fontWeight: "800" },
    detailActions: { flexDirection: "row", gap: spacingValue.md },
    secondaryAction: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    secondaryActionText: { color: colors.accent, fontSize: 13, fontWeight: "800" },
    dangerAction: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSubtle,
    },
    dangerActionText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.62)",
      padding: spacingValue.lg,
    },
    modalSheet: {
      maxHeight: "92%",
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.xl,
      overflow: "hidden",
    },
    modalContent: { padding: spacingValue.xl, gap: spacingValue.md, paddingBottom: spacingValue.xxl },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacingValue.md },
    modalTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
    modalCloseButton: {
      minHeight: 38,
      paddingHorizontal: spacingValue.md,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCloseText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
    input: {
      minHeight: 42,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      paddingHorizontal: spacingValue.md,
      color: colors.textPrimary,
      fontSize: 13,
    },
    categoryGroup: { gap: spacingValue.xs },
    categoryRow: { gap: spacingValue.sm },
    categoryChip: {
      maxWidth: 150,
      paddingHorizontal: spacingValue.md,
      paddingVertical: spacingValue.sm,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    categoryChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSubtle },
    categoryText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    categoryTextActive: { color: colors.accent },
    dateWheelPanel: {
      gap: spacingValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
    },
    dateWheelLine: { gap: spacingValue.xs },
    dateCompactRow: {
      height: WHEEL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.sm,
      position: "relative",
    },
    wheelSelectionBand: {
      position: "absolute",
      left: 0,
      right: 0,
      top: WHEEL_ITEM_HEIGHT,
      height: WHEEL_ITEM_HEIGHT,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    saveAction: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderRadius: radiusValue.md,
    },
    saveActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    formError: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  });
}
