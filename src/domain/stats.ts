import { addDays, dateRange, diffInDays, lastNDays, toDateKey } from "./date";
import {
  AnalyticsData,
  AnalyticsInsight,
  Goal,
  GoalMetrics,
  GoalProgress,
  RiskLevel,
  Task,
  WorkloadSlice,
} from "./models";



export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function getAverage(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeDailyGoalHours(value: unknown, fallback = 1) {
  const hours = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(hours)) return fallback;
  return round(clamp(hours, 0.25, 24), 2);
}

export function getTasksForDate(tasks: Task[], dateKey: string) {
  return tasks
    .filter((task) => task.date === dateKey)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function getTasksBetween(tasks: Task[], startDateKey: string, endDateKey: string) {
  return tasks.filter((task) => diffInDays(startDateKey, task.date) >= 0 && diffInDays(task.date, endDateKey) >= 0);
}

export function getCompletionRate(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100);
}

export function getCompletedFocusHours(tasks: Task[]) {
  return round(
    tasks
      .filter((task) => task.done)
      .reduce((sum, task) => sum + (task.focusMinutes || task.duration), 0) / 60,
    1,
  );
}

export function getCompletedDurationHours(tasks: Task[]) {
  return round(tasks.filter((task) => task.done).reduce((sum, task) => sum + task.duration, 0) / 60, 1);
}

export function getTotalDurationHours(tasks: Task[]) {
  return round(tasks.reduce((sum, task) => sum + task.duration, 0) / 60, 1);
}

export function getTasksForGoal(tasks: Task[], goalId: string): Task[] {
  return tasks.filter((task) => {
    const legacyGoalId = (task as Task & { goalId?: string }).goalId;
    return (task.goalIds ?? []).includes(goalId) || legacyGoalId === goalId;
  });
}

function getTaskMinutes(task: Task) {
  return Math.max(0, task.focusMinutes || task.duration || 0);
}

function getCompletedDateKey(task: Task) {
  if (!task.completedAt) return task.date;
  return toDateKey(new Date(task.completedAt));
}

function getTaskCreatedDateKey(task: Task) {
  return toDateKey(new Date(task.createdAt));
}

function isTaskDoneBy(task: Task, dateKey: string) {
  return task.done && diffInDays(getCompletedDateKey(task), dateKey) >= 0;
}

function isTaskPlannedBeforeDate(task: Task) {
  return diffInDays(getTaskCreatedDateKey(task), task.date) >= 1;
}

function getPlannedTaskMinutes(tasks: Task[]) {
  return tasks.reduce((sum, task) => sum + getTaskMinutes(task), 0);
}

function getCompletedTaskMinutes(tasks: Task[], dateKey: string) {
  return tasks.filter((task) => isTaskDoneBy(task, dateKey)).reduce((sum, task) => sum + getTaskMinutes(task), 0);
}

function getCompletedFocusHoursForDate(tasks: Task[], dateKey: string, asOfDateKey: string) {
  return round(getCompletedTaskMinutes(getTasksForDate(tasks, dateKey), asOfDateKey) / 60, 1);
}

function getRecentGoalDates(goal: Goal, todayKey: string) {
  return lastNDays(7, todayKey).filter(
    (dateKey) =>
      diffInDays(goal.startDate, dateKey) >= 0 &&
      diffInDays(dateKey, todayKey) >= 0 &&
      diffInDays(dateKey, goal.deadline) >= 0,
  );
}

