import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth, useAuthActions } from "../hooks/useAuth";
import { googleOAuthConfig, isFirebaseConfigured } from "../services/firebase";
import { updateUserProfile } from "../services/firestore";
import { ThemeColors, useAppTheme } from "../theme";

function hasGoogleClientForPlatform() {
  if (Platform.OS === "web") return isFirebaseConfigured();
  if (Platform.OS === "ios") return Boolean(googleOAuthConfig.iosClientId);
  if (Platform.OS === "android") return Boolean(googleOAuthConfig.androidClientId);
  return false;
}

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { profile, isAuthenticated, user } = useAuth();
  const authActions = useAuthActions();

  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const authMessage = authActions.error || (!isFirebaseConfigured() ? "Firebase config missing" : "");
  const googleConfigured = hasGoogleClientForPlatform();

  const handleEmailAuth = () => {
    if (authMode === "register") {
      authActions.registerEmail(email, password, name);
      return;
    }
    authActions.signInEmail(email, password);
  };

  const handleEditProfile = () => {
    setEditName(profile?.name || "");
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setIsSavingProfile(true);
    try {
      await updateUserProfile(user.uid, { name: editName });
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to update profile", e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>
              {profile?.name?.[0]?.toUpperCase() ?? "M"}
            </Text>
          </View>
          <Text style={styles.titleName}>{profile?.name ?? "Momentum"}</Text>
          <Text style={styles.subtitleEmail}>
            {isAuthenticated ? profile?.email : "Sign in to sync your data"}
          </Text>
        </View>

        {!isAuthenticated ? (
          <View style={styles.authForm}>
            <View style={styles.authModeRow}>
              {(["signin", "register"] as const).map((item) => {
                const active = authMode === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.authModeButton, active && styles.authModeButtonActive]}
                    onPress={() => {
                      setAuthMode(item);
                      authActions.clearError();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.authModeText, active && styles.authModeTextActive]}>
                      {item === "signin" ? "Sign In" : "Register"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.authFields}>
              {authMode === "register" ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor={colors.textTertiary}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  style={[
                    styles.authInput,
                    focusedField === "name" && styles.authInputFocused
                  ]}
                />
              ) : null}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.authInput,
                  focusedField === "email" && styles.authInputFocused
                ]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.authInput,
                  focusedField === "password" && styles.authInputFocused
                ]}
              />
            </View>
            {authMessage ? <Text style={styles.authMessage}>{authMessage}</Text> : null}
            <View style={styles.authActions}>
              <TouchableOpacity
                style={styles.primaryAuthButton}
                onPress={handleEmailAuth}
                activeOpacity={0.8}
                disabled={authActions.isLoading}
              >
                <Text style={styles.primaryAuthButtonText}>
                  {authActions.isLoading ? "Working..." : authMode === "register" ? "Create Account" : "Sign In"}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.secondaryAuthButton, !googleConfigured && styles.googleButtonDisabled]}
                onPress={authActions.signInGoogle}
                activeOpacity={0.8}
                disabled={authActions.isLoading || !googleConfigured || !authActions.googleReady}
              >
                <Text style={styles.secondaryAuthButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileSection}>
            <View style={styles.card}>
              {isEditing ? (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Display Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    onFocus={() => setFocusedField("editName")}
                    onBlur={() => setFocusedField(null)}
                    style={[
                      styles.editInput,
                      focusedField === "editName" && styles.editInputFocused
                    ]}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveProfile} disabled={isSavingProfile}>
                    <Text style={styles.actionText}>{isSavingProfile ? "Saving" : "Save"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Display Name</Text>
                  <Text style={styles.rowValue}>{profile?.name}</Text>
                  <TouchableOpacity onPress={handleEditProfile}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.cardDivider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Email</Text>
                <Text style={styles.rowValue}>{profile?.email}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => {
                authActions.signOut();
                onBack();
              }}
              activeOpacity={0.8}
              disabled={authActions.isLoading}
            >
              <Text style={styles.signOutButtonText}>
                {authActions.isLoading ? "Working..." : "Sign Out"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "transparent" },
    header: { paddingHorizontal: spacingValue.xl, paddingTop: spacingValue.sm, paddingBottom: spacingValue.md, zIndex: 10 },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
    backIcon: { fontSize: 24, color: colors.textPrimary, fontWeight: "600" },
    scroll: { flex: 1, zIndex: 5 },
    container: { paddingHorizontal: spacingValue.xl, paddingBottom: spacingValue.xxxl },
    
    avatarSection: { alignItems: "center", marginBottom: spacingValue.xxxl },
    largeAvatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.accentSubtle,
      alignItems: "center", justifyContent: "center",
      marginBottom: spacingValue.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    largeAvatarText: { fontSize: 32, fontWeight: "800", color: colors.accent },
    titleName: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginBottom: 4 },
    subtitleEmail: { fontSize: 14, color: colors.textSecondary },

    authForm: { gap: spacingValue.xl },
    authModeRow: {
      flexDirection: "row", gap: 4, padding: 4, borderRadius: radiusValue.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated,
    },
    authModeButton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 40, borderRadius: 9 },
    authModeButtonActive: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    authModeText: { color: colors.textTertiary, fontSize: 13, fontWeight: "800" },
    authModeTextActive: { color: colors.textPrimary },
    
    authFields: { gap: spacingValue.md },
    authInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      paddingHorizontal: spacingValue.lg,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    authInputFocused: {
      borderColor: colors.accent,
    },
    authMessage: { color: colors.warning, fontSize: 13, fontWeight: "600", textAlign: "center" },
    
    authActions: { gap: spacingValue.lg },
    primaryAuthButton: {
      minHeight: 52, alignItems: "center", justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.accent,
    },
    primaryAuthButtonText: { color: colors.bg, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
    
    dividerRow: { flexDirection: "row", alignItems: "center", gap: spacingValue.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
    dividerText: { color: colors.textTertiary, fontSize: 13, fontWeight: "600" },

    secondaryAuthButton: {
      minHeight: 52, alignItems: "center", justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryAuthButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    googleButtonDisabled: { opacity: 0.48 },

    profileSection: { gap: spacingValue.xxl },
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radiusValue.lg,
      paddingHorizontal: spacingValue.lg,
    },
    row: { flexDirection: "row", alignItems: "center", minHeight: 60, gap: spacingValue.md },
    rowLabel: { width: 100, fontSize: 14, color: colors.textTertiary, fontWeight: "600" },
    rowValue: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: "600" },
    editInput: {
      flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: "600",
      borderBottomWidth: 1, borderBottomColor: colors.accent, paddingVertical: 4,
    },
    editInputFocused: {
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
    },
    actionText: { fontSize: 14, color: colors.accent, fontWeight: "800" },
    cardDivider: { height: 1, backgroundColor: colors.borderSubtle },

    signOutButton: {
      minHeight: 52, alignItems: "center", justifyContent: "center",
      borderRadius: radiusValue.md, backgroundColor: colors.dangerSubtle,
      borderWidth: 1, borderColor: colors.dangerSubtle,
    },
    signOutButtonText: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  });
}