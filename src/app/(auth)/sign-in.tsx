import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { BrandMark } from '../../components';
import { PremiumCTAButton, PremiumSecondaryButton } from '../../components/auth/PremiumCTAButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, layout, shadows, spacing, typography } from '../../constants';
import { supabase } from '../../lib/supabase';
import { demoProfileStore, tempOnboardingStore } from '../../utils/tempOnboardingStore';

export default function SignInScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { signIn, resetPassword, signInAnonymously } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDemoMode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { error } = await signInAnonymously();
      if (error) throw error;
      const tempChoices = tempOnboardingStore.get();
      demoProfileStore.set({
        onboarding_completed: false,
        native_language: tempChoices?.native ?? 'en',
        primary_target_language: tempChoices?.target ?? 'es',
        translation_purpose: tempChoices?.purpose ?? 'travel',
      });
      router.replace({ pathname: '/(auth)/onboarding-languages', params: { demo: '1' } });
    } catch (error: any) {
      Alert.alert(
        'Guest Access Unavailable',
        error?.message === 'Anonymous sign-ins are disabled'
          ? 'Guest access is not enabled for this project yet. Please sign in with an account.'
          : error?.message || 'Could not start a guest session.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error } = await signIn(email.trim(), password);

      if (error) {
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        let errorMsg = error.message;
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          errorMsg = 'Incorrect email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          errorMsg = 'Please verify your email address before signing in.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        }

        Alert.alert('Sign In Failed', errorMsg);
        return;
      }

      const session = data?.session;
      const user = data?.user;

      if (!session || !user) {
        setLoading(false);
        Alert.alert('Sign In Failed', 'Could not establish session. Please verify your credentials or email status.');
        return;
      }

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError || !profile) {
        const defaultProfile = {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || email.split('@')[0],
          native_language: user.user_metadata?.native_language || 'en',
          primary_target_language: user.user_metadata?.target_language || 'es',
          onboarding_completed: true,
        };
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(defaultProfile as any);

        if (insertError) {
          setLoading(false);
          Alert.alert('Profile Error', 'Your profile is missing and could not be initialized automatically. Please contact support.');
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Sign In Error', e.message || 'An unexpected error occurred.');
    }
  };

  const handleForgotPassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email) {
      setErrors({ email: 'Please enter your email address to reset your password' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Email address is invalid' });
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Reset Failed', error.message);
    } else {
      Alert.alert('Reset Link Sent', 'Check your email for password reset instructions.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { maxWidth: Math.min(width, layout.maxContentWidth) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.replace('/(auth)/onboarding')}
            style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to onboarding"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(auth)/sign-up')}
            style={({ pressed }) => [styles.smallPill, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text style={styles.smallPillText}>Sign up</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.brandLockup}>
            <LinearGradient colors={['#242329', '#111114', '#070708']} style={styles.brandBadge}>
              <View style={styles.brandHighlight} />
              <BrandMark size={46} variant="light" />
            </LinearGradient>
            <Text style={styles.brandText}>YSnap</Text>
          </View>
          <View pointerEvents="none" style={styles.loginDecor}>
            <View style={styles.loginGlow} />
            <View style={styles.loginSoftRing} />
            <View style={[styles.loginDiamond, styles.loginDiamondOne]} />
            <View style={[styles.loginDiamond, styles.loginDiamondTwo]} />
            <Ionicons name="sparkles" size={17} color="#82AFFF" style={styles.loginSparkle} />
          </View>
          <Text style={styles.title}>Welcome to YSnap</Text>
          <Text style={styles.subtitle}>Sign in to translate, scan and keep your voice history synced safely.</Text>
        </View>

        <View style={styles.previewCard}>
          <LinearGradient colors={['#F7FAFF', '#FFFFFF']} style={styles.previewGradient}>
            <View style={styles.previewIcon}>
              <Ionicons name="camera" size={28} color={colors.textInverse} />
            </View>
            <View style={styles.previewTextBlock}>
              <Text style={styles.previewTitle}>Your AI vision assistant</Text>
              <Text style={styles.previewText}>Camera, voice and translation tools ready after login.</Text>
            </View>
            <Ionicons name="sparkles" size={24} color="#8DAFFF" />
          </LinearGradient>
        </View>

        <View style={styles.formCard}>
          {reason === 'guest-access-unavailable' && (
            <View style={styles.authNotice}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.authNoticeText}>
                Sign in to translate and securely save your history. Guest access is not enabled for this project.
              </Text>
            </View>
          )}

          <InputField
            label="Email"
            value={email}
            error={errors.email}
            icon="mail-outline"
            placeholder="name@domain.com"
            keyboardType="email-address"
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
          />

          <InputField
            label="Password"
            value={password}
            error={errors.password}
            icon="lock-closed-outline"
            placeholder="••••••••"
            secureTextEntry
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            rightAction={
              <Pressable onPress={handleForgotPassword} accessibilityRole="button">
                <Text style={styles.forgotText}>Forgot?</Text>
              </Pressable>
            }
          />

          <PremiumCTAButton title="Sign In" onPress={handleSignIn} loading={loading} style={styles.signInButton} />

          {reason !== 'guest-access-unavailable' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              <PremiumSecondaryButton title="Continue as guest" onPress={handleDemoMode} />
            </>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don’t have an account? </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace({
                pathname: '/(auth)/sign-up',
                params: reason ? { reason } : {},
              });
            }}
          >
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  label,
  value,
  error,
  icon,
  placeholder,
  rightAction,
  onChangeText,
  ...props
}: {
  label: string;
  value: string;
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  rightAction?: React.ReactNode;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address';
}) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputHeader}>
        <Text style={styles.label}>{label}</Text>
        {rightAction}
      </View>
      <View style={[styles.inputShell, error && styles.inputShellError]}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  scrollContainer: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: layout.pageMargin,
    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.md,
    paddingBottom: spacing['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  smallPill: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  smallPillText: { ...typography.label, fontSize: 16, color: colors.textPrimary },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    position: 'relative',
  },
  brandLockup: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    zIndex: 2,
  },
  brandBadge: {
    width: 78,
    height: 78,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#34343A',
    shadowColor: '#050506',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
  brandHighlight: {
    position: 'absolute',
    top: 1,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  brandText: {
    fontFamily: typography.heading2.fontFamily,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '760' as any,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  loginDecor: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 150,
  },
  loginGlow: {
    position: 'absolute',
    alignSelf: 'center',
    top: 8,
    width: 180,
    height: 112,
    borderRadius: 90,
    backgroundColor: 'rgba(24,119,242,0.07)',
  },
  loginSoftRing: {
    position: 'absolute',
    left: 86,
    top: 28,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(130,175,255,0.15)',
  },
  loginDiamond: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#82AFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  loginDiamondOne: { right: 78, top: 20, backgroundColor: '#DCE9FF' },
  loginDiamondTwo: { left: 74, top: 92, width: 7, height: 7, backgroundColor: '#EFEAFF' },
  loginSparkle: { position: 'absolute', right: 110, top: 88 },
  title: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.9,
    fontWeight: '760' as any,
    fontFamily: typography.display.fontFamily,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
    marginTop: spacing.sm,
  },
  previewCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.075,
    shadowRadius: 26,
    elevation: 5,
  },
  previewGradient: {
    minHeight: 96,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#111114',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  previewTextBlock: { flex: 1 },
  previewTitle: { ...typography.heading3, color: colors.textPrimary },
  previewText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ECECF1',
    padding: spacing.lg,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  authNotice: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  authNoticeText: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },
  inputGroup: { marginBottom: spacing.lg },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: { ...typography.label, color: colors.textPrimary },
  forgotText: { ...typography.label, color: '#1877F2' },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FBFBFD',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.025,
    shadowRadius: 10,
  },
  inputShellError: { borderColor: colors.error, backgroundColor: colors.errorLight },
  input: {
    flex: 1,
    minHeight: 54,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  signInButton: { marginTop: spacing.xs },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.captionMedium, color: colors.textMuted },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodySemibold, color: '#1877F2' },
  pressed: { opacity: 0.62, transform: [{ scale: 0.98 }] },
});
