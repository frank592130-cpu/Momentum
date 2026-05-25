import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState, RiskBadge, SectionHeader } from "../components/Base";
import { ProgressRing } from "../components/Charts";
import { MotionPanel } from "../components/Motion";
import { WHEEL_HEIGHT, WHEEL_ITEM_HEIGHT, WheelColumn } from "../components/WheelPicker";
import { addDays, formatDateLabel, toDateKey } from "../domain/date";
import { GoalDifficulty, GoalMetrics } from "../domain/models";
import { enrichGoals } from "../domain/stats";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

interface Props {
  onGoalPress: (goal: GoalMetrics) => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 9 }, (_, index) => String(new Date().getFullYear() - 1 + index));
const DIFFICULTY_OPTIONS: GoalDifficulty[] = ["easy", "standard", "hard", "extreme"];
const DIFFICULTY_LABELS: Record<GoalDifficulty, string> = {
  easy: "Easy",
  standard: "Standard",
  hard: "Hard",
  extreme: "Extreme",
};

export function GoalsScreen({ onGoalPress }: Props) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const today = toDateKey();
  const goals = useMemo(() => enrichGoals(data.goals, data.tasks, today), [data.goals, data.tasks, today]);
  const [draft, setDraft] = useState({
    title: "",
    category: "Personal",
    difficulty: "standard" as GoalDifficulty,
    startDate: today,
    deadline: addDays(today, 30),
    dailyGoalHours: data.settings.globalDailyGoalHours,
  });
  const [formError, setFormError] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | undefined>();

  const avgHealth = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.healthScore, 0) / goals.length) : 0;
  const onTrack = goals.filter((goal) => goal.risk === "low").length;
  const atRisk = goals.filter((goal) => goal.risk === "high").length;
  const categoryOptions = useMemo(() => {
    const categories = data.goals.map((goal) => goal.category).filter(Boolean);
    return Array.from(new Set(["Personal", "Work", "Health", "Learning", ...categories]));
  }, [data.goals]);

  const resetGoalForm = () => {
    setDraft({
      title: "",
      category: categoryOptions[0] ?? "Personal",
      difficulty: "standard",
      startDate: today,
      deadline: addDays(today, 30),
      dailyGoalHours: data.settings.globalDailyGoalHours,
    });
    setEditingGoalId(undefined);
    setFormError("");
    setShowGoalForm(false);
  };

  const saveGoal = () => {
    if (!draft.title.trim()) {
      setFormError("Goal title is required.");
      return;
    }
    const input = {
      title: draft.title,
      category: draft.category,
      difficulty: draft.difficulty,
      startDate: draft.startDate,
      deadline: draft.deadline,
      dailyGoalHours: draft.dailyGoalHours,
      progress: editingGoalId ? data.goals.find((goal) => goal.id === editingGoalId)?.progress ?? 0 : 0,
    };
    if (editingGoalId) {
      actions.updateGoal(editingGoalId, input);
    } else {
      actions.addGoal(input);
    }
    resetGoalForm();
  };

  return (
    <>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Goal Tracker</Text>
        <Text style={styles.title}>Active Goals</Text>
      </View>

      <View style={styles.summaryCard}>
        <ProgressRing size={88} progress={avgHealth} color={colors.accent} strokeWidth={7}>
          <Text style={styles.ringVal}>{avgHealth}%</Text>
        </ProgressRing>
        <View style={styles.ringRight}>
          <Text style={typography.titleSmall}>Overall Goal Health</Text>
          <View style={styles.statsRow}>
            <Metric label="On Track" value={`${onTrack}`} color={colors.success} />
            <View style={styles.statDivider} />
            <Metric label="At Risk" value={`${atRisk}`} color={colors.danger} />
            <View style={styles.statDivider} />
            <Metric label="Tasks" value={`${data.tasks.length}`} color={colors.accent} />
          </View>
        </View>
      </View>

      <View style={styles.goalActionRow}>
        
        
      </View>

      <View>
       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 0.5 }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#333', paddingBottom: 20 }}>All Goals</Text>
        </View>
        <TouchableOpacity
          style={styles.plusGoalButton}
          onPress={() => {
            if (showGoalForm) {
              resetGoalForm();
            } else {
              setFormError("");
              setEditingGoalId(undefined);
              setShowGoalForm(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.plusGoalText}>{showGoalForm ? "+ Goal" : "+ Goal"}</Text>
        </TouchableOpacity>
      </View>
        <View style={styles.goalList}>
          {goals.length ? (
            goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onPress={() => onGoalPress(goal)}
              />
            ))
          ) : (
            <EmptyState title="No goals yet" body="Create a goal, then link planner tasks to it." />
          )}
        </View>
      </View>
    </ScrollView>
    <GoalEditorModal
      visible={showGoalForm}
      title={editingGoalId ? "Edit Goal" : "Add Goal"}
      draft={draft}
      categoryOptions={categoryOptions}
      error={formError}
      onClose={resetGoalForm}
      onChange={setDraft}
      onSave={saveGoal}
    />
    </>
  );
}

