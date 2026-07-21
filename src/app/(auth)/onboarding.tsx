import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../constants';
import { PremiumCTAButton } from '../../components/auth/PremiumCTAButton';

const SLIDE_COUNT = 3;

const slides = [
  {
    key: 'snap-discover-understand',
    cta: "Let’s Get Started",
    image: require('../../../assets/onboarding/final-slide-1.png'),
  },
  {
    key: 'one-camera-unlimited-knowledge',
    cta: 'Continue',
    image: require('../../../assets/onboarding/final-slide-2.png'),
  },
  {
    key: 'ai-vision-assistant',
    cta: 'Start Exploring',
    image: require('../../../assets/onboarding/final-slide-3.png'),
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const pageWidth = Math.min(width, 480);
  const isNarrow = width < 360;
  const isShort = height < 740;
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);

  const completeOnboarding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/sign-in');
  };

  const goToStep = (next: number) => {
    const target = Math.max(0, Math.min(next, SLIDE_COUNT - 1));
    Haptics.selectionAsync();
    setStep(target);
    scrollRef.current?.scrollTo({ x: target * pageWidth, animated: true });
  };

  const handleNext = () => {
    if (step === SLIDE_COUNT - 1) {
      completeOnboarding();
      return;
    }

    goToStep(step + 1);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setStep(Math.max(0, Math.min(next, SLIDE_COUNT - 1)));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.phoneShell, { maxWidth: pageWidth }]}>
        <Animated.ScrollView
          ref={scrollRef as any}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          style={styles.pager}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={[styles.slide, { width: pageWidth }]}>
              <View style={[styles.imageFrame, { bottom: isShort ? 80 : 94 }]}>
                <Image
                  source={slide.image}
                  resizeMode="contain"
                  style={styles.slideImage}
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        <View pointerEvents="box-none" style={styles.controlsLayer}>
          <View style={[styles.topNav, isNarrow && styles.topNavNarrow]}>
            {step > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.navCircle, isNarrow && styles.navCircleNarrow, pressed && styles.pressed]}
                onPress={() => goToStep(step - 1)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={isNarrow ? 22 : 24} color={colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={[styles.navCircleGhost, isNarrow && styles.navCircleNarrow]} />
            )}

            <Pressable
              style={({ pressed }) => [styles.skipPill, isNarrow && styles.skipPillNarrow, pressed && styles.pressed]}
              onPress={completeOnboarding}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={[styles.skipText, isNarrow && styles.skipTextNarrow]}>Skip</Text>
              <Ionicons name="arrow-forward" size={isNarrow ? 17 : 19} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={[styles.ctaWrap, isNarrow && styles.ctaWrapNarrow]}>
            <PremiumCTAButton title={slides[step].cta} onPress={handleNext} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  phoneShell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 94,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topNav: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 12 : 8,
    left: 26,
    right: 26,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topNavNarrow: {
    left: 18,
    right: 18,
  },
  navCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#ECECF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  navCircleNarrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  navCircleGhost: {
    width: 54,
    height: 54,
  },
  skipPill: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#ECECF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  skipPillNarrow: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
  },
  skipText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  skipTextNarrow: {
    fontSize: 16,
  },
  ctaWrap: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: Platform.OS === 'ios' ? 18 : 16,
    zIndex: 6,
  },
  ctaWrapNarrow: {
    left: 20,
    right: 20,
    bottom: 14,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
