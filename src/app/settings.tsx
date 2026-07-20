import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { demoProfileStore } from '../utils/tempOnboardingStore';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../constants/colors';
import { spacing, layout, shadows } from '../constants/spacing';
import { typography } from '../constants/typography';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { elevenLabsService } from '../services/elevenLabs';
import {
  DEFAULT_PLAYBACK_SPEED,
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  getGlobalPlaybackSpeed,
  normalizePlaybackSpeed,
  setGlobalPlaybackSpeed,
} from '../lib/playbackSpeed';

const WEB_SPEED_RANGE_INPUT_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  appearance: 'none',
  background: 'transparent',
  margin: 0,
  padding: 0,
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [playbackSpeed, setPlaybackSpeed] = useState(() => getGlobalPlaybackSpeed());
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
  const latestPlaybackSpeedRef = useRef(playbackSpeed);

  useEffect(() => {
    latestPlaybackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Fetch Daily Nutrition Goals
  const { data: dailyGoals } = useQuery({
    queryKey: ['dailyNutritionGoals', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('daily_nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) {
        const defaultGoal = {
          user_id: user.id,
          recommended_calories: 2000,
          recommended_protein: 130.0,
          recommended_carbs: 250.0,
          recommended_fat: 70.0,
        };
        const { data: inserted } = await supabase
          .from('daily_nutrition_goals')
          .insert(defaultGoal)
          .select()
          .single();
        return inserted;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutate Daily Goals
  const updateDailyGoalsMutation = useMutation({
    mutationFn: async (updatedFields: any) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('daily_nutrition_goals')
        .update(updatedFields)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyNutritionGoals', user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    }
  });

  // Fetch User Preferences
  const { data: preferences, isLoading } = useQuery<any>({
    queryKey: ['preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        const newPref = {
          user_id: user.id,
          auto_playback: true,
          playback_speed: 1.0,
          translation_tone: 'neutral',
          transliteration_enabled: true,
          selected_voice_id: '21m00Tcm4TlvDq8ikWAM',
          history_enabled: true,
          audio_retention_enabled: true,
          image_retention_enabled: false,
          experimental_realtime: false,
          theme: 'light',
        };
        const { data: insertedData } = await supabase
          .from('user_preferences')
          .insert(newPref as any)
          .select()
          .single();
        return insertedData;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutate Preference
  const updatePreferenceMutation = useMutation<any, any, any>({
    mutationFn: async (updatedFields: any) => {
      if (!user?.id) return;
      const { error } = await (supabase as any)
        .from('user_preferences')
        .update(updatedFields)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('Save Error', err.message);
    }
  });

  const handleToggle = (key: string, currentValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePreferenceMutation.mutate({ [key]: !currentValue });
  };

  useEffect(() => {
    if (preferences?.playback_speed == null) {
      setPlaybackSpeed(getGlobalPlaybackSpeed());
      return;
    }

    const syncedSpeed = setGlobalPlaybackSpeed(Number(preferences.playback_speed));
    setPlaybackSpeed(syncedSpeed);
  }, [preferences?.playback_speed]);

  const handleSetSpeed = (speed: number, saveRemote = true) => {
    const nextSpeed = setGlobalPlaybackSpeed(speed);
    latestPlaybackSpeedRef.current = nextSpeed;
    setPlaybackSpeed(nextSpeed);
    if (saveRemote) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updatePreferenceMutation.mutate({ playback_speed: nextSpeed });
    }
  };

  const speedTicks = useMemo(() => {
    const count = Math.round((PLAYBACK_SPEED_MAX - PLAYBACK_SPEED_MIN) / PLAYBACK_SPEED_STEP) + 1;
    return Array.from({ length: count }, (_, index) => normalizePlaybackSpeed(PLAYBACK_SPEED_MIN + index * PLAYBACK_SPEED_STEP));
  }, []);

  const playbackSpeedPercent = ((playbackSpeed - PLAYBACK_SPEED_MIN) / (PLAYBACK_SPEED_MAX - PLAYBACK_SPEED_MIN)) * 100;

  const updateSpeedFromLocation = (locationX: number, saveRemote = false) => {
    if (!sliderTrackWidth) return;
    const ratio = Math.min(1, Math.max(0, locationX / sliderTrackWidth));
    const nextSpeed = PLAYBACK_SPEED_MIN + ratio * (PLAYBACK_SPEED_MAX - PLAYBACK_SPEED_MIN);
    handleSetSpeed(nextSpeed, saveRemote);
  };

  const handleWebSpeedChange = (event: any) => {
    handleSetSpeed(Number(event.currentTarget.value), false);
  };

  const handleWebSpeedCommit = () => {
    handleSetSpeed(latestPlaybackSpeedRef.current, true);
  };

  const speedSliderResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        updateSpeedFromLocation(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => {
        updateSpeedFromLocation(event.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        handleSetSpeed(latestPlaybackSpeedRef.current, true);
      },
    }),
    [sliderTrackWidth]
  );

  const handleSetTheme = (theme: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updatePreferenceMutation.mutate({ theme });
  };

  const { data: availableVoices = [] } = useQuery({
    queryKey: ['elevenLabsVoices'],
    queryFn: () => elevenLabsService.fetchVoices(),
    enabled: !!user?.id,
  });

  const { data: clonedVoices = [] } = useQuery<any[]>({
    queryKey: ['clonedVoices', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('voice_profiles')
        .select('provider_voice_id,display_name')
        .eq('user_id', user.id)
        .eq('status', 'ready');
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const voiceProfiles = [
    ...availableVoices.slice(0, 12).map(voice => ({ id: voice.voice_id, name: voice.name })),
    ...clonedVoices
      .filter(voice => !!voice.provider_voice_id)
      .map(voice => ({ id: voice.provider_voice_id, name: `${voice.display_name} (My Clone)` })),
  ];

  const handleSelectVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Select Voice Voice',
      'Choose primary TTS narration voice or clone your voice.',
      [
        ...voiceProfiles.map(v => ({
          text: v.name,
          onPress: () => updatePreferenceMutation.mutate({ selected_voice_id: v.id })
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Simulated retention options
  const retentionOptions = [
    { value: '7_days', label: '7 Days' },
    { value: '30_days', label: '30 Days' },
    { value: '90_days', label: '90 Days' },
    { value: 'forever', label: 'Keep Forever' },
  ];

  const handleSelectRetention = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Data Retention Policy',
      'Select retention timeline for audio recordings and transcript history.',
      [
        ...retentionOptions.map(o => ({
          text: o.label,
          onPress: () => Alert.alert('Policy Changed', `Local database items will delete after ${o.label}.`)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={styles.spacerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Playback Speeds Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speech Rate & Playback</Text>
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Playback Speed multiplier</Text>
            <Text style={styles.settingDesc}>Controls speed of TTS voices.</Text>
            <View style={styles.speedSliderValueWrap}>
              <Text style={styles.speedSliderValue}>{playbackSpeed.toFixed(1)}x</Text>
            </View>
            <View style={styles.speedSliderOuter}>
              <View
                style={styles.speedSliderTrackWrap}
                onLayout={(event) => setSliderTrackWidth(event.nativeEvent.layout.width)}
                {...(Platform.OS === 'web' ? {} : speedSliderResponder.panHandlers)}
              >
                <View style={styles.speedSliderTrack}>
                  <View style={[styles.speedSliderFill, { width: `${playbackSpeedPercent}%` }]} />
                  <View style={styles.speedTickRow} pointerEvents="none">
                    {speedTicks.map((tick) => (
                      <View
                        key={tick}
                        style={[
                          styles.speedTick,
                          tick <= playbackSpeed && styles.speedTickActive,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={[styles.speedSliderThumb, { left: `${playbackSpeedPercent}%` }]} />
                </View>
                {Platform.OS === 'web' ? React.createElement('input' as any, {
                  type: 'range',
                  min: PLAYBACK_SPEED_MIN,
                  max: PLAYBACK_SPEED_MAX,
                  step: PLAYBACK_SPEED_STEP,
                  value: playbackSpeed,
                  'aria-label': 'Playback speed',
                  onChange: handleWebSpeedChange,
                  onMouseUp: handleWebSpeedCommit,
                  onTouchEnd: handleWebSpeedCommit,
                  onKeyUp: handleWebSpeedCommit,
                  onBlur: handleWebSpeedCommit,
                  style: WEB_SPEED_RANGE_INPUT_STYLE as any,
                }) : null}
              </View>
              <View style={styles.speedRangeLabels}>
                <Text style={styles.speedRangeLabel}>{PLAYBACK_SPEED_MIN.toFixed(1)}x</Text>
                <Text style={styles.speedRangeLabel}>{DEFAULT_PLAYBACK_SPEED.toFixed(1)}x</Text>
                <Text style={styles.speedRangeLabel}>{PLAYBACK_SPEED_MAX.toFixed(1)}x</Text>
              </View>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Auto-play voice outputs</Text>
              <Text style={styles.settingDesc}>Play speech automatically after translating.</Text>
            </View>
            <Switch
              value={preferences?.auto_playback ?? true}
              onValueChange={() => handleToggle('auto_playback', preferences?.auto_playback ?? true)}
              thumbColor={colors.primary}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
            />
          </View>
        </View>

        {/* Calorie Tracker Entry */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calorie Tracker</Text>
          <Pressable
            style={styles.calorieTrackerCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/calorie-tracker');
            }}
          >
            <View style={styles.calorieTrackerIcon}>
              <Ionicons name="analytics-outline" size={22} color={colors.accentPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.calorieTrackerTitle}>Calorie Tracker</Text>
              <Text style={styles.calorieTrackerDesc}>Scan food, edit portions, and track daily nutrition totals.</Text>
            </View>
            <View style={styles.calorieTrackerCTA}>
              <Text style={styles.calorieTrackerCTAText}>Open</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* Voice profiles selections */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Narration & Voice Profiles</Text>
            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/voice-clone');
              }}
              style={styles.addCloneTextLink}
            >
              <Text style={styles.addCloneText}>+ Add Clone</Text>
            </Pressable>
          </View>

          <Pressable style={styles.menuRow} onPress={handleSelectVoice}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="volume-medium-outline" size={20} color={colors.accentPurple} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.menuRowTitle}>Selected Voice Profile</Text>
                <Text style={styles.menuRowValue}>
                  {voiceProfiles.find(v => v.id === preferences?.selected_voice_id)?.name ?? 'Choose a voice'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          {/* Custom Cloned Voices Management List */}
          {clonedVoices.length > 0 && (
            <View style={styles.customClonesList}>
              <Text style={styles.subTitleLabel}>Active Voice Clones</Text>
              {clonedVoices.map((cv) => {
                const isActive = preferences?.selected_voice_id === cv.provider_voice_id;
                return (
                  <Pressable
                    key={cv.provider_voice_id}
                    style={[styles.cloneRow, isActive && styles.cloneRowActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updatePreferenceMutation.mutate({ selected_voice_id: cv.provider_voice_id });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons 
                        name={isActive ? "radio-button-on" : "radio-button-off"} 
                        size={18} 
                        color={isActive ? colors.accentPurple : colors.textMuted} 
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.cloneRowName, isActive && styles.cloneRowNameActive]}>
                        {cv.display_name}
                      </Text>
                    </View>
                    <View style={styles.cloneBadge}>
                      <Text style={styles.cloneBadgeText}>Custom Clone</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Data retention policies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention & Sync</Text>
          <Pressable style={styles.menuRow} onPress={handleSelectRetention}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="time-outline" size={20} color={colors.accentBlue} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.menuRowTitle}>Retention Window</Text>
                <Text style={styles.menuRowValue}>Keep Forever (Default)</Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>History local persistence</Text>
              <Text style={styles.settingDesc}>Retain all text transcripts logs on this device.</Text>
            </View>
            <Switch
              value={preferences?.history_enabled ?? true}
              onValueChange={() => handleToggle('history_enabled', preferences?.history_enabled ?? true)}
              thumbColor={colors.primary}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
            />
          </View>
        </View>

        {/* Daily Goal Impact (Nutritional Targets) Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goal Impact Settings</Text>
          <Text style={styles.sectionSubtitle}>Set your daily recommended nutrition limits for camera food analysis scans.</Text>
          
          <View style={styles.nutrientCard}>
            <View style={styles.nutrientAdjustRow}>
              <View style={styles.nutrientTextCol}>
                <Text style={styles.nutrientLabel}>Calories Goal</Text>
                <Text style={styles.nutrientValue}>{dailyGoals?.recommended_calories ?? 2000} kcal</Text>
              </View>
              <View style={styles.adjustBtns}>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_calories ?? 2000;
                    updateDailyGoalsMutation.mutate({ recommended_calories: Math.max(500, current - 100) });
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_calories ?? 2000;
                    updateDailyGoalsMutation.mutate({ recommended_calories: Math.min(10000, current + 100) });
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.nutrientAdjustRow}>
              <View style={styles.nutrientTextCol}>
                <Text style={styles.nutrientLabel}>Protein Goal</Text>
                <Text style={styles.nutrientValue}>{dailyGoals?.recommended_protein ?? 130}g</Text>
              </View>
              <View style={styles.adjustBtns}>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_protein ?? 130;
                    updateDailyGoalsMutation.mutate({ recommended_protein: Math.max(10, current - 5) });
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_protein ?? 130;
                    updateDailyGoalsMutation.mutate({ recommended_protein: Math.min(500, current + 5) });
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.nutrientAdjustRow}>
              <View style={styles.nutrientTextCol}>
                <Text style={styles.nutrientLabel}>Carbohydrates Goal</Text>
                <Text style={styles.nutrientValue}>{dailyGoals?.recommended_carbs ?? 250}g</Text>
              </View>
              <View style={styles.adjustBtns}>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_carbs ?? 250;
                    updateDailyGoalsMutation.mutate({ recommended_carbs: Math.max(10, current - 10) });
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_carbs ?? 250;
                    updateDailyGoalsMutation.mutate({ recommended_carbs: Math.min(1000, current + 10) });
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.nutrientAdjustRow}>
              <View style={styles.nutrientTextCol}>
                <Text style={styles.nutrientLabel}>Fats Goal</Text>
                <Text style={styles.nutrientValue}>{dailyGoals?.recommended_fat ?? 70}g</Text>
              </View>
              <View style={styles.adjustBtns}>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_fat ?? 70;
                    updateDailyGoalsMutation.mutate({ recommended_fat: Math.max(5, current - 5) });
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable 
                  style={styles.adjustBtn} 
                  onPress={() => {
                    const current = dailyGoals?.recommended_fat ?? 70;
                    updateDailyGoalsMutation.mutate({ recommended_fat: Math.min(300, current + 5) });
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Account / Demo Actions */}
        <View style={styles.section}>
          <Pressable 
            style={styles.signOutBtn}
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const isDemo = !user || (Platform.OS === 'web' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ysnap-demo') === '1');
              if (isDemo) {
                demoProfileStore.reset();
                if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
                  sessionStorage.removeItem('ysnap-demo');
                }
                router.replace('/(auth)/onboarding');
              } else {
                await supabase.auth.signOut();
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                router.replace('/(auth)/onboarding');
              }
            }}
          >
            <Text style={styles.signOutText}>
              {!user || (Platform.OS === 'web' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ysnap-demo') === '1') 
                ? 'Exit Demo Mode' 
                : 'Sign Out'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  spacerBtn: {
    width: layout.touchTarget,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: typography.captionMedium.fontFamily,
    fontWeight: typography.captionMedium.fontWeight,
    color: colors.accentPurple,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: typography.bodyMedium.fontFamily,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: typography.caption.fontFamily,
    color: colors.textMuted,
    lineHeight: 16,
  },
  speedSliderValueWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  speedSliderValue: {
    color: colors.accentPurple,
    backgroundColor: 'rgba(124, 108, 208, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.heading3.fontFamily,
  },
  speedSliderOuter: {
    paddingHorizontal: 6,
  },
  speedSliderTrackWrap: {
    minHeight: 48,
    justifyContent: 'center',
    position: 'relative',
  },
  speedSliderTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.border,
    position: 'relative',
    justifyContent: 'center',
  },
  speedSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.accentPurple,
  },
  speedTickRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedTick: {
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  speedTickActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  speedSliderThumb: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 32,
    marginLeft: -16,
    borderRadius: 16,
    backgroundColor: colors.accentPurple,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  speedRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  speedRangeLabel: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRowTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  menuRowValue: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  themeGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    ...shadows.sm,
  },
  themeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  themeBtnText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  themeBtnTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  signOutBtn: {
    backgroundColor: '#FFF0F1',
    borderColor: '#FFF0F1',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: typography.button.fontFamily,
    fontWeight: '600',
    color: colors.error,
  },
  addCloneTextLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addCloneText: {
    ...typography.label,
    color: colors.accentPurple,
    fontWeight: '700',
  },
  customClonesList: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subTitleLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cloneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cloneRowActive: {
    borderColor: colors.accentPurple,
    backgroundColor: 'rgba(124, 108, 208, 0.04)',
  },
  cloneRowName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  cloneRowNameActive: {
    fontWeight: '600',
    color: colors.accentPurple,
  },
  cloneBadge: {
    backgroundColor: colors.accentPurple,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cloneBadgeText: {
    ...typography.micro,
    color: colors.textInverse,
    fontWeight: '600',
  },
  calorieTrackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  calorieTrackerIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 108, 208, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieTrackerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  calorieTrackerDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 3,
  },
  calorieTrackerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentPurple,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calorieTrackerCTAText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 16,
  },
  nutrientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutrientAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  nutrientTextCol: {
    flex: 1,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  nutrientValue: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  adjustBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
