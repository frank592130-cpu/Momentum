import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  getAuthErrorMessage,
  logout,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogleIdToken,
  signInWithGooglePopup,
} from "../services/auth";
import { googleOAuthConfig } from "../services/firebase";
import { useAppState } from "../store/AppStore";

WebBrowser.maybeCompleteAuthSession();

const DISABLED_GOOGLE_CLIENT_ID = "disabled-google-client-id.apps.googleusercontent.com";

function hasPlatformGoogleClient() {
  if (Platform.OS === "web") return true;
  if (Platform.OS === "ios") return Boolean(googleOAuthConfig.iosClientId);
  if (Platform.OS === "android") return Boolean(googleOAuthConfig.androidClientId);
  return false;
}

export function useAuth() {
  const { user, profile, authReady } = useAppState();
  return {
    user,
    profile: profile ?? user,
    isAuthenticated: Boolean(user),
    authReady,
  };
}

export function useAuthActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const googleClientAvailable = hasPlatformGoogleClient();
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleOAuthConfig.webClientId ?? DISABLED_GOOGLE_CLIENT_ID,
    iosClientId: googleOAuthConfig.iosClientId ?? DISABLED_GOOGLE_CLIENT_ID,
    androidClientId: googleOAuthConfig.androidClientId ?? DISABLED_GOOGLE_CLIENT_ID,
    selectAccount: true,
  });

  const hasGoogleClient = useMemo(() => googleClientAvailable, [googleClientAvailable]);

  const runAuthAction = useCallback(async (action: () => Promise<unknown>) => {
    setIsLoading(true);
    setError("");
    try {
      await action();
    } catch (authError: unknown) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInEmail = useCallback((email: string, password: string) => {
    return runAuthAction(() => signInWithEmail(email, password));
  }, [runAuthAction]);

  const registerEmail = useCallback((email: string, password: string, name: string) => {
    return runAuthAction(() => registerWithEmail(email, password, name));
  }, [runAuthAction]);

  const signInGoogle = useCallback(() => {
    return runAuthAction(async () => {
      if (!hasGoogleClient) {
        throw new Error("Google OAuth client ID is missing.");
      }
      if (Platform.OS === "web") {
        await signInWithGooglePopup();
        return;
      }
      if (!request) {
        throw new Error("Google sign-in is not ready yet.");
      }
      const result = await promptAsync();
      if (result.type !== "success") {
        throw new Error("Google sign-in was cancelled.");
      }
      const idToken = result.params.id_token;
      if (!idToken) {
        throw new Error("Google did not return an ID token.");
      }
      await signInWithGoogleIdToken(idToken);
    });
  }, [hasGoogleClient, promptAsync, request, runAuthAction]);

  const signOut = useCallback(() => {
    return runAuthAction(logout);
  }, [runAuthAction]);

  const clearError = useCallback(() => setError(""), []);

  return {
    isLoading,
    error,
    googleReady: hasGoogleClient && Boolean(request),
    clearError,
    signInEmail,
    registerEmail,
    signInGoogle,
    signOut,
  };
}