export function calculateGoalMetrics(goal: Goal, tasks: Task[], todayKey = toDateKey()): GoalMetrics {
  // 基本信息
  const linkedTasks = getTasksForGoal(tasks, goal.id);
  const dailyTargetHours = normalizeDailyGoalHours(goal.dailyGoalHours);
  const progress = Math.round(clamp(goal.progress));
  const plannedLinkedMinutes = getPlannedTaskMinutes(linkedTasks);
  const completedLinkedMinutes = getCompletedTaskMinutes(linkedTasks, todayKey);
  const totalDays = Math.max(1, diffInDays(goal.startDate, goal.deadline));
  const daysLeft = diffInDays(todayKey, goal.deadline);
  const completedLinkedTaskCount = linkedTasks.filter((task) => isTaskDoneBy(task, todayKey)).length;

  // 新的分析指標
  const streak = calculateGoalStreak(tasks, goal.id, dailyTargetHours, todayKey);
  const weekly = getGoalWeeklyProgress(tasks, goal.id, dailyTargetHours, todayKey);
  const velocity = getGoalProgressVelocity(tasks, goal.id, dailyTargetHours, todayKey);
  
  // 今天是否達成
  const todayTasks = getTasksForDate(linkedTasks, todayKey);
  const todayHours = getCompletedFocusHours(todayTasks);
  const dailyGoalMet = todayHours >= dailyTargetHours;

  // 計算風險等級（基於 velocity 和 progress）
  let risk: RiskLevel = "low";
  if (velocity < -20 || progress < 20) risk = "high";
  else if (velocity < 0 || progress < 50) risk = "medium";

  // 計算本週小時數
  const thisWeekDates = lastNDays(7, todayKey);
  const weeklyHours = thisWeekDates.map((dateKey) => getCompletedFocusHoursForDate(linkedTasks, dateKey, todayKey));

  return {
    ...goal,
    daysLeft: Math.max(0, daysLeft),
    risk,
    weeklyHours,
    dailyTargetHours,
    linkedTaskCount: linkedTasks.length,
    completedLinkedTaskCount,
    plannedLinkedMinutes,
    completedLinkedMinutes,
    progressSource: "manual",
    
    // 新分析指標
    currentStreak: streak.current,
    longestStreak: streak.longest,
    streakStartDate: streak.streakStartDate,
    weeklyProgress: weekly.daysMetGoal,
    velocityTrend: velocity,
    goalBalanceScore: getGoalBalanceScore(tasks, [goal], todayKey),
    dailyGoalMet,
  };
}

export function enrichGoals(goals: Goal[], tasks: Task[], todayKey = toDateKey()) {
  return goals.map((goal) => calculateGoalMetrics(goal, tasks, todayKey));
}

