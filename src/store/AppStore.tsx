import React, { createContext, useCallback, useEffect, useMemo, useReducer } from "react";
import { createInitialAppData } from "../data/initialData";
import { addDays, isValidDateKey, toDateKey } from "../domain/date";
import { AppData, AppSettings, EnergyLevel, Goal, GoalDifficulty, Task, ThemePreference } from "../domain/models";
import { normalizeDailyGoalHours, normalizeGoalDifficulty } from "../domain/stats";
import { AuthUser, listenToAuthState, toAuthUser } from "../services/auth";
import {
  ensureUserProfile,
  removeGoal,
  removeTask,
  saveGoal,
  saveTask,
  subscribeToUserData,
  updateUserSettings,
} from "../services/firestore";
import { initializeFirebaseAppCheck, isFirebaseConfigured } from "../services/firebase";
import { syncMomentumNotifications } from "../services/notifications";

export interface CreateTaskInput {
  title: string;
  tag: string;
  date: string;
  time: string;
  duration: number;
  energy: EnergyLevel;
  goalIds?: string[];
}

export interface CreateGoalInput {
  title: string;
  category: string;
  difficulty: GoalDifficulty;
  startDate: string;
  deadline: string;
  dailyGoalHours: number;
  progress: number;
}

interface ToastState {
  message: string;
  undoType?: "task" | "goal";
}

interface DeletedGoalSnapshot {
  goal: Goal;
  affectedTasks: Task[];
}

interface AppStoreState {
  data: AppData;
  isReady: boolean;
  authReady: boolean;
  user: AuthUser | null;
  profile: AuthUser | null;
  error?: string;
  toast?: ToastState;
  deletedTask?: Task;
  deletedGoal?: DeletedGoalSnapshot;
}

type Action =
  | { type: "AUTH_CHANGED"; user: AuthUser | null }
  | { type: "SYNC_LOADING" }
  | { type: "HYDRATED"; data: AppData; profile: AuthUser | null }
  | { type: "AUTH_FAILED"; error: string }
  | { type: "SYNC_FAILED"; error: string }
  | { type: "SHOW_TOAST"; toast: ToastState }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; id: string; input: CreateTaskInput; updatedAt: string }
  | { type: "TOGGLE_TASK"; id: string; completedAt?: string }
  | { type: "DELETE_TASK"; id: string }
  | { type: "UNDO_DELETE_TASK" }
  | { type: "ADD_GOAL"; goal: Goal }
  | { type: "UPDATE_GOAL"; id: string; input: CreateGoalInput; updatedAt: string }
  | { type: "DELETE_GOAL"; id: string }
  | { type: "UNDO_DELETE_GOAL" }
  | { type: "UPDATE_GOAL_PROGRESS"; id: string; progress: number }
  | { type: "UPDATE_SETTINGS"; settings: Partial<AppSettings> }
  | { type: "SET_THEME"; themePreference: ThemePreference }
  | { type: "CLEAR_TOAST" };

interface AppActions {
  addTask: (input: CreateTaskInput) => void;
  updateTask: (id: string, input: CreateTaskInput) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  addGoal: (input: CreateGoalInput) => void;
  updateGoal: (id: string, input: CreateGoalInput) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  clearToast: () => void;
}

const StateContext = createContext<AppStoreState | undefined>(undefined);
const ActionsContext = createContext<AppActions | undefined>(undefined);

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDateKey(value: string) {
  return isValidDateKey(value) ? value : toDateKey();
}

function normalizeTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : "09:00";
}

function normalizeDuration(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.max(5, Math.min(720, Math.round(value)));
}

function normalizeGoalIds(goalIds?: string[]) {
  return Array.from(new Set((goalIds ?? []).filter(Boolean)));
}

