import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AppData, GoalMetrics, Task } from "../domain/models";
import { enrichGoals, getAnalyticsData, getAverage, round } from "../domain/stats";

const CHANNEL_ID = "momentum-reminders";
const NOTIFICATION_PREFIX = "momentum-";
const RISK_NOTIFICATION_ID = `${NOTIFICATION_PREFIX}risk-daily`;
const WEEKLY_NOTIFICATION_ID = `${NOTIFICATION_PREFIX}weekly-report`;
let didRequestPermission = false;

type MomentumNotificationKind = "task" | "risk" | "weekly";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

function getTaskNotificationId(taskId: string) {
  return `${NOTIFICATION_PREFIX}task-${taskId}`;
}

function parseTaskDateTime(task: Task) {
  const [year, month, day] = task.date.split("-").map(Number);
  const [hour, minute] = task.time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute);
}

function getTaskReminderDate(task: Task, leadMinutes: number) {
  const startDate = parseTaskDateTime(task);
  if (!startDate) return null;
  return new Date(startDate.getTime() - Math.max(0, leadMinutes) * 60 * 1000);
}

function isMomentumNotification(identifier: string) {
  return identifier.startsWith(NOTIFICATION_PREFIX);
}

async function ensureNotificationPermission() {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Momentum reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7B6EF6",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === "granted") return true;
  if (!current.canAskAgain || didRequestPermission) return false;

  didRequestPermission = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.status === "granted";
}

async function cancelMomentumNotifications() {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => isMomentumNotification(notification.identifier))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

async function scheduleTaskNotification(task: Task, leadMinutes: number) {
  const triggerDate = getTaskReminderDate(task, leadMinutes);
  if (!triggerDate || triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: getTaskNotificationId(task.id),
    content: {
      title: "Upcoming task",
      body: `${task.title} starts at ${task.time}`,
      data: { momentum: true, kind: "task" satisfies MomentumNotificationKind, taskId: task.id },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: CHANNEL_ID,
    },
  });
}

async function scheduleRiskNotification(highRiskGoals: GoalMetrics[]) {
  const topRiskGoal = highRiskGoals.sort((a, b) => a.healthScore - b.healthScore)[0];
  if (!topRiskGoal) return;

  await Notifications.scheduleNotificationAsync({
    identifier: RISK_NOTIFICATION_ID,
    content: {
      title: "Goal risk alert",
      body: `Review "${topRiskGoal.title}" - health ${topRiskGoal.healthScore}%`,
      data: { momentum: true, kind: "risk" satisfies MomentumNotificationKind, goalId: topRiskGoal.id },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

async function scheduleWeeklyReportNotification(data: AppData) {
  const analytics = getAnalyticsData(data.goals, data.tasks);
  const weeklyCompletionRate = Math.round(getAverage(analytics.overallWeeklyCompletion));
  const avgDailyFocusHours = round(getAverage(analytics.overallFocusHours), 1);
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_NOTIFICATION_ID,
    content: {
      title: "Weekly report",
      body: `${weeklyCompletionRate}% completion, ${avgDailyFocusHours}h avg focus, ${analytics.activeDays30} active days`,
      data: { momentum: true, kind: "weekly" satisfies MomentumNotificationKind },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 18,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

export async function syncMomentumNotifications(data: AppData) {
  if (Platform.OS === "web") return;

  await cancelMomentumNotifications();
  if (!data.settings.notificationsEnabled) return;

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return;

  if (data.settings.taskRemindersEnabled) {
    const leadMinutes = data.settings.reminderLeadMinutes;
    await Promise.all(data.tasks.filter((task) => !task.done).map((task) => scheduleTaskNotification(task, leadMinutes)));
  }

  if (data.settings.riskAlerts) {
    const highRiskGoals = enrichGoals(data.goals, data.tasks).filter((goal) => goal.risk === "high");
    await scheduleRiskNotification(highRiskGoals);
  }

  if (data.settings.weeklyReport) {
    await scheduleWeeklyReportNotification(data);
  }
}

export async function scheduleMomentumTestNotification() {
  if (Platform.OS === "web") return false;
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIFICATION_PREFIX}test-${Date.now()}`,
    content: {
      title: "Momentum test",
      body: "Notifications are working.",
      data: { momentum: true, kind: "task" satisfies MomentumNotificationKind },
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });

  return true;
}