function getWorkloadDistribution(tasks: Task[]): WorkloadSlice[] {
  const minutesByTag = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.tag] = (acc[task.tag] || 0) + task.duration;
    return acc;
  }, {});
  const total = Object.values(minutesByTag).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  return Object.entries(minutesByTag)
    .map(([label, minutes]) => ({ label, minutes, pct: Math.round((minutes / total) * 100) }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function getTrendPercent(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return round(((current - previous) / previous) * 100, 1);
}

export function getActiveDays(tasks: Task[], days: string[]) {
  return days.filter((dateKey) => getTasksForDate(tasks, dateKey).some((task) => task.done)).length;
}

export function getStreakDays(tasks: Task[], todayKey: string) {
  let streak = 0;
  let dateKey = todayKey;
  while (getTasksForDate(tasks, dateKey).some((task) => task.done)) {
    streak += 1;
    dateKey = addDays(dateKey, -1);
  }
  return streak;
}

function getGoalCompletedHoursForDate(goalTasks: Task[], dateKey: string) {
  return getCompletedFocusHours(getTasksForDate(goalTasks, dateKey));
}

export function calculateGoalStreak(tasks: Task[], goalId: string, dailyGoalHours: number, todayKey = toDateKey()) {
  const goalTasks = getTasksForGoal(tasks, goalId);
  const targetHours = normalizeDailyGoalHours(dailyGoalHours);
  if (!goalTasks.length) return { current: 0, longest: 0, streakStartDate: todayKey };

  const days = Array.from({ length: 365 }, (_, index) => addDays(todayKey, -index));
  let current = 0;
  let currentIsOpen = true;
  let longest = 0;
  let running = 0;

  days.forEach((dateKey) => {
    const hours = getGoalCompletedHoursForDate(goalTasks, dateKey);
    if (hours >= targetHours) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      if (currentIsOpen) {
        current = running;
        currentIsOpen = false;
      }
      running = 0;
    }
  });

  if (currentIsOpen) current = running;

  return {
    current,
    longest,
    streakStartDate: current > 0 ? addDays(todayKey, -(current - 1)) : todayKey,
  };
}

export function getGoalWeeklyProgress(tasks: Task[], goalId: string, dailyGoalHours: number, todayKey = toDateKey()) {
  const goalTasks = getTasksForGoal(tasks, goalId);
  const targetHours = normalizeDailyGoalHours(dailyGoalHours);
  const days = lastNDays(7, todayKey);
  const weeklyHours = days.map((dateKey) => getGoalCompletedHoursForDate(goalTasks, dateKey));
  return {
    weeklyHours,
    daysMetGoal: weeklyHours.filter((hours) => hours >= targetHours).length,
  };
}

export function getGoalProgressVelocity(tasks: Task[], goalId: string, dailyGoalHours: number, todayKey = toDateKey()) {
  const goalTasks = getTasksForGoal(tasks, goalId);
  const thisWeekHours = lastNDays(7, todayKey).reduce((sum, dateKey) => sum + getGoalCompletedHoursForDate(goalTasks, dateKey), 0);
  const lastWeekHours = dateRange(addDays(todayKey, -13), addDays(todayKey, -7)).reduce((sum, dateKey) => sum + getGoalCompletedHoursForDate(goalTasks, dateKey), 0);
  return getTrendPercent(thisWeekHours, lastWeekHours);
}

export function getGoalBalanceScore(tasks: Task[], goals: Goal[], todayKey = toDateKey()) {
  if (goals.length <= 1) return 100;

  const days = lastNDays(7, todayKey);
  const goalEffort = goals.map((goal) => {
    const linkedTasks = getTasksForGoal(tasks, goal.id);
    return days.reduce((sum, dateKey) => sum + getGoalCompletedHoursForDate(linkedTasks, dateKey), 0);
  });
  const avgEffort = goalEffort.reduce((sum, effort) => sum + effort, 0) / goalEffort.length;
  if (avgEffort === 0) return 50;

  const variance = goalEffort.reduce((sum, effort) => sum + (effort - avgEffort) ** 2, 0) / goalEffort.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avgEffort;
  return Math.round(clamp(100 - cv * 100));
}

export function estimateOptimalGoalCount(tasks: Task[], goals: Goal[], todayKey = toDateKey()) {
  const last30 = lastNDays(30, todayKey);
  const totalFocusHours = last30.reduce((sum, dateKey) => sum + getCompletedFocusHours(getTasksForDate(tasks, dateKey)), 0);
  const avgDailyHours = totalFocusHours / 30;
  const avgWeeklyHours = avgDailyHours * 7;
  const targetHoursPerGoal = Math.max(3, Math.floor(avgWeeklyHours / 3));
  const recommended = Math.max(1, Math.floor(avgWeeklyHours / targetHoursPerGoal));
  let message = "You're at a healthy goal capacity.";

  if (goals.length > recommended + 2) {
    message = `You're managing ${goals.length} goals but can realistically focus on ~${recommended}. Consider consolidating.`;
  } else if (goals.length < recommended - 1 && goals.length > 0) {
    message = `Based on your pace, you could handle ${recommended} active goals.`;
  }

  return {
    recommended,
    current: goals.length,
    message,
  };
}

export function buildGoalProgressMap(tasks: Task[], goals: Goal[], todayKey = toDateKey()): Record<string, GoalProgress> {
  return goals.reduce<Record<string, GoalProgress>>((acc, goal) => {
    const targetHours = normalizeDailyGoalHours(goal.dailyGoalHours, 8.5);
    const streak = calculateGoalStreak(tasks, goal.id, targetHours, todayKey);
    const weekly = getGoalWeeklyProgress(tasks, goal.id, targetHours, todayKey);
    const velocity = getGoalProgressVelocity(tasks, goal.id, targetHours, todayKey);
    acc[goal.id] = {
      goalId: goal.id,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      streakStartDate: streak.streakStartDate,
      weeklyProgress: weekly.daysMetGoal,
      weeklyTarget: 7,
      velocityTrend: velocity,
    };
    return acc;
  }, {});
}

export function generateAnalyticsInsights(
  tasks: Task[],
  goals: Goal[],
  goalProgressMap: Record<string, GoalProgress>,
  goalBalanceScore: number,
  totalStreakDays: number,
  todayKey = toDateKey(),
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const capacity = estimateOptimalGoalCount(tasks, goals, todayKey);

  if (capacity.current > capacity.recommended + 2) {
    insights.push({
      type: "capacity",
      title: "⚠️ Goal Overload",
      body: capacity.message,
      icon: "⚠️",
      severity: "warning",
    });
  } else if (capacity.current < capacity.recommended - 1 && capacity.current > 0) {
    insights.push({
      type: "capacity",
      title: "📈 Room for More",
      body: capacity.message,
      icon: "📈",
      severity: "neutral",
    });
  }

  if (goalBalanceScore < 40) {
    insights.push({
      type: "balance",
      title: "⚖️ Unbalanced Effort",
      body: "Your work is concentrated on a few goals. Try diversifying your focus.",
      icon: "⚖️",
      severity: "warning",
    });
  } else if (goalBalanceScore >= 75) {
    insights.push({
      type: "balance",
      title: "✨ Well-Balanced Week",
      body: "Great job distributing effort evenly across goals!",
      icon: "✨",
      severity: "positive",
    });
  }

  if (totalStreakDays >= 14) {
    insights.push({
      type: "streak",
      title: "🔥 Unstoppable Momentum!",
      body: `${totalStreakDays} days strong. You're in the zone!`,
      icon: "🔥",
      severity: "positive",
    });
  } else if (totalStreakDays >= 7) {
    insights.push({
      type: "streak",
      title: "🎯 Week Streak",
      body: `${totalStreakDays} days of consistent work. Keep it going!`,
      icon: "🎯",
      severity: "positive",
    });
  }

  const velocityWarnings = Object.values(goalProgressMap)
    .filter((progress) => progress.velocityTrend < -30)
    .sort((a, b) => a.velocityTrend - b.velocityTrend)
    .slice(0, 2);

  velocityWarnings.forEach((warning) => {
    const goal = goals.find((item) => item.id === warning.goalId);
    if (!goal) return;
    insights.push({
      type: "velocity",
      title: `📉 Slowing Down: ${goal.title}`,
      body: `Effort on this goal dropped ${Math.abs(warning.velocityTrend)}% this week.`,
      icon: "📉",
      severity: "warning",
    });
  });

  return insights;
}

function getBestWeekLabel(tasks: Task[], todayKey: string) {
  const chunks = [
    { label: "This week", end: todayKey },
    { label: "Last week", end: addDays(todayKey, -7) },
    { label: "2 weeks ago", end: addDays(todayKey, -14) },
    { label: "3 weeks ago", end: addDays(todayKey, -21) },
  ];
  const best = chunks
    .map((chunk) => {
      const days = lastNDays(7, chunk.end);
      const hours = days.reduce((sum, dateKey) => sum + getCompletedFocusHours(getTasksForDate(tasks, dateKey)), 0);
      return { ...chunk, hours };
    })
    .sort((a, b) => b.hours - a.hours)[0];
  return best?.label ?? "No data";
}

export function getAnalyticsData(goals: Goal[], tasks: Task[], todayKey = toDateKey()): AnalyticsData {
  const last7 = lastNDays(7, todayKey);
  const last30 = lastNDays(30, todayKey);
  const overallWeeklyCompletion = last7.map((dateKey) => getCompletionRate(getTasksForDate(tasks, dateKey)));
  const overallFocusHours = last7.map((dateKey) => getCompletedFocusHours(getTasksForDate(tasks, dateKey)));
  const goalProgressMap = buildGoalProgressMap(tasks, goals, todayKey);
  const goalBalanceScore = getGoalBalanceScore(tasks, goals, todayKey);
  const totalStreakDays = getStreakDays(tasks, todayKey);

  return {
    goalProgressMap,
    overallWeeklyCompletion,
    overallFocusHours,
    insights: generateAnalyticsInsights(tasks, goals, goalProgressMap, goalBalanceScore, totalStreakDays, todayKey),
    activeDays30: getActiveDays(tasks, last30),
    totalStreakDays,
    goalBalanceScore,
  };
}

export function getAnalyticsTrends(goals: Goal[], tasks: Task[], todayKey = toDateKey()) {
  const current = getAnalyticsData(goals, tasks, todayKey);
  const previous = getAnalyticsData(goals, tasks, addDays(todayKey, -7));

  const balanceVal = getTrendPercent(current.goalBalanceScore, previous.goalBalanceScore);
  const streakVal = getTrendPercent(current.totalStreakDays, previous.totalStreakDays);
  const completionVal = getTrendPercent(
    getAverage(current.overallWeeklyCompletion),
    getAverage(previous.overallWeeklyCompletion)
  );
  const focusVal = getTrendPercent(
    getAverage(current.overallFocusHours),
    getAverage(previous.overallFocusHours)
  );

  return {
    balance: balanceVal,
    streak: streakVal,
    completion: completionVal,
    focus: focusVal,
    balanceChange: balanceVal,
    streakChange: streakVal,
    completionChange: completionVal,
    focusChange: focusVal,
  };
}
