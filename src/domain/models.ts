export type ISODateString = string;
export type ISODateTimeString = string;

export type EnergyLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type ThemePreference = "system" | "light" | "dark";
export type GoalDifficulty = "easy" | "standard" | "hard" | "extreme";
export type GoalProgressSource = "manual" | "tasks";

export interface Goal {
  id: string;
  title: string;
  category: string;
  difficulty: GoalDifficulty;
  startDate: ISODateString;
  deadline: ISODateString;
  progress: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface Task {
  id: string;
  title: string;
  tag: string;
  date: ISODateString;
  time: string;
  duration: number;
  focusMinutes: number;
  done: boolean;
  energy: EnergyLevel;
  goalId?: string;
  completedAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface AppSettings {
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  taskRemindersEnabled: boolean;
  reminderLeadMinutes: number;
  aiInsights: boolean;
  riskAlerts: boolean;
  weeklyReport: boolean;
  dailyGoalHours: number;
  workHoursStart: string;
  workHoursEnd: string;
}

export interface AppData {
  schemaVersion: 1;
  goals: Goal[];
  tasks: Task[];
  settings: AppSettings;
}

export interface GoalMetrics extends Goal {
  daysLeft: number;
  expectedProgress: number;
  paceScore: number;
  progressScore: number;
  effortScore: number;
  planningScore: number;
  consistencyScore: number;
  momentumScore: number;
  completionRate: number;
  trendScore: number;
  successRate: number;
  risk: RiskLevel;
  weeklyHours: number[];
  linkedTaskCount: number;
  completedLinkedTaskCount: number;
  plannedLinkedMinutes: number;
  completedLinkedMinutes: number;
  progressSource: GoalProgressSource;
  difficultyFactor: number;
}

export interface WorkloadSlice {
  label: string;
  pct: number;
  minutes: number;
}

export interface AnalyticsData {
  successTrend: number[];
  weeklyCompletion: number[];
  focusHours: number[];
  workloadDist: WorkloadSlice[];
  avgGoalSuccessRate: number;
  weeklyCompletionRate: number;
  avgDailyFocusHours: number;
  activeDays30: number;
  streakDays: number;
  bestWeekLabel: string;
}
