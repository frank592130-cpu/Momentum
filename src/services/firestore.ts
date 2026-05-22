import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  collection,
  Unsubscribe,
} from "firebase/firestore";
import { AppData, AppSettings, EnergyLevel, Goal, GoalDifficulty, Task, ThemePreference } from "../domain/models";
import { calculateGoalMetrics, normalizeGoalDifficulty } from "../domain/stats";
import { createInitialAppData } from "../data/initialData";
import { AuthUser, toAuthUser } from "./auth";
import { firebaseCollections, getFirebaseFirestore } from "./firebase";

interface FirestoreUserDocument {
  name?: string;
  email?: string;
  createdAt?: string;
  darkMode?: boolean;
  themePreference?: ThemePreference;
  notificationsEnabled?: boolean;
  taskRemindersEnabled?: boolean;
  reminderLeadMinutes?: number;
  aiInsights?: boolean;
  riskAlerts?: boolean;
  weeklyReport?: boolean;
  dailyGoalHours?: number;
  workHoursStart?: string;
  workHoursEnd?: string;
}

interface FirestoreTaskDocument {
  title?: string;
  completed?: boolean;
  priority?: EnergyLevel;
  createdAt?: string;
  completedAt?: string | null;
  tag?: string;
  date?: string;
  time?: string;
  duration?: number;
  focusMinutes?: number;
  energy?: EnergyLevel;
  goalId?: string;
  updatedAt?: string;
}

interface FirestoreGoalDocument {
  title?: string;
  targetDate?: string;
  progress?: number;
  successRate?: number;
  createdAt?: string;
  category?: string;
  difficulty?: GoalDifficulty;
  startDate?: string;
  deadline?: string;
  updatedAt?: string;
}

export interface FirestoreUserData {
  profile: AuthUser | null;
  data: AppData;
}

const defaultData = createInitialAppData();

function userRef(userId: string) {
  return doc(getFirebaseFirestore(), firebaseCollections.users, userId);
}

function taskCollectionRef(userId: string) {
  return collection(userRef(userId), firebaseCollections.tasks);
}

function goalCollectionRef(userId: string) {
  return collection(userRef(userId), firebaseCollections.goals);
}

function taskRef(userId: string, taskId: string) {
  return doc(taskCollectionRef(userId), taskId);
}

function goalRef(userId: string, goalId: string) {
  return doc(goalCollectionRef(userId), goalId);
}

function normalizeThemePreference(value: unknown, darkMode: unknown): ThemePreference {
  if (value === "system" || value === "light" || value === "dark") return value;
  return darkMode === false ? "light" : "dark";
}

function fromUserDocument(id: string, document: FirestoreUserDocument | undefined): FirestoreUserData["profile"] {
  if (!document) return null;
  return {
    uid: id,
    name: document.name ?? document.email?.split("@")[0] ?? "Momentum",
    email: document.email ?? "",
  };
}

function settingsFromUserDocument(document: FirestoreUserDocument | undefined): AppSettings {
  return {
    ...defaultData.settings,
    themePreference: normalizeThemePreference(document?.themePreference, document?.darkMode),
    notificationsEnabled: document?.notificationsEnabled ?? defaultData.settings.notificationsEnabled,
    taskRemindersEnabled: document?.taskRemindersEnabled ?? defaultData.settings.taskRemindersEnabled,
    reminderLeadMinutes: document?.reminderLeadMinutes ?? defaultData.settings.reminderLeadMinutes,
    aiInsights: document?.aiInsights ?? defaultData.settings.aiInsights,
    riskAlerts: document?.riskAlerts ?? defaultData.settings.riskAlerts,
    weeklyReport: document?.weeklyReport ?? defaultData.settings.weeklyReport,
    dailyGoalHours: document?.dailyGoalHours ?? defaultData.settings.dailyGoalHours,
    workHoursStart: document?.workHoursStart ?? defaultData.settings.workHoursStart,
    workHoursEnd: document?.workHoursEnd ?? defaultData.settings.workHoursEnd,
  };
}

function fromTaskDocument(id: string, document: FirestoreTaskDocument): Task {
  const timestamp = new Date().toISOString();
  const duration = document.duration ?? 30;
  const energy = document.energy ?? document.priority ?? "medium";
  return {
    id,
    title: document.title ?? "Untitled task",
    tag: document.tag ?? "Focus",
    date: document.date ?? new Date().toISOString().slice(0, 10),
    time: document.time ?? "09:00",
    duration,
    focusMinutes: document.focusMinutes ?? duration,
    done: document.completed ?? false,
    energy,
    goalId: document.goalId,
    completedAt: document.completedAt ?? undefined,
    createdAt: document.createdAt ?? timestamp,
    updatedAt: document.updatedAt ?? document.createdAt ?? timestamp,
  };
}

function toTaskDocument(task: Task): FirestoreTaskDocument {
  return {
    title: task.title,
    completed: task.done,
    priority: task.energy,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
    tag: task.tag,
    date: task.date,
    time: task.time,
    duration: task.duration,
    focusMinutes: task.focusMinutes,
    energy: task.energy,
    goalId: task.goalId,
    updatedAt: task.updatedAt,
  };
}

