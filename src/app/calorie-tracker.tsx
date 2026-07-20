import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { colors, spacing, typography } from '../constants';
import { callEdgeFunction, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type LoadingStep = 'Preparing image' | 'Uploading' | 'Detecting food' | 'Identifying items' | 'Estimating nutrition' | 'Preparing results';
type DetectionStatus =
  | 'FOOD_DETECTED'
  | 'DRINK_DETECTED'
  | 'FOOD_AND_DRINK_DETECTED'
  | 'NO_EDIBLE_ITEM_DETECTED'
  | 'LOW_CONFIDENCE'
  | 'FAILED';

type CalorieItem = {
  id: string;
  name: string;
  category?: 'food' | 'drink';
  portion: string;
  estimatedGrams: number;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fibreGrams: number;
  confidence: number;
  isUserEdited?: boolean;
};

type AnalysisResultState = {
  status: DetectionStatus;
  message: string;
  warnings: string[];
  needsUserReview: boolean;
  analysisModel?: string;
};

type NormalizedAnalysis = AnalysisResultState & {
  items: CalorieItem[];
};

type MealLog = {
  id: string;
  mealType: MealType;
  mealName: string;
  capturedImageUrl?: string | null;
  capturedAt: string;
  localDate: string;
  timezone: string;
  items: CalorieItem[];
  isLocalOnly?: boolean;
};

const MEAL_TYPES: Array<{ value: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { value: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { value: 'snack', label: 'Snack', icon: 'cafe-outline' },
];

const LOADING_STEPS: LoadingStep[] = [
  'Preparing image',
  'Uploading',
  'Detecting food',
  'Identifying items',
  'Estimating nutrition',
  'Preparing results',
];

const STORAGE_KEY = 'ysnap.calorieTracker.meals';
const endpointName = process.env.EXPO_PUBLIC_CALORIE_SCAN_ENDPOINT?.trim();
const allowMockResults = process.env.EXPO_PUBLIC_CALORIE_MOCK_MODE === 'true';

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  } catch {
    return 'local';
  }
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const sumItems = (items: CalorieItem[]) => items.reduce(
  (acc, item) => ({
    calories: acc.calories + Number(item.calories || 0),
    proteinGrams: acc.proteinGrams + Number(item.proteinGrams || 0),
    carbohydrateGrams: acc.carbohydrateGrams + Number(item.carbohydrateGrams || 0),
    fatGrams: acc.fatGrams + Number(item.fatGrams || 0),
    fibreGrams: acc.fibreGrams + Number(item.fibreGrams || 0),
  }),
  { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fibreGrams: 0 },
);

const readLocalMeals = (): MealLog[] => {
  if (Platform.OS !== 'web') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeLocalMeals = (meals: MealLog[]) => {
  if (Platform.OS !== 'web') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals.slice(0, 200)));
};

const VALID_DETECTION_STATUSES: DetectionStatus[] = [
  'FOOD_DETECTED',
  'DRINK_DETECTED',
  'FOOD_AND_DRINK_DETECTED',
  'NO_EDIBLE_ITEM_DETECTED',
  'LOW_CONFIDENCE',
];

const userMessageForError = (error: any) => {
  const message = String(error?.message || '');
  if (/timeout|aborted/i.test(message)) return 'The scan took too long. Please try again with a clearer photo.';
  if (/configured|GEMINI_API_KEY|endpoint/i.test(message)) return 'Food analysis is not configured yet. Please connect the secure backend first.';
  if (/analyse-food|function deployment|failed to send|network|fetch/i.test(message)) {
    return 'The food analysis backend is not reachable yet. Deploy the analyse-food Supabase Edge Function, then try again.';
  }
  if (/image|unsupported|large/i.test(message)) return message;
  return 'Could not analyse this image. Please try a clearer food or drink photo.';
};