function DatePeriodWheel({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
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

function GoalEditorModal({
  visible,
  title,
  draft,
  categoryOptions,
  error,
  onClose,
  onChange,
  onSave,
  onDelete,
}: {
  visible: boolean;
  title: string;
  draft: { title: string; category: string; difficulty: GoalDifficulty; startDate: string; deadline: string; dailyGoalHours: number };
  categoryOptions: string[];
  error: string;
  onClose: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<{ title: string; category: string; difficulty: GoalDifficulty; startDate: string; deadline: string; dailyGoalHours: number }>
  >;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <MotionPanel style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose} activeOpacity={0.75}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={draft.title}
              onChangeText={(goalTitle) => onChange((prev) => ({ ...prev, title: goalTitle }))}
              placeholder="Goal title"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <CategorySelector
              options={categoryOptions}
              value={draft.category}
              onChange={(category) => onChange((prev) => ({ ...prev, category }))}
            />
            <DifficultySelector
              value={draft.difficulty}
              onChange={(difficulty) => onChange((prev) => ({ ...prev, difficulty }))}
            />
            <DailyTargetSelector
              value={draft.dailyGoalHours}
              onChange={(dailyGoalHours) => onChange((prev) => ({ ...prev, dailyGoalHours }))}
            />
            <DatePeriodWheel
              startDate={draft.startDate}
              endDate={draft.deadline}
              onChange={(startDate, deadline) => onChange((prev) => ({ ...prev, startDate, deadline }))}
            />
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            <View style={styles.modalActions}>
              {onDelete ? (
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.8}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.8}>
                <Text style={styles.addButtonText}>{title === "Edit Goal" ? "Save" : "Add Goal"}</Text>
              </TouchableOpacity>
            </View>
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

const TARGET_HOURS = Array.from({ length: 25 }, (_, i) => String(i));
const TARGET_MINUTES = ["00", "15", "30", "45"];

function DailyTargetSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  
  const hourValue = Math.floor(value);
  const minuteValue = Math.round((value - hourValue) * 60);
  
  const hourString = String(hourValue);
  const closestMin = TARGET_MINUTES.reduce((prev, curr) =>
    Math.abs(Number(curr) - minuteValue) < Math.abs(Number(prev) - minuteValue) ? curr : prev,
    TARGET_MINUTES[0],
  );

  return (
    <View style={styles.dailyTargetWheelPanel}>
      <Text style={typography.micro}>Daily Target</Text>
      <View style={styles.dailyTargetWheelRow}>
        <View pointerEvents="none" style={styles.wheelSelectionBand} />
        <WheelColumn
          values={TARGET_HOURS}
          value={hourString}
          onChange={(next) => onChange(Number(next) + Number(closestMin) / 60)}
        />
        <View style={styles.dailyTargetUnitWrap}>
          <Text style={styles.dailyTargetUnit}>hr</Text>
        </View>
        <WheelColumn
          values={TARGET_MINUTES}
          value={closestMin}
          onChange={(next) => onChange(Number(hourString) + Number(next) / 60)}
        />
        <View style={styles.dailyTargetUnitWrap}>
          <Text style={styles.dailyTargetUnit}>min</Text>
        </View>
      </View>
    </View>
  );
}

function DateWheelLine({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
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
        <WheelColumn values={DAYS} value={day} onChange={(nextDay) => update(nextDay, month, year)} />
        <WheelColumn values={MONTHS} value={month} onChange={(nextMonth) => update(day, nextMonth, year)} />
        <WheelColumn values={YEARS} value={year} onChange={(nextYear) => update(day, month, nextYear)} />
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const { typography } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={typography.micro}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color }}>{value}</Text>
    </View>
  );
}

function CategorySelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
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
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Create custom category"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
      />
    </View>
  );
}

function GoalRow({
  goal,
  onPress,
}: {
  goal: GoalMetrics;
  onPress: () => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const riskColor = {
    low: colors.success,
    medium: colors.warning,
    high: colors.danger,
  }[goal.risk];

  return (
    <View style={styles.goalCard}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        <View style={styles.goalTop}>
          <View style={styles.goalTopLeft}>
            <Text style={[typography.label, styles.goalCat]}>
              {goal.category.toUpperCase()} / {DIFFICULTY_LABELS[goal.difficulty].toUpperCase()}
            </Text>
            <Text style={styles.goalTitle}>{goal.title}</Text>
          </View>
          <ProgressRing size={48} progress={goal.progress} color={riskColor} strokeWidth={4}>
            <Text style={[styles.goalRingVal, { color: riskColor }]}>{goal.progress}%</Text>
          </ProgressRing>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${goal.progress}%`, backgroundColor: riskColor }]} />
        </View>

        <View style={styles.goalBottom}>
          <View style={styles.goalMetrics}>
            <View>
              <Text style={typography.micro}>Health</Text>
              <Text style={[styles.metaVal, { color: goal.risk === "high" ? colors.danger : colors.textPrimary }]}>{goal.healthScore}%</Text>
            </View>
            <View>
              <Text style={typography.micro}>Daily</Text>
              <Text style={styles.metaVal}>{goal.dailyTargetHours}h</Text>
            </View>
            <View>
              <Text style={typography.micro}>Linked</Text>
              <Text style={styles.metaVal}>
                {goal.completedLinkedTaskCount}/{goal.linkedTaskCount}
              </Text>
            </View>
          </View>
          <RiskBadge level={goal.risk} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    label: { marginBottom: 5, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.6 },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.xl,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.accentGlow,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
    },
    goalActionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacingValue.md,
    },
    actionLabel: { marginBottom: 4 },
    actionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
    plusGoalButton: {
      minWidth: 92,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.accent,
      paddingHorizontal: spacingValue.lg,
    },
    plusGoalText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    ringVal: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    ringRight: { flex: 1, gap: spacingValue.md },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statDivider: { width: 1, height: 28, backgroundColor: colors.border },
    formCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
      gap: spacingValue.md,
    },
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
    modalActions: { flexDirection: "row", gap: spacingValue.md },
    saveButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      backgroundColor: colors.accent,
      borderRadius: radiusValue.md,
    },
    deleteButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      backgroundColor: colors.dangerSubtle,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    deleteButtonText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
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
    inputRow: { flexDirection: "row", gap: spacingValue.md },
    smallInput: { flex: 1 },
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
    categoryChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
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
    dailyTargetWheelPanel: {
      gap: spacingValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
    },
    dailyTargetWheelRow: {
      height: WHEEL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      gap: spacingValue.sm,
    },
    dailyTargetUnitWrap: {
      width: 50,
      height: WHEEL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    dailyTargetUnit: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      opacity: 0.7,
    },
    addButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      backgroundColor: colors.accent,
      borderRadius: radiusValue.md,
    },
    addButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
    formError: { color: colors.danger, fontSize: 12, fontWeight: "600" },
    goalList: { gap: spacingValue.md },
    goalCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.lg,
      gap: spacingValue.md,
    },
    goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    goalTopLeft: { flex: 1, marginRight: spacingValue.md },
    goalCat: { marginBottom: 4 },
    goalTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 },
    goalRingVal: { fontSize: 10, fontWeight: "700" },
    barTrack: { height: 4, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginTop: spacingValue.md },
    barFill: { height: "100%", borderRadius: 3 },
    goalBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacingValue.md },
    goalMetrics: { flexDirection: "row", gap: spacingValue.xl },
    metaVal: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
  });
}
