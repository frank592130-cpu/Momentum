import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import {
  AppCheck as WebAppCheck,
  CustomProvider,
  getToken as getWebAppCheckToken,
  initializeAppCheck as initializeWebAppCheck,
} from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import type { AppCheck as NativeAppCheck } from "@react-native-firebase/app-check";

export interface FirebaseRuntimeConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export const firebaseConfig: FirebaseRuntimeConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const googleOAuthConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export const firebaseCollections = {
  users: "users",
  tasks: "tasks",
  goals: "goals",
} as const;

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let nativeAppCheckInstance: NativeAppCheck | null = null;
let webAppCheckInstance: WebAppCheck | null = null;
let appCheckPromise: Promise<WebAppCheck | null> | null = null;

export function isFirebaseConfigured(config = firebaseConfig) {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

export function getFirebaseApp(config = firebaseConfig): FirebaseApp {
  if (!isFirebaseConfigured(config)) {
    throw new Error("Firebase config is missing. Set EXPO_PUBLIC_FIREBASE_API_KEY, PROJECT_ID, and APP_ID.");
  }
  return getApps().length ? getApp() : initializeApp(config as FirebaseOptions);
}

export function getFirebaseAuth(app = getFirebaseApp()): Auth {
  if (authInstance) return authInstance;
  const getPersistence = (FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
  }).getReactNativePersistence;
  try {
    authInstance = getPersistence
      ? initializeAuth(app, { persistence: getPersistence(AsyncStorage) })
      : getAuth(app);
  } catch {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseFirestore(app = getFirebaseApp()): Firestore {
  if (firestoreInstance) return firestoreInstance;
  try {
    firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}

export function getFirebaseAIModel(model = "gemini-2.5-flash", app = getFirebaseApp()) {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model });
}

export async function initializeFirebaseAppCheck() {
  if (webAppCheckInstance) return webAppCheckInstance;
  if (appCheckPromise) return appCheckPromise;

  appCheckPromise = (async () => {
    if (__DEV__) {
      return null;
    }

    const [{ getApp: getNativeFirebaseApp }, nativeAppCheck] = await Promise.all([
      import("@react-native-firebase/app"),
      import("@react-native-firebase/app-check"),
    ]);

    nativeAppCheckInstance = await nativeAppCheck.initializeAppCheck(getNativeFirebaseApp(), {
      provider: {
        providerOptions: {
          android: {
            provider: "playIntegrity",
          },
          apple: {
            provider: "appAttestWithDeviceCheckFallback",
          },
        },
      },
      isTokenAutoRefreshEnabled: true,
    });

    webAppCheckInstance = initializeWebAppCheck(getFirebaseApp(), {
      provider: new CustomProvider({
        getToken: async () => {
          if (!nativeAppCheckInstance) {
            throw new Error("Native Firebase App Check is not initialized.");
          }
          const { token } = await nativeAppCheck.getToken(nativeAppCheckInstance);
          return {
            token,
            expireTimeMillis: Date.now() + 55 * 60 * 1000,
          };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });

    return webAppCheckInstance;
  })().catch((error: unknown) => {
    appCheckPromise = null;
    if (__DEV__) {
      console.warn("Firebase App Check initialization failed", error);
    }
    return null;
  });

  return appCheckPromise;
}

export async function verifyFirebaseAppCheckToken() {
  const appCheck = await initializeFirebaseAppCheck();
  if (!appCheck) return null;
  return getWebAppCheckToken(appCheck, true);
}