const normalizeAnalysis = (payload: any): NormalizedAnalysis => {
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('Invalid nutrition response.');
  }
  const incomingStatus = String(payload.status || '').trim().toUpperCase() as DetectionStatus;
  const status = VALID_DETECTION_STATUSES.includes(incomingStatus) ? incomingStatus : 'LOW_CONFIDENCE';
  const items = payload.items
    .filter((item: any) => item && typeof item.name === 'string')
    .map((item: any) => ({
      id: makeId(),
      name: String(item.name),
      category: item.category === 'drink' ? 'drink' : 'food',
      portion: String(item.portion || item.servingSize || '1 serving'),
      estimatedGrams: Number(item.estimatedGrams || item.estimated_grams || 0),
      calories: Math.max(0, Number(item.calories || 0)),
      proteinGrams: Math.max(0, Number(item.proteinGrams || item.protein_grams || 0)),
      carbohydrateGrams: Math.max(0, Number(item.carbohydrateGrams || item.carbohydrate_grams || item.carbs || 0)),
      fatGrams: Math.max(0, Number(item.fatGrams || item.fat_grams || 0)),
      fibreGrams: Math.max(0, Number(item.fibreGrams || item.fiberGrams || item.fibre_grams || 0)),
      confidence: Math.min(1, Math.max(0, Number(item.confidence || 0))),
    }));

  if (status === 'NO_EDIBLE_ITEM_DETECTED' || status === 'LOW_CONFIDENCE') {
    return {
      status,
      items: [],
      message: String(
        payload.message ||
          (status === 'NO_EDIBLE_ITEM_DETECTED'
            ? 'No food or drink detected. Please capture a clearer meal image.'
            : 'We couldn’t confidently identify the food in this image. Please try a clearer photo.'),
      ),
      warnings: Array.isArray(payload.warnings) ? payload.warnings.map(String) : [],
      needsUserReview: false,
      analysisModel: payload.analysis_model,
    };
  }

  if (!items.length) {
    return {
      status: 'LOW_CONFIDENCE',
      items: [],
      message: 'We couldn’t confidently identify the food in this image. Please try a clearer photo.',
      warnings: ['No reliable food or drink items were returned by the analysis service.'],
      needsUserReview: false,
      analysisModel: payload.analysis_model,
    };
  }

  return {
    status,
    items,
    message: String(payload.message || 'Detected visible food or drink.'),
    warnings: Array.isArray(payload.warnings) ? payload.warnings.map(String) : [],
    needsUserReview: payload.needsUserReview !== false,
    analysisModel: payload.analysis_model,
  };
};

