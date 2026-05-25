import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState, StatCard } from "../components/Base";
import { TimelineItem } from "../components/Cards";
import { MotionPanel } from "../components/Motion";
import { WHEEL_HEIGHT, WHEEL_ITEM_HEIGHT, WheelColumn } from "../components/WheelPicker";
import { addDays, formatDateLabel, formatDateTitle, parseDateKey, toDateKey } from "../domain/date";
import {
  getCompletedDurationHours,
  getCompletionRate,
  getTasksForDate,
  getTotalDurationHours,
} from "../domain/stats";
import { Task } from "../domain/models";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

type FilterId = "all" | "open" | "done";

const TAGS = ["Focus", "Work", "Meeting", "Health", "Learning"];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function PlannerScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    time: "09:00",
    endTime: "09:30",
    tag: "Focus",
    goalIds: [] as string[],
  });
  const [formError, setFormError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();

  const tasks = useMemo(() => getTasksForDate(data.tasks, selectedDate), [data.tasks, selectedDate]);
  const goalTitleById = useMemo(() => Object.fromEntries(data.goals.map((goal) => [goal.id, goal.title])), [data.goals]);
  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = filter === "all" || (filter === "done" ? task.done : !task.done);
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.tag.toLowerCase().includes(query) ||
        task.goalIds.some((goalId) => goalTitleById[goalId]?.toLowerCase().includes(query));
      return matchesFilter && matchesQuery;
    });
  }, [filter, goalTitleById, search, tasks]);

  const remainingMins = tasks.filter((task) => !task.done).reduce((sum, task) => sum + task.duration, 0);
  const donePct = getCompletionRate(tasks);
  const doneHours = getCompletedDurationHours(tasks);
  const totalHours = getTotalDurationHours(tasks);
  const remH = Math.floor(remainingMins / 60);
  const remM = remainingMins % 60;
  const workload = getWorkload(tasks);
  const tagOptions = useMemo(() => {
    const customTags = data.tasks.map((task) => task.tag).filter(Boolean);
    return Array.from(new Set([...TAGS, ...customTags]));
  }, [data.tasks]);

  const resetTaskForm = () => {
    setDraft({ title: "", time: "09:00", endTime: "09:30", tag: tagOptions[0] ?? "Focus", goalIds: [] });
    setEditingTaskId(undefined);
    setFormError("");
    setShowTaskForm(false);
  };

  const saveTask = () => {
    const duration = timeDiffMinutes(draft.time, draft.endTime);
    if (!draft.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    if (duration <= 0) {
      setFormError("Finish time must be after start time.");
      return;
    }
    const input = {
      title: draft.title,
      tag: draft.tag,
      date: selectedDate,
      time: draft.time,
      duration,
      energy: "medium" as const,
      goalIds: draft.goalIds,
    };
    if (editingTaskId) {
      actions.updateTask(editingTaskId, input);
    } else {
      actions.addTask(input);
    }
    resetTaskForm();
  };

  const editTask = (task: Task) => {
    setDraft({
      title: task.title,
      time: task.time,
      endTime: addMinutesToTime(task.time, task.duration),
      tag: task.tag,
      goalIds: task.goalIds,
    });
    setEditingTaskId(task.id);
    setFormError("");
    setShowTaskForm(true);
  };

  const toggleTaskForm = () => {
    if (showTaskForm) {
      resetTaskForm();
    } else {
      setFormError("");
      setEditingTaskId(undefined);
      setShowTaskForm(true);
    }
  };

  return (
    <>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Daily Planner</Text>
        <Text style={styles.title}>{formatDateTitle(selectedDate)}</Text>
      </View>

      <MonthCalendar
        selectedDate={selectedDate}
        markedDates={new Set(data.tasks.map((task) => task.date))}
        onSelect={setSelectedDate}
      />

      <View style={styles.row}>
        <StatCard label="Remaining" value={`${remH}h ${remM}m`} sub="left this day" color={colors.accent} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Completed" value={`${donePct}%`} sub={`${doneHours}h of ${totalHours}h`} color={colors.success} />
      </View>

      <View style={styles.workloadCard}>
        <Text style={typography.bodySmall}>Workload Distribution</Text>
        <View style={styles.workloadBar}>
          {workload.length ? (
            workload.map((segment) => (
              <View key={segment.label} style={[styles.workloadSeg, { flex: segment.minutes, backgroundColor: segment.color }]} />
            ))
          ) : (
            <View style={[styles.workloadSeg, { flex: 1, backgroundColor: colors.borderSubtle }]} />
          )}
        </View>
        <View style={styles.workloadLegend}>
          {workload.map((segment) => (
            <View key={segment.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <Text style={typography.micro}>{segment.label} {segment.pct}%</Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <View style={styles.scheduleHeader}>
          <View>
            <Text style={[typography.label, styles.actionLabel]}>Schedule</Text>
            <Text style={styles.actionTitle}>Tasks for {formatDateLabel(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={styles.plusTaskButton} onPress={toggleTaskForm} activeOpacity={0.8}>
            <Text style={styles.plusTaskText}>+ Task</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks or goals"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <View style={styles.filterRow}>
          {(["all", "open", "done"] as FilterId[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterButton, filter === item && styles.filterButtonActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {visibleTasks.length ? (
          visibleTasks.map((task, index) => (
            <TimelineItem
              key={task.id}
              task={task}
              isLast={index === visibleTasks.length - 1}
              goalTitles={task.goalIds.map((goalId) => goalTitleById[goalId]).filter(Boolean)}
              onToggle={actions.toggleTask}
              onEdit={editTask}
            />
          ))
        ) : (
          <EmptyState title="No matching tasks" body="Adjust the filter or add a task for this date." />
        )}
      </View>
    </ScrollView>
    <TaskEditorModal
      visible={showTaskForm}
      title={editingTaskId ? "Edit Task" : "Add Task"}
      draft={draft}
      goals={data.goals}
      tagOptions={tagOptions}
      error={formError}
      onClose={resetTaskForm}
      onChange={setDraft}
      onSave={saveTask}
      onDelete={editingTaskId ? () => {
        actions.deleteTask(editingTaskId);
        resetTaskForm();
      } : undefined}
    />
    </>
  );
}

function MonthCalendar({
  selectedDate,
  markedDates,
  onSelect,
}: {
  selectedDate: string;
  markedDates: Set<string>;
  onSelect: (date: string) => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate.slice(0, 7));

  useEffect(() => {
    setVisibleMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);

  const monthDate = parseDateKey(`${visibleMonth}-01`);
  const monthTitle = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthDate);
  const days = useMemo(() => {
    const first = parseDateKey(`${visibleMonth}-01`);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return toDateKey(date);
    });
  }, [visibleMonth]);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days]);

  const moveMonth = (delta: number) => {
    const next = parseDateKey(`${visibleMonth}-01`);
    next.setMonth(next.getMonth() + delta);
    setVisibleMonth(toDateKey(next).slice(0, 7));
  };

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarTop}>
        <TouchableOpacity style={styles.calendarArrow} onPress={() => moveMonth(-1)} activeOpacity={0.75}>
          <Text style={styles.calendarArrowText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>{monthTitle}</Text>
        <TouchableOpacity style={styles.calendarArrow} onPress={() => moveMonth(1)} activeOpacity={0.75}>
          <Text style={styles.calendarArrowText}>{">"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
            {week.map((day) => {
              const active = day === selectedDate;
              const isCurrentMonth = day.startsWith(visibleMonth);
              const hasTasks = markedDates.has(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    !isCurrentMonth && styles.dayCellMuted,
                    active && styles.dayCellActive,
                  ]}
                  onPress={() => onSelect(day)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.dayNumber, !isCurrentMonth && styles.dayNumberMuted, active && styles.dayNumberActive]}>
                    {parseDateKey(day).getDate()}
                  </Text>
                  {hasTasks && !active ? <View style={styles.dayTaskMark} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function TaskEditorModal({
  visible,
  title,
  draft,
  goals,
  tagOptions,
  error,
  onClose,
  onChange,
  onSave,
  onDelete,
}: {
  visible: boolean;
  title: string;
  draft: { title: string; time: string; endTime: string; tag: string; goalIds: string[] };
  goals: Array<{ id: string; title: string }>;
  tagOptions: string[];
  error: string;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<{ title: string; time: string; endTime: string; tag: string; goalIds: string[] }>>;
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
              onChangeText={(taskTitle) => onChange((prev) => ({ ...prev, title: taskTitle }))}
              placeholder="Task title"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <TimePeriodWheel
              startTime={draft.time}
              endTime={draft.endTime}
              onChange={(time, endTime) => onChange((prev) => ({ ...prev, time, endTime }))}
            />
            <TagSelector
              options={tagOptions}
              value={draft.tag}
              onChange={(tag) => onChange((prev) => ({ ...prev, tag }))}
            />
            <MultiGoalSelector
              goals={goals}
              value={draft.goalIds}
              onChange={(goalIds) => onChange((prev) => ({ ...prev, goalIds }))}
            />
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            <View style={styles.modalActions}>
              {onDelete ? (
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.8}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.8}>
                <Text style={styles.addButtonText}>{title === "Edit Task" ? "Save" : "Add Task"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </MotionPanel>
      </View>
    </Modal>
  );
}

function TimePeriodWheel({
  startTime,
  endTime,
  onChange,
}: {
  startTime: string;
  endTime: string;
  onChange: (startTime: string, endTime: string) => void;
}) {
  const [startHour = "09", startMinute = "00"] = startTime.split(":");
  const [endHour = "09", endMinute = "30"] = endTime.split(":");
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);

  return (
    <View style={styles.wheelPanel}>
      <Text style={typography.micro}>Time Period</Text>
      <View style={styles.timePeriodGrid}>
        <View style={styles.timeWheelGroup}>
          <Text style={typography.micro}>Start</Text>
          <TimePairPicker
            hour={startHour}
            minute={startMinute}
            onHourChange={(nextHour) => onChange(`${nextHour}:${startMinute}`, endTime)}
            onMinuteChange={(nextMinute) => onChange(`${startHour}:${nextMinute}`, endTime)}
          />
        </View>
        <View style={styles.timeWheelGroup}>
          <Text style={typography.micro}>Finish</Text>
          <TimePairPicker
            hour={endHour}
            minute={endMinute}
            onHourChange={(nextHour) => onChange(startTime, `${nextHour}:${endMinute}`)}
            onMinuteChange={(nextMinute) => onChange(startTime, `${endHour}:${nextMinute}`)}
          />
        </View>
      </View>
    </View>
  );
}

function TimePairPicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  hour: string;
  minute: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
}) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.timePair}>
      <View pointerEvents="none" style={styles.wheelSelectionBand} />
      <WheelColumn values={HOURS} value={hour} onChange={onHourChange} />
      <View style={styles.timeColonWrap}>
        <Text style={styles.timeColon}>:</Text>
      </View>
      <WheelColumn values={MINUTES} value={minute} onChange={onMinuteChange} />
    </View>
  );
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

function timeDiffMinutes(startTime: string, endTime: string) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

function getWorkload(tasks: Task[]) {
  const total = tasks.reduce((sum, task) => sum + task.duration, 0);
  if (!total) return [];
  const groups = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.tag] = (acc[task.tag] || 0) + task.duration;
    return acc;
  }, {});
  return Object.entries(groups).map(([label, minutes]) => ({
    label,
    minutes,
    pct: Math.round((minutes / total) * 100),
    color: getTagColor(label),
  }));
}

function getTagColor(label: string) {
  const fixed: Record<string, string> = {
    Focus: "#7B6EF6",
    Meeting: "#E8A838",
    Work: "#9090C0",
    Health: "#4ECBA0",
    Learning: "#C0A060",
  };
  if (fixed[label]) return fixed[label];
  const palette = ["#5ED3F3", "#F06BA8", "#7DD87D", "#FF8F5C", "#B88CFF", "#45C7B8", "#F5C542"];
  const hash = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function MultiGoalSelector({
  goals,
  value,
  onChange,
}: {
  goals: Array<{ id: string; title: string }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const toggleGoal = (goalId: string) => {
    onChange(value.includes(goalId) ? value.filter((id) => id !== goalId) : [...value, goalId]);
  };

  return (
    <View style={styles.segmentGroup}>
      <Text style={typography.micro}>Goals</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => onChange([])}
          style={[styles.segmentButton, value.length === 0 && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, value.length === 0 && styles.segmentTextActive]} numberOfLines={1}>
            No Goal
          </Text>
        </TouchableOpacity>
        {goals.map((goal) => {
          const active = value.includes(goal.id);
          return (
            <TouchableOpacity key={goal.id} onPress={() => toggleGoal(goal.id)} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {goal.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TagSelector({
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
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const displayOptions = useMemo(() => {
    const selectedTag = value.trim();
    return Array.from(new Set([...options, ...(selectedTag ? [selectedTag] : [])]));
  }, [options, value]);
  const commitCustomTag = () => {
    const nextTag = customTag.trim();
    if (!nextTag) return;
    onChange(nextTag);
    setCustomTag("");
    setIsAddingCustom(false);
  };

  return (
    <View style={styles.segmentGroup}>
      <Text style={typography.micro}>Tag</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        {displayOptions.map((option) => {
          const active = option === value;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => {
                onChange(option);
                setIsAddingCustom(false);
                setCustomTag("");
              }}
              style={[styles.segmentButton, active && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => setIsAddingCustom(true)}
          style={[styles.addTagButton, isAddingCustom && styles.addTagButtonActive]}
          activeOpacity={0.75}
          accessibilityLabel="Add custom tag"
        >
          <Text style={styles.addTagButtonText}>+</Text>
        </TouchableOpacity>
      </ScrollView>
      {isAddingCustom ? (
        <View style={styles.customTagRow}>
          <TextInput
            value={customTag}
            onChangeText={setCustomTag}
            onSubmitEditing={commitCustomTag}
            placeholder="New tag"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, styles.customTagInput]}
            autoFocus
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={commitCustomTag}
            style={[styles.customTagActionButton, styles.customTagConfirmButton]}
            activeOpacity={0.75}
            accessibilityLabel="Save custom tag"
          >
            <Text style={[styles.customTagActionText, styles.customTagConfirmText]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setCustomTag("");
              setIsAddingCustom(false);
            }}
            style={styles.customTagActionButton}
            activeOpacity={0.75}
            accessibilityLabel="Cancel custom tag"
          >
            <Text style={styles.customTagActionText}>x</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    label: { marginBottom: 6, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.7 },
    calendarCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.md,
      gap: spacingValue.md,
    },
    calendarTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    calendarArrow: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calendarArrowText: { color: colors.textSecondary, fontSize: 17, fontWeight: "800", lineHeight: 18 },
    calendarTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: "800" },
    weekdayRow: { flexDirection: "row", justifyContent: "space-between" },
    weekdayText: {
      flex: 1,
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "800",
    },
    calendarGrid: { gap: 3 },
    calendarWeek: { flexDirection: "row", gap: 3 },
    dayCell: {
      flex: 1,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 2,
    },
    dayCellMuted: { opacity: 0.32 },
    dayCellActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    dayNumber: { color: colors.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 18 },
    dayNumberMuted: { color: colors.textTertiary },
    dayNumberActive: { color: "#FFFFFF" },
    dayTaskMark: { width: 8, height: 2, borderRadius: 1, backgroundColor: colors.textTertiary, opacity: 0.35 },
    row: { flexDirection: "row" },
    scheduleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacingValue.md,
      marginBottom: spacingValue.lg,
    },
    actionLabel: { marginBottom: 4 },
    actionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
    plusTaskButton: {
      minWidth: 92,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.accent,
      paddingHorizontal: spacingValue.lg,
    },
    plusTaskText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
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
    wheelPanel: {
      gap: spacingValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      padding: spacingValue.md,
    },
    timePeriodGrid: { gap: spacingValue.md },
    timeWheelGroup: { flex: 1, gap: spacingValue.xs },
    timePair: {
      height: WHEEL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      gap: spacingValue.sm,
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
    timeColonWrap: {
      width: 18,
      height: WHEEL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    timeColon: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", opacity: 0.9 },
    addButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      backgroundColor: colors.accent,
      borderRadius: radiusValue.md,
    },
    addButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
    formError: { color: colors.danger, fontSize: 12, fontWeight: "600" },
    segmentGroup: { gap: spacingValue.xs },
    segmentRow: { gap: spacingValue.sm },
    segmentButton: {
      maxWidth: 150,
      paddingHorizontal: spacingValue.md,
      paddingVertical: spacingValue.sm,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    segmentButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    segmentTextActive: { color: colors.accent },
    addTagButton: {
      width: 38,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    addTagButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    addTagButtonText: { color: colors.accent, fontSize: 20, fontWeight: "800", lineHeight: 20 },
    customTagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.sm,
    },
    customTagInput: { flex: 1 },
    customTagActionButton: {
      width: 42,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    customTagConfirmButton: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    customTagActionText: { color: colors.textSecondary, fontSize: 16, fontWeight: "800", lineHeight: 18 },
    customTagConfirmText: { color: colors.accent, fontSize: 20, lineHeight: 20 },
    workloadCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      padding: spacingValue.xl,
      gap: spacingValue.sm,
    },
    workloadBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: 6,
      overflow: "hidden",
      gap: 2,
    },
    workloadSeg: { height: "100%", opacity: 0.9 },
    workloadLegend: {
      flexDirection: "row",
      gap: spacingValue.lg,
      flexWrap: "wrap",
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    filterRow: { flexDirection: "row", gap: spacingValue.sm, marginTop: spacingValue.sm, marginBottom: spacingValue.lg },
    filterButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacingValue.sm,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    filterButtonActive: { backgroundColor: colors.accentSubtle, borderColor: colors.accent },
    filterText: { fontSize: 11, fontWeight: "800", color: colors.textTertiary },
    filterTextActive: { color: colors.accent },
  });
}
