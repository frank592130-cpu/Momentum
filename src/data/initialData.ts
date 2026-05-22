import { AppData } from "../domain/models";

export function createInitialAppData(): AppData {
  return {
    schemaVersion: 1,
    goals: [],
    tasks: [],
    settings: {
      themePreference: "dark",
      notificationsEnabled: false,
      taskRemindersEnabled: true,
      reminderLeadMinutes: 10,
      aiInsights: true,
      riskAlerts: true,
      weeklyReport: false,
      dailyGoalHours: 8.5,
      workHoursStart: "09:00",
      workHoursEnd: "18:00",
    },
  };
}