export default function CalorieTrackerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<CalorieItem[]>([]);
  const [meals, setMeals] = useState<MealLog[]>(readLocalMeals);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('Preparing image');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const { refetch: refetchRemoteMeals } = useQuery({
    queryKey: ['calorieMeals', user?.id, selectedDate],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('meal_logs')
        .select('*, meal_items(*)')
        .eq('user_id', user.id)
        .eq('local_date', selectedDate)
        .order('captured_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((meal: any): MealLog => ({
        id: meal.id,
        mealType: meal.meal_type,
        mealName: meal.meal_name,
        capturedImageUrl: meal.captured_image_url,
        capturedAt: meal.captured_at,
        localDate: meal.local_date,
        timezone: meal.timezone,
        items: (meal.meal_items || []).map((item: any) => ({
          id: item.id,
          name: item.food_name,
          portion: item.serving_unit || item.estimated_quantity || '1 serving',
          estimatedGrams: Number(item.estimated_quantity || 0),
          calories: Number(item.calories || 0),
          proteinGrams: Number(item.protein || 0),
          carbohydrateGrams: Number(item.carbohydrates || 0),
          fatGrams: Number(item.fat || 0),
          fibreGrams: Number(item.fibre || 0),
          confidence: Number(item.confidence || 0),
          isUserEdited: item.is_user_edited,
        })),
      }));
      setMeals((current) => [...mapped, ...current.filter((meal) => meal.isLocalOnly || meal.localDate !== selectedDate)]);
      return mapped;
    },
    enabled: !!user?.id,
  });

  const dayMeals = meals.filter((meal) => meal.localDate === selectedDate);
  const dayTotals = sumItems(dayMeals.flatMap((meal) => meal.items));
  const currentTotals = sumItems(detectedItems);

  const shiftDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(getLocalDate(next));
  };

  const runAnalysis = async (uri: string, mimeType = 'image/jpeg') => {
    if (isAnalysing) return;
    setCapturedImage(uri);
    setDetectedItems([]);
    setAnalysisResult(null);
    setIsAnalysing(true);
    const started = Date.now();

    const step = (next: LoadingStep) => new Promise<void>((resolve) => {
      setLoadingStep(next);
      setTimeout(resolve, 220);
    });

    try {
      for (const stage of LOADING_STEPS.slice(0, 2)) await step(stage);
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Unsupported image type.');
        if (blob.size > 10 * 1024 * 1024) throw new Error('Image is too large. Please choose an image under 10MB.');
        formData.append('file', blob, `meal.${blob.type.includes('png') ? 'png' : 'jpg'}`);
      } else {
        formData.append('file', { uri, name: 'meal.jpg', type: mimeType } as any);
      }
      formData.append('meal_type', mealType);
      formData.append('local_date', selectedDate);
      formData.append('timezone', getTimezone());

      for (const stage of LOADING_STEPS.slice(2, 5)) await step(stage);

      if (endpointName) {
        const { data, error } = await callEdgeFunction<any>(endpointName, formData);
        if (error) throw error;
        const normalized = normalizeAnalysis(data);
        await step('Preparing results');
        console.log('[Calorie Tracker] analysis completed in', Date.now() - started, 'ms', normalized.status);
        setAnalysisResult({
          status: normalized.status,
          message: normalized.message,
          warnings: normalized.warnings,
          needsUserReview: normalized.needsUserReview,
          analysisModel: normalized.analysisModel,
        });
        setDetectedItems(normalized.items);
        Haptics.notificationAsync(
          normalized.items.length
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
      } else if (allowMockResults) {
        throw new Error('Mock calorie scanning is explicitly enabled, but no mock fixture is configured for this build.');
      } else {
        throw new Error('Calorie analysis endpoint is not configured. Set EXPO_PUBLIC_CALORIE_SCAN_ENDPOINT to analyse-food.');
      }
    } catch (error: any) {
      console.warn('[Calorie Tracker] analysis failed:', error instanceof Error ? error.message : String(error));
      setAnalysisResult({
        status: 'FAILED',
        message: userMessageForError(error),
        warnings: [],
        needsUserReview: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalysing(false);
    }
  };

  const openCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera Access Needed', 'Allow camera access to scan your meal directly.');
        return;
      }
    }
    setShowCamera(true);
  };

  const captureFromCamera = async () => {
    if (!cameraRef.current || isAnalysing) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });
      setShowCamera(false);
      await runAnalysis(photo.uri, 'image/jpeg');
    } catch (error) {
      console.error('[Calorie Tracker] camera capture failed:', error);
      Alert.alert('Camera Error', 'Could not capture the meal photo. Please try again.');
    }
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]) {
      await runAnalysis(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const updateItem = (id: string, field: keyof CalorieItem, value: string) => {
    setDetectedItems((items) => items.map((item) => {
      if (item.id !== id) return item;
      const numericFields = ['estimatedGrams', 'calories', 'proteinGrams', 'carbohydrateGrams', 'fatGrams', 'fibreGrams'];
      return {
        ...item,
        [field]: numericFields.includes(field) ? Number(value || 0) : value,
        isUserEdited: true,
      };
    }));
  };

  const addManualItem = () => {
    setDetectedItems((items) => [...items, {
      id: makeId(),
      name: 'Manual food item',
      portion: '1 serving',
      estimatedGrams: 100,
      calories: 0,
      proteinGrams: 0,
      carbohydrateGrams: 0,
      fatGrams: 0,
      fibreGrams: 0,
      confidence: 1,
      isUserEdited: true,
    }]);
  };

  const removeItem = (id: string) => setDetectedItems((items) => items.filter((item) => item.id !== id));

  const saveMeal = async () => {
    if (!detectedItems.length) {
      Alert.alert('Nothing to Save', 'Add or scan at least one food item first.');
      return;
    }

    const now = new Date();
    const meal: MealLog = {
      id: makeId(),
      mealType,
      mealName: `${MEAL_TYPES.find((type) => type.value === mealType)?.label || 'Meal'} scan`,
      capturedImageUrl: capturedImage,
      capturedAt: now.toISOString(),
      localDate: selectedDate,
      timezone: getTimezone(),
      items: detectedItems,
      isLocalOnly: !user?.id,
    };

    if (user?.id) {
      try {
        const totals = sumItems(detectedItems);
        const { data, error } = await (supabase as any)
          .from('meal_logs')
          .insert({
            user_id: user.id,
            meal_type: meal.mealType,
            meal_name: meal.mealName,
            captured_image_url: null,
            captured_at: meal.capturedAt,
            local_date: meal.localDate,
            timezone: meal.timezone,
            total_calories: totals.calories,
            total_protein: totals.proteinGrams,
            total_carbohydrates: totals.carbohydrateGrams,
            total_fat: totals.fatGrams,
            total_fibre: totals.fibreGrams,
          })
          .select('id')
          .single();
        if (error || !data?.id) throw error || new Error('Meal save failed.');
        await (supabase as any).from('meal_items').insert(detectedItems.map((item) => ({
          meal_id: data.id,
          food_name: item.name,
          estimated_quantity: item.estimatedGrams,
          serving_unit: item.portion,
          calories: item.calories,
          protein: item.proteinGrams,
          carbohydrates: item.carbohydrateGrams,
          fat: item.fatGrams,
          fibre: item.fibreGrams,
          confidence: item.confidence,
          is_user_edited: !!item.isUserEdited,
        })));
        await refetchRemoteMeals();
      } catch (error) {
        console.error('[Calorie Tracker] Supabase save failed, using local fallback:', error);
        meal.isLocalOnly = true;
      }
    }

    const nextMeals = [meal, ...meals.filter((existing) => existing.id !== meal.id)];
    setMeals(nextMeals);
    writeLocalMeals(nextMeals);
    setDetectedItems([]);
    setCapturedImage(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(meal.isLocalOnly ? 'Saved on this device' : 'Meal Saved', meal.isLocalOnly ? 'Guest/fallback data is stored locally on this device only.' : 'Meal added to your daily tracker.');
  };

  const deleteMeal = (id: string) => {
    Alert.alert('Delete Meal', 'Remove this logged meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const meal = meals.find((entry) => entry.id === id);
          setMeals((current) => {
            const next = current.filter((entry) => entry.id !== id);
            writeLocalMeals(next);
            return next;
          });
          if (user?.id && meal && !meal.isLocalOnly) {
            await (supabase as any).from('meal_logs').delete().eq('id', id).eq('user_id', user.id);
          }
        },
      },
    ]);
  };

  const editMeal = (meal: MealLog) => {
    setMealType(meal.mealType);
    setDetectedItems(meal.items);
    setCapturedImage(meal.capturedImageUrl || null);
    deleteMeal(meal.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111114" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Calorie Tracker</Text>
          <Text style={styles.headerSubtitle}>Meal logging and nutrition awareness</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateCard}>
          <Pressable style={styles.dayButton} onPress={() => shiftDate(-1)}>
            <Ionicons name="chevron-back" size={20} color="#111114" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.dateLabel}>{selectedDate}</Text>
            <Text style={styles.dateSubLabel}>{getTimezone()}</Text>
          </View>
          <Pressable style={styles.dayButton} onPress={() => shiftDate(1)}>
            <Ionicons name="chevron-forward" size={20} color="#111114" />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryEyebrow}>Daily total</Text>
              <Text style={styles.calorieTotal}>{Math.round(dayTotals.calories)} kcal</Text>
            </View>
            <View style={styles.summaryIcon}>
              <Ionicons name="analytics-outline" size={24} color={colors.accentPurple} />
            </View>
          </View>
          <View style={styles.macroGrid}>
            <Macro label="Protein" value={`${Math.round(dayTotals.proteinGrams)}g`} color="#39A96B" />
            <Macro label="Carbs" value={`${Math.round(dayTotals.carbohydrateGrams)}g`} color={colors.accentBlue} />
            <Macro label="Fat" value={`${Math.round(dayTotals.fatGrams)}g`} color="#D69E2E" />
            <Macro label="Fibre" value={`${Math.round(dayTotals.fibreGrams)}g`} color={colors.accentPurple} />
          </View>
        </View>

        <View style={styles.captureCard}>
          <Text style={styles.sectionTitle}>Scan a meal</Text>
          <Text style={styles.sectionSubtitle}>Capture or upload food, review estimates, then save to a meal.</Text>

          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type.value}
                style={[styles.mealTypeChip, mealType === type.value && styles.mealTypeChipActive]}
                onPress={() => setMealType(type.value)}
              >
                <Ionicons name={type.icon} size={15} color={mealType === type.value ? '#FFFFFF' : colors.textMuted} />
                <Text style={[styles.mealTypeText, mealType === type.value && styles.mealTypeTextActive]}>{type.label}</Text>
              </Pressable>
            ))}
          </View>

          {capturedImage ? <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="cover" /> : null}

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryAction} onPress={pickImage} disabled={isAnalysing}>
              <Ionicons name="images-outline" size={18} color={colors.accentBlue} />
              <Text style={styles.secondaryActionText}>Upload</Text>
            </Pressable>
            <Pressable style={styles.primaryAction} onPress={openCamera} disabled={isAnalysing}>
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>{capturedImage ? 'Retake' : 'Open Camera'}</Text>
            </Pressable>
          </View>

          {isAnalysing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.accentBlue} />
              <Text style={styles.loadingText}>{loadingStep}</Text>
            </View>
          ) : null}
        </View>

        {analysisResult && !detectedItems.length && !isAnalysing ? (
          <AnalysisStateCard result={analysisResult} onRetake={openCamera} onUpload={pickImage} />
        ) : null}

        {detectedItems.length ? (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.sectionTitle}>Review detected items</Text>
                <Text style={styles.sectionSubtitle}>Correct names, portions, or macros before saving.</Text>
              </View>
              <Pressable style={styles.addButton} onPress={addManualItem}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            {analysisResult ? <DetectedStateBanner result={analysisResult} /> : null}
            {detectedItems.map((item) => (
              <FoodItemEditor key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
            ))}
            <View style={styles.mealTotalBox}>
              <Text style={styles.mealTotalTitle}>Meal total</Text>
              <Text style={styles.mealTotalValue}>{Math.round(currentTotals.calories)} kcal</Text>
              <Text style={styles.mealTotalMacros}>
                {Math.round(currentTotals.proteinGrams)}g protein · {Math.round(currentTotals.carbohydrateGrams)}g carbs · {Math.round(currentTotals.fatGrams)}g fat
              </Text>
            </View>
            <Text style={styles.estimateNote}>
              Nutrition values are estimates based on the visible food and selected portion size. Actual values may vary by recipe, ingredients, and quantity.
            </Text>
            <Pressable style={styles.saveButton} onPress={saveMeal}>
              <Text style={styles.saveButtonText}>Save Meal</Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mealsCard}>
          <Text style={styles.sectionTitle}>Meals on this day</Text>
          {MEAL_TYPES.map((type) => {
            const entries = dayMeals.filter((meal) => meal.mealType === type.value);
            return (
              <View key={type.value} style={styles.mealSection}>
                <View style={styles.mealSectionHeader}>
                  <Ionicons name={type.icon} size={18} color={colors.accentPurple} />
                  <Text style={styles.mealSectionTitle}>{type.label}</Text>
                  <Text style={styles.mealSectionCount}>{entries.length}</Text>
                </View>
                {entries.length ? entries.map((meal) => {
                  const totals = sumItems(meal.items);
                  return (
                    <View key={meal.id} style={styles.loggedMeal}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.loggedMealTitle}>{meal.mealName}</Text>
                        <Text style={styles.loggedMealMeta}>
                          {new Date(meal.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {Math.round(totals.calories)} kcal
                          {meal.isLocalOnly ? ' · local only' : ''}
                        </Text>
                        <Text style={styles.loggedMealItems}>{meal.items.map((item) => item.name).join(', ')}</Text>
                      </View>
                      <Pressable style={styles.smallIconButton} onPress={() => editMeal(meal)}>
                        <Ionicons name="create-outline" size={17} color={colors.accentBlue} />
                      </Pressable>
                      <Pressable style={styles.smallIconButton} onPress={() => deleteMeal(meal.id)}>
                        <Ionicons name="trash-outline" size={17} color={colors.error} />
                      </Pressable>
                    </View>
                  );
                }) : <Text style={styles.emptyMealText}>No {type.label.toLowerCase()} logged.</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back">
            <SafeAreaView style={styles.cameraOverlay}>
              <View style={styles.cameraTopBar}>
                <Pressable style={styles.cameraRoundButton} onPress={() => setShowCamera(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
                <View style={styles.cameraInstructionPill}>
                  <Ionicons name="nutrition-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.cameraInstructionText}>Frame the full meal</Text>
                </View>
                <View style={styles.cameraRoundButton} />
              </View>

              <View style={styles.cameraFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>

              <View style={styles.cameraBottomBar}>
                <Text style={styles.cameraHelperText}>
                  YSnap will estimate calories, protein, carbs, fat, and fibre from the captured food image.
                </Text>
                <Pressable style={styles.cameraShutter} onPress={captureFromCamera} disabled={isAnalysing}>
                  <View style={styles.cameraShutterInner} />
                </Pressable>
              </View>
            </SafeAreaView>
          </CameraView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function statusCopy(status: DetectionStatus) {
  if (status === 'NO_EDIBLE_ITEM_DETECTED') {
    return {
      icon: 'search-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No food or drink detected',
      accent: colors.textMuted,
    };
  }
  if (status === 'LOW_CONFIDENCE') {
    return {
      icon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Try a clearer photo',
      accent: '#D69E2E',
    };
  }
  if (status === 'FAILED') {
    return {
      icon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Analysis unavailable',
      accent: colors.error,
    };
  }
  if (status === 'DRINK_DETECTED') {
    return {
      icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Drink detected',
      accent: colors.accentBlue,
    };
  }
  return {
    icon: 'nutrition-outline' as keyof typeof Ionicons.glyphMap,
    title: status === 'FOOD_AND_DRINK_DETECTED' ? 'Food and drink detected' : 'Food detected',
    accent: '#39A96B',
  };
}

function AnalysisStateCard({
  result,
  onRetake,
  onUpload,
}: {
  result: AnalysisResultState;
  onRetake: () => void;
  onUpload: () => void;
}) {
  const copy = statusCopy(result.status);
  return (
    <View style={styles.analysisStateCard}>
      <View style={[styles.analysisStateIcon, { backgroundColor: `${copy.accent}18` }]}>
        <Ionicons name={copy.icon} size={24} color={copy.accent} />
      </View>
      <Text style={styles.analysisStateTitle}>{copy.title}</Text>
      <Text style={styles.analysisStateMessage}>{result.message}</Text>
      {result.warnings.length ? (
        <View style={styles.warningList}>
          {result.warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>• {warning}</Text>
          ))}
        </View>
      ) : null}
      <View style={styles.retryRow}>
        <Pressable style={styles.retryButton} onPress={onUpload}>
          <Ionicons name="images-outline" size={17} color={colors.accentBlue} />
          <Text style={styles.retryButtonText}>Upload another image</Text>
        </Pressable>
        <Pressable style={styles.retryButtonDark} onPress={onRetake}>
          <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
          <Text style={styles.retryButtonDarkText}>Retake</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetectedStateBanner({ result }: { result: AnalysisResultState }) {
  const copy = statusCopy(result.status);
  return (
    <View style={styles.detectedBanner}>
      <View style={[styles.detectedBannerIcon, { backgroundColor: `${copy.accent}18` }]}>
        <Ionicons name={copy.icon} size={16} color={copy.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detectedBannerTitle}>{result.message}</Text>
        <Text style={styles.detectedBannerMeta}>
          {result.analysisModel ? `Gemini: ${result.analysisModel}` : 'Gemini analysis'} · Review before saving
        </Text>
      </View>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function FoodItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: CalorieItem;
  onUpdate: (id: string, field: keyof CalorieItem, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.foodEditorCard}>
      <View style={styles.foodEditorHeader}>
        <TextInput style={styles.foodNameInput} value={item.name} onChangeText={(value) => onUpdate(item.id, 'name', value)} />
        {item.category ? (
          <View style={styles.categoryPill}>
            <Ionicons name={item.category === 'drink' ? 'water-outline' : 'nutrition-outline'} size={12} color={colors.accentPurple} />
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>
        ) : null}
        <Pressable onPress={() => onRemove(item.id)} style={styles.removeButton}>
          <Ionicons name="close" size={17} color={colors.error} />
        </Pressable>
      </View>
      <TextInput style={styles.portionInput} value={item.portion} onChangeText={(value) => onUpdate(item.id, 'portion', value)} placeholder="Portion size" />
      <View style={styles.nutritionInputsGrid}>
        <NumberInput label="kcal" value={item.calories} onChange={(value) => onUpdate(item.id, 'calories', value)} />
        <NumberInput label="Protein" value={item.proteinGrams} onChange={(value) => onUpdate(item.id, 'proteinGrams', value)} />
        <NumberInput label="Carbs" value={item.carbohydrateGrams} onChange={(value) => onUpdate(item.id, 'carbohydrateGrams', value)} />
        <NumberInput label="Fat" value={item.fatGrams} onChange={(value) => onUpdate(item.id, 'fatGrams', value)} />
        <NumberInput label="Fibre" value={item.fibreGrams} onChange={(value) => onUpdate(item.id, 'fibreGrams', value)} />
        <NumberInput label="Grams" value={item.estimatedGrams} onChange={(value) => onUpdate(item.id, 'estimatedGrams', value)} />
      </View>
      <Text style={styles.confidenceText}>AI confidence: {Math.round(item.confidence * 100)}%{item.isUserEdited ? ' · edited' : ''}</Text>
    </View>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <View style={styles.numberInputWrap}>
      <Text style={styles.numberInputLabel}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        keyboardType="numeric"
        value={`${Math.round(Number(value || 0))}`}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111114', textAlign: 'center' },
  headerSubtitle: { fontSize: 11, fontWeight: '700', color: 'rgba(0,0,0,0.45)', textAlign: 'center', marginTop: 2 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 12,
  },
  dayButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F1F3F5', alignItems: 'center', justifyContent: 'center' },
  dateLabel: { fontSize: 15, fontWeight: '900', color: '#111114' },
  dateSubLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.42)', marginTop: 2 },
  summaryCard: {
    backgroundColor: '#111114',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' },
  calorieTotal: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  summaryIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  macroCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 12 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  macroValue: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  macroLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  captureCard: cardStyle(),
  reviewCard: cardStyle(),
  mealsCard: cardStyle(),
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111114' },
  sectionSubtitle: { fontSize: 12, lineHeight: 17, fontWeight: '600', color: 'rgba(0,0,0,0.5)', marginTop: 3 },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  mealTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F3F5' },
  mealTypeChipActive: { backgroundColor: colors.accentPurple },
  mealTypeText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  mealTypeTextActive: { color: '#FFFFFF' },
  previewImage: { width: '100%', height: 190, borderRadius: 20, marginTop: 14, backgroundColor: '#E4E7EC' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryAction: buttonStyle('#FFFFFF', '#E4E7EC'),
  primaryAction: buttonStyle('#111114', '#111114'),
  secondaryActionText: { fontSize: 13, fontWeight: '900', color: colors.accentBlue },
  primaryActionText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  loadingBox: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 },
  loadingText: { fontSize: 12, fontWeight: '800', color: '#4A5568' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addButton: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center' },
  analysisStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#111114',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  analysisStateIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  analysisStateTitle: { fontSize: 17, fontWeight: '900', color: '#111114', textAlign: 'center' },
  analysisStateMessage: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: 'rgba(0,0,0,0.55)', textAlign: 'center', marginTop: 6 },
  warningList: { width: '100%', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 10, marginTop: 12 },
  warningText: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: '#92400E' },
  retryRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 },
  retryButton: buttonStyle('#FFFFFF', '#E4E7EC'),
  retryButtonDark: buttonStyle('#111114', '#111114'),
  retryButtonText: { fontSize: 12, fontWeight: '900', color: colors.accentBlue },
  retryButtonDarkText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  detectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#E4E7EC', padding: 12, marginBottom: 12 },
  detectedBannerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detectedBannerTitle: { fontSize: 12, fontWeight: '900', color: '#111114' },
  detectedBannerMeta: { fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.42)', marginTop: 2 },
  foodEditorCard: { backgroundColor: '#F8F9FA', borderRadius: 18, borderWidth: 1, borderColor: '#E4E7EC', padding: 12, marginBottom: 10 },
  foodEditorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foodNameInput: { flex: 1, fontSize: 15, fontWeight: '900', color: '#111114', padding: 0 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,108,208,0.1)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  categoryPillText: { fontSize: 10, fontWeight: '900', color: colors.accentPurple, textTransform: 'capitalize' },
  removeButton: { width: 30, height: 30, borderRadius: 12, backgroundColor: '#FFF0F1', alignItems: 'center', justifyContent: 'center' },
  portionInput: { marginTop: 8, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E7EC', padding: 10, fontSize: 12, fontWeight: '700' },
  nutritionInputsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  numberInputWrap: { width: '30%', minWidth: 82 },
  numberInputLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(0,0,0,0.45)', marginBottom: 4 },
  numberInput: { height: 38, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E7EC', paddingHorizontal: 8, fontSize: 12, fontWeight: '800', color: '#111114' },
  confidenceText: { fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.45)', marginTop: 8 },
  mealTotalBox: { backgroundColor: '#111114', borderRadius: 18, padding: 14, marginTop: 4 },
  mealTotalTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  mealTotalValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  mealTotalMacros: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.62)', marginTop: 4 },
  estimateNote: { fontSize: 11, lineHeight: 16, fontWeight: '600', color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, marginTop: 12 },
  saveButton: { height: 52, borderRadius: 18, backgroundColor: colors.accentPurple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  saveButtonText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  mealSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#ECEEF1', paddingTop: 12 },
  mealSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mealSectionTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: '#111114' },
  mealSectionCount: { fontSize: 11, fontWeight: '900', color: colors.accentPurple, backgroundColor: 'rgba(124,108,208,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  loggedMeal: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#E4E7EC', padding: 12, marginBottom: 8 },
  loggedMealTitle: { fontSize: 13, fontWeight: '900', color: '#111114' },
  loggedMealMeta: { fontSize: 11, fontWeight: '700', color: colors.accentPurple, marginTop: 2 },
  loggedMealItems: { fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.45)', marginTop: 2 },
  smallIconButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E7EC', alignItems: 'center', justifyContent: 'center' },
  emptyMealText: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.38)', paddingVertical: 6 },
  cameraModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  cameraRoundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cameraInstructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cameraInstructionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cameraFrame: {
    alignSelf: 'center',
    width: '82%',
    aspectRatio: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 34,
    gap: 16,
  },
  cameraHelperText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  cameraShutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cameraShutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
});

function cardStyle() {
  return {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    padding: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  } as const;
}

function buttonStyle(backgroundColor: string, borderColor: string) {
  return {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor,
    borderWidth: 1,
    borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as const;
}