function fromGoalDocument(id: string, document: FirestoreGoalDocument): Goal {
  const timestamp = new Date().toISOString();
  const deadline = document.deadline ?? document.targetDate ?? new Date().toISOString().slice(0, 10);
  return {
    id,
    title: document.title ?? "Untitled goal",
    category: document.category ?? "Personal",
    difficulty: normalizeGoalDifficulty(document.difficulty),
    startDate: document.startDate ?? new Date().toISOString().slice(0, 10),
    deadline,
    progress: document.progress ?? 0,
    createdAt: document.createdAt ?? timestamp,
    updatedAt: document.updatedAt ?? document.createdAt ?? timestamp,
  };
}

function toGoalDocument(goal: Goal, tasks: Task[] = []): FirestoreGoalDocument {
  return {
    title: goal.title,
    targetDate: goal.deadline,
    progress: goal.progress,
    successRate: calculateGoalMetrics(goal, tasks).successRate,
    createdAt: goal.createdAt,
    category: goal.category,
    difficulty: normalizeGoalDifficulty(goal.difficulty),
    startDate: goal.startDate,
    deadline: goal.deadline,
    updatedAt: goal.updatedAt,
  };
}

function toUserSettingsDocument(settings: AppSettings): Partial<FirestoreUserDocument> {
  return {
    darkMode: settings.themePreference === "dark",
    themePreference: settings.themePreference,
    notificationsEnabled: settings.notificationsEnabled,
    taskRemindersEnabled: settings.taskRemindersEnabled,
    reminderLeadMinutes: settings.reminderLeadMinutes,
    aiInsights: settings.aiInsights,
    riskAlerts: settings.riskAlerts,
    weeklyReport: settings.weeklyReport,
    dailyGoalHours: settings.dailyGoalHours,
    workHoursStart: settings.workHoursStart,
    workHoursEnd: settings.workHoursEnd,
  };
}

export async function ensureUserProfile(firebaseUser: Parameters<typeof toAuthUser>[0]) {
  const authUser = toAuthUser(firebaseUser);
  if (!authUser) return;
  const ref = userRef(authUser.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    await setDoc(ref, { name: authUser.name, email: authUser.email }, { merge: true });
    return;
  }
  const timestamp = new Date().toISOString();
  await setDoc(ref, {
    name: authUser.name,
    email: authUser.email,
    createdAt: timestamp,
    ...toUserSettingsDocument(defaultData.settings),
  });
}

export function subscribeToUserData(
  userId: string,
  onData: (data: FirestoreUserData) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let profile: FirestoreUserData["profile"] = null;
  let settings = defaultData.settings;
  let tasks: Task[] = [];
  let goals: Goal[] = [];
  const ready = { user: false, tasks: false, goals: false };

  const emit = () => {
    if (!ready.user || !ready.tasks || !ready.goals) return;
    onData({
      profile,
      data: {
        schemaVersion: 1,
        settings,
        tasks,
        goals,
      },
    });
  };

  const unsubUser = onSnapshot(
    userRef(userId),
    (snapshot) => {
      const document = snapshot.data() as FirestoreUserDocument | undefined;
      profile = fromUserDocument(userId, document);
      settings = settingsFromUserDocument(document);
      ready.user = true;
      emit();
    },
    onError,
  );

  const unsubTasks = onSnapshot(
    query(taskCollectionRef(userId), orderBy("createdAt", "asc")),
    (snapshot) => {
      tasks = snapshot.docs.map((item) => fromTaskDocument(item.id, item.data() as FirestoreTaskDocument));
      ready.tasks = true;
      emit();
    },
    onError,
  );

  const unsubGoals = onSnapshot(
    query(goalCollectionRef(userId), orderBy("createdAt", "asc")),
    (snapshot) => {
      goals = snapshot.docs.map((item) => fromGoalDocument(item.id, item.data() as FirestoreGoalDocument));
      ready.goals = true;
      emit();
    },
    onError,
  );

  return () => {
    unsubUser();
    unsubTasks();
    unsubGoals();
  };
}

export async function saveTask(userId: string, task: Task) {
  await setDoc(taskRef(userId, task.id), toTaskDocument(task), { merge: true });
}

export async function removeTask(userId: string, taskId: string) {
  await deleteDoc(taskRef(userId, taskId));
}

export async function saveGoal(userId: string, goal: Goal, tasks: Task[] = []) {
  await setDoc(goalRef(userId, goal.id), toGoalDocument(goal, tasks), { merge: true });
}

export async function removeGoal(userId: string, goalId: string) {
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  batch.delete(goalRef(userId, goalId));
  const linkedTasks = await getDocs(query(taskCollectionRef(userId), where("goalId", "==", goalId)));
  linkedTasks.docs.forEach((taskDoc) => {
    batch.update(taskDoc.ref, { goalId: deleteField(), updatedAt: new Date().toISOString() });
  });
  await batch.commit();
}

export async function updateUserSettings(userId: string, settings: AppSettings) {
  await setDoc(userRef(userId), toUserSettingsDocument(settings), { merge: true });
}

export async function updateUserProfile(userId: string, input: Partial<Pick<AuthUser, "name" | "email">>) {
  await updateDoc(userRef(userId), input);
}