function migrateAppData(data: AppData): AppData {
  const legacySettings = data.settings as AppSettings & { dailyGoalHours?: number };
  const globalDailyGoalHours = normalizeDailyGoalHours(
    legacySettings.globalDailyGoalHours ?? legacySettings.dailyGoalHours,
    createInitialAppData().settings.globalDailyGoalHours,
  );
  const settings: AppSettings = {
    ...createInitialAppData().settings,
    ...data.settings,
    globalDailyGoalHours,
  };
  const goals = data.goals.map((goal) => ({
    ...goal,
    difficulty: normalizeGoalDifficulty(goal.difficulty),
    dailyGoalHours: normalizeDailyGoalHours(goal.dailyGoalHours, globalDailyGoalHours),
  }));
  const goalIdSet = new Set(goals.map((goal) => goal.id));
  const tasks = data.tasks.map((task) => {
    const legacyGoalId = (task as Task & { goalId?: string }).goalId;
    const goalIds = normalizeGoalIds([...(task.goalIds ?? []), ...(legacyGoalId ? [legacyGoalId] : [])]).filter((id) => goalIdSet.has(id));
    return {
      ...task,
      goalIds,
    };
  });

  return {
    schemaVersion: 2,
    settings,
    goals,
    tasks,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function requireUserId(state: AppStoreState) {
  if (!state.user?.uid) {
    throw new Error("Sign in before syncing Momentum data.");
  }
  return state.user.uid;
}

function reducer(state: AppStoreState, action: Action): AppStoreState {
  switch (action.type) {
    case "AUTH_CHANGED":
      return {
        ...state,
        user: action.user,
        profile: action.user,
        authReady: true,
        isReady: action.user ? false : true,
        data: action.user ? state.data : createInitialAppData(),
        error: undefined,
      };
    case "SYNC_LOADING":
      return { ...state, isReady: false, error: undefined };
    case "HYDRATED":
      return { ...state, data: migrateAppData(action.data), profile: action.profile ?? state.user, isReady: true, error: undefined };
    case "AUTH_FAILED":
      return { ...state, authReady: true, isReady: true, error: action.error };
    case "SYNC_FAILED":
      return { ...state, isReady: true, error: action.error };
    case "SHOW_TOAST":
      return { ...state, toast: action.toast };
    case "ADD_TASK":
      return {
        ...state,
        data: { ...state.data, tasks: [...state.data.tasks, action.task] },
        toast: { message: "Task added" },
      };
    case "UPDATE_TASK":
      return {
        ...state,
        data: {
          ...state.data,
          tasks: state.data.tasks.map((task) =>
            task.id === action.id
              ? {
                  ...task,
                  title: action.input.title.trim(),
                  tag: action.input.tag.trim() || "Focus",
                  date: normalizeDateKey(action.input.date),
                  time: normalizeTime(action.input.time),
                  duration: normalizeDuration(action.input.duration),
                  focusMinutes: normalizeDuration(action.input.duration),
                  energy: action.input.energy,
                  goalIds: normalizeGoalIds(action.input.goalIds),
                  updatedAt: action.updatedAt,
                }
              : task,
          ),
        },
        toast: { message: "Task updated" },
      };
    case "TOGGLE_TASK": {
      const tasks = state.data.tasks.map((task) => {
        if (task.id !== action.id) return task;
        const done = !task.done;
        return {
          ...task,
          done,
          completedAt: done ? action.completedAt : undefined,
          updatedAt: action.completedAt ?? new Date().toISOString(),
        };
      });
      return { ...state, data: { ...state.data, tasks } };
    }
    case "DELETE_TASK": {
      const deletedTask = state.data.tasks.find((task) => task.id === action.id);
      if (!deletedTask) return state;
      return {
        ...state,
        data: { ...state.data, tasks: state.data.tasks.filter((task) => task.id !== action.id) },
        deletedTask,
        deletedGoal: undefined,
        toast: { message: "Task deleted", undoType: "task" },
      };
    }
    case "UNDO_DELETE_TASK":
      if (!state.deletedTask) return state;
      return {
        ...state,
        data: { ...state.data, tasks: [...state.data.tasks, state.deletedTask] },
        deletedTask: undefined,
        toast: { message: "Task restored" },
      };
    case "ADD_GOAL":
      return {
        ...state,
        data: { ...state.data, goals: [...state.data.goals, action.goal] },
        toast: { message: "Goal added" },
      };
    case "UPDATE_GOAL": {
      const startDate = normalizeDateKey(action.input.startDate);
      const deadline = normalizeDateKey(action.input.deadline);
      return {
        ...state,
        data: {
          ...state.data,
          goals: state.data.goals.map((goal) =>
            goal.id === action.id
              ? {
                  ...goal,
                  title: action.input.title.trim(),
                  category: action.input.category.trim() || "Personal",
                  difficulty: normalizeGoalDifficulty(action.input.difficulty),
                  startDate,
                  deadline: deadline <= startDate ? addDays(startDate, 30) : deadline,
                  dailyGoalHours: normalizeDailyGoalHours(action.input.dailyGoalHours, state.data.settings.globalDailyGoalHours),
                  progress: Math.round(Math.max(0, Math.min(100, action.input.progress))),
                  updatedAt: action.updatedAt,
                }
              : goal,
          ),
        },
        toast: { message: "Goal updated" },
      };
    }
    case "DELETE_GOAL": {
      const goal = state.data.goals.find((item) => item.id === action.id);
      if (!goal) return state;
      const affectedTasks = state.data.tasks.filter((task) => task.goalIds.includes(action.id));
      return {
        ...state,
        data: {
          ...state.data,
          goals: state.data.goals.filter((item) => item.id !== action.id),
          tasks: state.data.tasks.map((task) =>
            task.goalIds.includes(action.id) ? { ...task, goalIds: task.goalIds.filter((goalId) => goalId !== action.id) } : task,
          ),
        },
        deletedGoal: { goal, affectedTasks },
        deletedTask: undefined,
        toast: { message: "Goal deleted", undoType: "goal" },
      };
    }
    case "UNDO_DELETE_GOAL":
      if (!state.deletedGoal) return state;
      return {
        ...state,
        data: {
          ...state.data,
          goals: [...state.data.goals, state.deletedGoal.goal],
          tasks: state.data.tasks.map((task) =>
            state.deletedGoal?.affectedTasks.find((affectedTask) => affectedTask.id === task.id)?.goalIds
              ? { ...task, goalIds: state.deletedGoal.affectedTasks.find((affectedTask) => affectedTask.id === task.id)?.goalIds ?? task.goalIds }
              : task,
          ),
        },
        deletedGoal: undefined,
        toast: { message: "Goal restored" },
      };
    case "UPDATE_GOAL_PROGRESS":
      return {
        ...state,
        data: {
          ...state.data,
          goals: state.data.goals.map((goal) =>
            goal.id === action.id
              ? { ...goal, progress: Math.round(Math.max(0, Math.min(100, action.progress))), updatedAt: new Date().toISOString() }
              : goal,
          ),
        },
      };
    case "UPDATE_SETTINGS":
      return {
        ...state,
        data: { ...state.data, settings: { ...state.data.settings, ...action.settings } },
      };
    case "SET_THEME":
      return {
        ...state,
        data: {
          ...state.data,
          settings: { ...state.data.settings, themePreference: action.themePreference },
        },
      };
    case "CLEAR_TOAST":
      return { ...state, toast: undefined };
    default:
      return state;
  }
}

const initialState: AppStoreState = {
  data: createInitialAppData(),
  isReady: false,
  authReady: false,
  user: null,
  profile: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      dispatch({
        type: "AUTH_FAILED",
        error: "Firebase config is missing. Add Expo public Firebase env values.",
      });
      return;
    }

    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeData: (() => void) | undefined;

    initializeFirebaseAppCheck().then(() => {
      if (cancelled) return;

      unsubscribeAuth = listenToAuthState(
        (firebaseUser) => {
          unsubscribeData?.();
          const authUser = toAuthUser(firebaseUser);
          dispatch({ type: "AUTH_CHANGED", user: authUser });
          if (!firebaseUser || !authUser) return;

          dispatch({ type: "SYNC_LOADING" });
          ensureUserProfile(firebaseUser).catch((error: unknown) => {
            dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not create Firebase user profile") });
          });
          unsubscribeData = subscribeToUserData(
            authUser.uid,
            ({ data, profile }) => dispatch({ type: "HYDRATED", data, profile }),
            (error) => dispatch({ type: "SYNC_FAILED", error: error.message }),
          );
        },
        (error) => dispatch({ type: "AUTH_FAILED", error: error.message }),
      );
    });

    return () => {
      cancelled = true;
      unsubscribeData?.();
      unsubscribeAuth?.();
    };
  }, []);

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 4500);
    return () => clearTimeout(timer);
  }, [state.toast]);

  useEffect(() => {
    if (!state.isReady) return;
    let cancelled = false;
    syncMomentumNotifications(state.data).catch((error: unknown) => {
      if (cancelled) return;
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not sync notifications") });
    });
    return () => {
      cancelled = true;
    };
  }, [state.data, state.isReady]);

  const addTask = useCallback((input: CreateTaskInput) => {
    const timestamp = new Date().toISOString();
    const task: Task = {
      id: createId("task"),
      title: input.title.trim(),
      tag: input.tag.trim() || "Focus",
      date: normalizeDateKey(input.date),
      time: normalizeTime(input.time),
      duration: normalizeDuration(input.duration),
      focusMinutes: normalizeDuration(input.duration),
      energy: input.energy,
      goalIds: normalizeGoalIds(input.goalIds),
      done: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "ADD_TASK", task });
      saveTask(userId, task).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not add task") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not add task") });
    }
  }, [state]);

  const updateTask = useCallback((id: string, input: CreateTaskInput) => {
    const updatedAt = new Date().toISOString();
    const current = state.data.tasks.find((task) => task.id === id);
    if (!current) return;
    const task: Task = {
      ...current,
      title: input.title.trim(),
      tag: input.tag.trim() || "Focus",
      date: normalizeDateKey(input.date),
      time: normalizeTime(input.time),
      duration: normalizeDuration(input.duration),
      focusMinutes: normalizeDuration(input.duration),
      energy: input.energy,
      goalIds: normalizeGoalIds(input.goalIds),
      updatedAt,
    };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "UPDATE_TASK", id, input, updatedAt });
      saveTask(userId, task).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update task") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update task") });
    }
  }, [state]);

  const toggleTask = useCallback((id: string) => {
    const current = state.data.tasks.find((task) => task.id === id);
    if (!current) return;
    const timestamp = new Date().toISOString();
    const task: Task = {
      ...current,
      done: !current.done,
      completedAt: !current.done ? timestamp : undefined,
      updatedAt: timestamp,
    };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "TOGGLE_TASK", id, completedAt: timestamp });
      saveTask(userId, task).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update task") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update task") });
    }
  }, [state]);

  const deleteTask = useCallback((id: string) => {
    try {
      const userId = requireUserId(state);
      dispatch({ type: "DELETE_TASK", id });
      removeTask(userId, id).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not delete task") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not delete task") });
    }
  }, [state]);

  const undoDelete = useCallback(() => {
    try {
      const userId = requireUserId(state);
      const deletedTask = state.deletedTask;
      const deletedGoal = state.deletedGoal;
      dispatch({ type: "UNDO_DELETE_TASK" });
      dispatch({ type: "UNDO_DELETE_GOAL" });
      if (deletedTask) {
        saveTask(userId, deletedTask).catch((error: unknown) => {
          dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not restore task") });
        });
      }
      if (deletedGoal) {
        saveGoal(userId, deletedGoal.goal, state.data.tasks).catch((error: unknown) => {
          dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not restore goal") });
        });
        Promise.all(deletedGoal.affectedTasks.map((task) => saveTask(userId, task))).catch((error: unknown) => {
          dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not restore goal links") });
        });
      }
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not restore item") });
    }
  }, [state]);

  const addGoal = useCallback((input: CreateGoalInput) => {
    const timestamp = new Date().toISOString();
    const startDate = normalizeDateKey(input.startDate);
    const deadline = normalizeDateKey(input.deadline);
    const goal: Goal = {
      id: createId("goal"),
      title: input.title.trim(),
      category: input.category.trim() || "Personal",
      difficulty: normalizeGoalDifficulty(input.difficulty),
      startDate,
      deadline: deadline <= startDate ? addDays(startDate, 30) : deadline,
      dailyGoalHours: normalizeDailyGoalHours(input.dailyGoalHours, state.data.settings.globalDailyGoalHours),
      progress: Math.round(Math.max(0, Math.min(100, input.progress))),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "ADD_GOAL", goal });
      saveGoal(userId, goal, state.data.tasks).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not add goal") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not add goal") });
    }
  }, [state]);

  const updateGoal = useCallback((id: string, input: CreateGoalInput) => {
    const current = state.data.goals.find((goal) => goal.id === id);
    if (!current) return;
    const updatedAt = new Date().toISOString();
    const startDate = normalizeDateKey(input.startDate);
    const deadline = normalizeDateKey(input.deadline);
    const goal: Goal = {
      ...current,
      title: input.title.trim(),
      category: input.category.trim() || "Personal",
      difficulty: normalizeGoalDifficulty(input.difficulty),
      startDate,
      deadline: deadline <= startDate ? addDays(startDate, 30) : deadline,
      dailyGoalHours: normalizeDailyGoalHours(input.dailyGoalHours, state.data.settings.globalDailyGoalHours),
      progress: Math.round(Math.max(0, Math.min(100, input.progress))),
      updatedAt,
    };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "UPDATE_GOAL", id, input, updatedAt });
      saveGoal(userId, goal, state.data.tasks).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update goal") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update goal") });
    }
  }, [state]);

  const deleteGoal = useCallback((id: string) => {
    try {
      const userId = requireUserId(state);
      dispatch({ type: "DELETE_GOAL", id });
      removeGoal(userId, id).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not delete goal") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not delete goal") });
    }
  }, [state]);

  const updateGoalProgress = useCallback((id: string, progress: number) => {
    const current = state.data.goals.find((goal) => goal.id === id);
    if (!current) return;
    const goal = { ...current, progress: Math.round(Math.max(0, Math.min(100, progress))), updatedAt: new Date().toISOString() };
    try {
      const userId = requireUserId(state);
      dispatch({ type: "UPDATE_GOAL_PROGRESS", id, progress });
      saveGoal(userId, goal, state.data.tasks).catch((error: unknown) => {
        dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update goal progress") });
      });
    } catch (error: unknown) {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update goal progress") });
    }
  }, [state]);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    const nextSettings = { ...state.data.settings, ...settings };
    dispatch({ type: "UPDATE_SETTINGS", settings });
    if (!state.user?.uid) return;
    updateUserSettings(state.user.uid, nextSettings).catch((error: unknown) => {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update settings") });
    });
  }, [state.data.settings, state.user?.uid]);

  const setThemePreference = useCallback((themePreference: ThemePreference) => {
    const nextSettings = { ...state.data.settings, themePreference };
    dispatch({ type: "SET_THEME", themePreference });
    if (!state.user?.uid) return;
    updateUserSettings(state.user.uid, nextSettings).catch((error: unknown) => {
      dispatch({ type: "SYNC_FAILED", error: getErrorMessage(error, "Could not update theme") });
    });
  }, [state.data.settings, state.user?.uid]);

  const clearToast = useCallback(() => dispatch({ type: "CLEAR_TOAST" }), []);

  const actions = useMemo<AppActions>(
    () => ({
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      undoDelete,
      addGoal,
      updateGoal,
      deleteGoal,
      updateGoalProgress,
      updateSettings,
      setThemePreference,
      clearToast,
    }),
    [addGoal, addTask, clearToast, deleteGoal, deleteTask, setThemePreference, toggleTask, undoDelete, updateGoal, updateGoalProgress, updateSettings, updateTask],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = React.useContext(StateContext);
  if (!context) throw new Error("useAppState must be used inside AppProvider");
  return context;
}

export function useAppActions() {
  const context = React.useContext(ActionsContext);
  if (!context) throw new Error("useAppActions must be used inside AppProvider");
  return context;
}
