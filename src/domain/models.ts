export type ISODateString = string;
export type ISODateTimeString = string;

export type EnergyLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type ThemePreference = "system" | "light" | "dark";
export type GoalDifficulty = "easy" | "standard" | "hard" | "extreme";
export type GoalProgressSource = "manual" | "tasks";
export type AnalyticsInsightSeverity = "positive" | "neutral" | "warning";
export type AnalyticsInsightType = "capacity" | "balance" | "streak" | "velocity";

export interface Goal {
  id: string;
  title: string;
  category: string;
  difficulty: GoalDifficulty;
  startDate: ISODateString;
  deadline: ISODateString;
  dailyGoalHours: number;
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
  goalIds: string[];
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
  globalDailyGoalHours: number;
  workHoursStart: string;
  workHoursEnd: string;
}

export interface AppData {
  schemaVersion: 2;
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
  healthScore: number;
  risk: RiskLevel;
  weeklyHours: number[];
  dailyTargetHours: number;
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

export interface GoalProgress {
  goalId: string;
  currentStreak: number;
  longestStreak: number;
  streakStartDate?: ISODateString;
  weeklyProgress: number;
  weeklyTarget: number;
  velocityTrend: number;
}

export interface AnalyticsInsight {
  type: AnalyticsInsightType;
  title: string;
  body: string;
  icon: string;
  severity: AnalyticsInsightSeverity;
}

export interface EnhancedAnalyticsData {
  goalProgressMap: Record<string, GoalProgress>;
  overallWeeklyCompletion: number[];
  overallFocusHours: number[];
  insights: AnalyticsInsight[];
  activeDays30: number;
  totalStreakDays: number;
  goalBalanceScore: number;
}

export type AnalyticsData = EnhancedAnalyticsData;
