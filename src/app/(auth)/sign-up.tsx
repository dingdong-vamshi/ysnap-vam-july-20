import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { tempOnboardingStore, demoProfileStore } from '../../utils/tempOnboardingStore';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { BrandMark, SuccessFeedback, TactileButton } from '../../components';
import { PremiumCTAButton, PremiumSecondaryButton } from '../../components/auth/PremiumCTAButton';
import * as Linking from 'expo-linking';

const AUTH_CALLBACK_URL = Linking.createURL('auth/callback');
const SIGNUP_RETRY_COOLDOWN_SECONDS = 60;

function formatRetryTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function SignUpScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { signUp, signInAnonymously } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [signupRetrySeconds, setSignupRetrySeconds] = useState(0);

  useEffect(() => {
    if (signupRetrySeconds <= 0) return;

    const timer = setTimeout(() => {
      setSignupRetrySeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [signupRetrySeconds]);

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
          ? 'Guest access is not enabled for this project yet. Please create an account or sign in.'
          : error?.message || 'Could not start a guest session.',
      );
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: { displayName?: string; email?: string; password?: string; confirmPassword?: string } = {};
    setFormError(null);

    if (!displayName.trim()) {
      newErrors.displayName = 'Name is required';
    }
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      setFormError('Passwords do not match.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const queryClient = useQueryClient();

  const handleSignUp = async () => {
    if (loading || signupRetrySeconds > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;

    setLoading(true);
    setFormError(null);
    try {
      const tempChoices = (tempOnboardingStore.get() || {}) as any;
      const metadata = {
        display_name: displayName.trim(),
        native_language: tempChoices.native || 'en',
        target_language: tempChoices.target || 'es',
        preferred_mode: tempChoices.preferred_mode || 'text',
        selected_goals: tempChoices.selected_goals || [],
        experience_level: tempChoices.experience_level || 'beginner',
        reminder_enabled: tempChoices.reminder_enabled || false,
        onboarding_completed: true,
      };

      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await signUp(normalizedEmail, password, {
        data: metadata,
        emailRedirectTo: AUTH_CALLBACK_URL,
      });
      
      if (error) {
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        let errorMsg = 'Account creation failed. Please try again.';
        if (
          error.message.includes('already registered') ||
          error.message.includes('User already exists')
        ) {
          errorMsg = 'This email is already registered. Sign in instead.';
          Alert.alert(
            'Duplicate Email',
            errorMsg,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Sign In', onPress: () => router.replace('/(auth)/sign-in') }
            ]
          );
        } else if (error.message.includes('valid email') || error.message.includes('email format')) {
          errorMsg = 'Enter a valid email address.';
        } else if (error.message.includes('Weak password') || error.message.includes('at least 6 characters')) {
          errorMsg = 'Use a stronger password.';
        } else if (
          error.status === 429 ||
          (error as any).code === 'over_email_send_rate_limit' ||
          error.message.toLowerCase().includes('email rate limit')
        ) {
          // Supabase's built-in SMTP quota is project-wide. A short client
          // cooldown prevents repeated clicks from consuming more requests,
          // while the notice explains that no account was created.
          setSignupRetrySeconds(SIGNUP_RETRY_COOLDOWN_SECONDS);
          setFormError(null);
          return;
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connection')) {
          errorMsg = 'Could not connect. Check your connection and try again.';
        }
        
        setFormError(errorMsg);
        return;
      }

      const sessionUser = data?.user;
      const session = data?.session;
      
      if (sessionUser && session) {
        // Authenticated user session exists immediately
        // Create profile row manually to guarantee immediate sync
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: sessionUser.id,
            email: sessionUser.email,
            display_name: displayName.trim(),
            native_language: metadata.native_language,
            primary_target_language: metadata.target_language,
            target_language: metadata.target_language,
            translation_purpose: tempChoices.purpose || 'travel',
            preferred_mode: metadata.preferred_mode,
            reminder_enabled: metadata.reminder_enabled,
            selected_goals: metadata.selected_goals,
            experience_level: metadata.experience_level,
            onboarding_completed: true,
          } as any);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
        
        tempOnboardingStore.clear();

        // Refetch profile data caches
        await queryClient.invalidateQueries({ queryKey: ['profile', sessionUser.id] });
        
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);

        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);
      } else {
        setLoading(false);
        // Hosted Supabase projects enable email confirmation by default. This
        // is a valid signup outcome: the PKCE callback will establish and keep
        // the session after the user clicks the confirmation link.
        setFormError(null);
        setPendingConfirmationEmail(normalizedEmail);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setLoading(false);
      setFormError(e.message || 'Account creation failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View style={styles.header}>
          <View pointerEvents="none" style={styles.decorLayer}>
            <View style={styles.loginGlow} />
            <View style={styles.softRing} />
            <View style={[styles.diamond, styles.diamondOne]} />
            <View style={[styles.diamond, styles.diamondTwo]} />
            <Ionicons name="sparkles" size={17} color="#82AFFF" style={styles.sparkleDecor} />
          </View>
          <View style={styles.topRow}>
            <Pressable
              style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(auth)/sign-in');
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(auth)/sign-in')}
              style={({ pressed }) => [styles.signInPill, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.signInPillText}>Sign in</Text>
            </Pressable>
          </View>
          <View style={styles.brandLockup}>
            <LinearGradient colors={['#242329', '#111114', '#070708']} style={styles.brandBadge}>
              <View style={styles.brandHighlight} />
              <BrandMark size={42} variant="light" />
            </LinearGradient>
            <Text style={styles.brandText}>YSnap</Text>
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join YSnap to translate, scan, and save your voice history with smart context.</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {pendingConfirmationEmail ? (
            <View style={styles.confirmationCard}>
              <Ionicons name="mail-unread-outline" size={28} color={colors.accentPurple} />
              <Text style={styles.confirmationTitle}>Check your email</Text>
              <Text style={styles.confirmationText}>
                We sent a confirmation link to {pendingConfirmationEmail}. Open it to verify your account and continue directly into YSnap.
              </Text>
              <TactileButton
                title="Go to Sign In"
                onPress={() => router.replace('/(auth)/sign-in')}
              />
              <Pressable
                style={styles.useDifferentEmail}
                onPress={() => {
                  setPendingConfirmationEmail(null);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.useDifferentEmailText}>Use a different email</Text>
              </Pressable>
            </View>
          ) : (
            <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.displayName ? styles.inputError : null]}
              placeholder="Alex Morgan"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="words"
              autoCorrect={false}
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (errors.displayName) setErrors({ ...errors, displayName: undefined });
              }}
            />
            {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="name@domain.com"
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          )}

          {signupRetrySeconds > 0 && (
            <View style={styles.rateLimitBanner}>
              <Ionicons name="time-outline" size={22} color={colors.warning} />
              <View style={styles.rateLimitContent}>
                <Text style={styles.rateLimitTitle}>Confirmation emails are temporarily paused</Text>
                <Text style={styles.rateLimitText}>
                  The shared email quota is full, so no account was created. Please wait for the email service to reset. You can retry in {formatRetryTime(signupRetrySeconds)}.
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: 8, gap: 12 }}>
            <PremiumCTAButton
              title={signupRetrySeconds > 0 ? `Retry in ${formatRetryTime(signupRetrySeconds)}` : 'Create Account'}
              loading={loading}
              disabled={signupRetrySeconds > 0}
              onPress={handleSignUp}
            />

            {reason !== 'guest-access-unavailable' && (
              <PremiumSecondaryButton
                title="Continue as guest"
                onPress={handleDemoMode}
              />
            )}
          </View>

          <Text style={styles.legalText}>
            By creating an account, you agree to YSnap’s{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/terms')}>Terms of Use</Text>
            {' '}and acknowledge the{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacy-data-usage')}>Privacy Policy</Text>.
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(auth)/sign-in');
              }}
            >
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
            </>
          )}
        </View>
      </ScrollView>
      <SuccessFeedback
        visible={showSuccess}
        onDismiss={() => {
          setShowSuccess(false);
          router.replace('/(tabs)');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    position: 'relative',
  },
  decorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  loginGlow: {
    position: 'absolute',
    alignSelf: 'center',
    top: 62,
    width: 190,
    height: 118,
    borderRadius: 95,
    backgroundColor: 'rgba(24,119,242,0.07)',
  },
  softRing: {
    position: 'absolute',
    right: 54,
    top: 78,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(130,175,255,0.15)',
  },
  diamond: {
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
  diamondOne: { left: 54, top: 96, backgroundColor: '#DCE9FF' },
  diamondTwo: { right: 104, top: 22, width: 7, height: 7, backgroundColor: '#EFEAFF' },
  sparkleDecor: { position: 'absolute', left: 94, top: 148 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 2,
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
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  signInPill: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  signInPillText: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  brandLockup: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    zIndex: 2,
  },
  brandBadge: {
    width: 76,
    height: 76,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#34343A',
    shadowColor: '#050506',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
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
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: typography.heading1.fontFamily,
    fontWeight: '760' as any,
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    fontWeight: typography.body.fontWeight,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
    alignSelf: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ECECF1',
    padding: 20,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  pressed: {
    opacity: 0.62,
    transform: [{ scale: 0.98 }],
  },
  confirmationCard: {
    backgroundColor: '#FBFBFD',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
    gap: 12,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontFamily: typography.heading3.fontFamily,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  useDifferentEmail: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  useDifferentEmailText: {
    fontSize: 14,
    fontFamily: typography.bodyMedium.fontFamily,
    color: colors.accentPurple,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.captionMedium.fontFamily,
    fontWeight: typography.captionMedium.fontWeight,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FBFBFD',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: typography.body.fontFamily,
    color: colors.textPrimary,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.025,
    shadowRadius: 10,
    elevation: 1,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  errorText: {
    fontSize: 12,
    fontFamily: typography.small.fontFamily,
    color: colors.error,
    marginTop: 6,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
  },
  rateLimitBanner: {
    backgroundColor: colors.warningLight,
    borderColor: '#F0D4A8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rateLimitContent: {
    flex: 1,
    gap: 4,
  },
  rateLimitTitle: {
    fontSize: 14,
    fontFamily: typography.bodySemibold.fontFamily,
    fontWeight: typography.bodySemibold.fontWeight,
    color: colors.textPrimary,
  },
  rateLimitText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  legalText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
  legalLink: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 15,
    fontFamily: typography.bodySemibold.fontFamily,
    fontWeight: typography.bodySemibold.fontWeight,
    color: colors.primary,
  },
});
