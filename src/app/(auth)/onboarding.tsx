import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandMark } from '../../components';
import { colors, shadows, spacing, typography } from '../../constants';
import { PremiumCTAButton } from '../../components/auth/PremiumCTAButton';

const SLIDE_COUNT = 4;
const accent = '#1877F2';
const softBlue = '#EEF5FF';
const purple = '#7C6CD0';

type FeatureTile = {
  label: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const stackedFeatures: FeatureTile[] = [
  { label: 'Translate', detail: 'Text, voice and signs.', icon: 'language-outline', tone: accent },
  { label: 'Camera', detail: 'Snap and understand.', icon: 'camera-outline', tone: accent },
  { label: 'Conversation', detail: 'Live back-and-forth.', icon: 'chatbubbles-outline', tone: purple },
  { label: 'Audio', detail: 'Listen and replay.', icon: 'volume-high-outline', tone: colors.accentGreen },
  { label: 'Study', detail: 'Review saved history.', icon: 'school-outline', tone: colors.accentOrange },
];

const orbitFeatures: FeatureTile[] = [
  { label: 'Translate', icon: 'language-outline', tone: accent },
  { label: 'Voice', icon: 'mic-outline', tone: purple },
  { label: 'Camera', icon: 'scan-outline', tone: accent },
  { label: 'Study', icon: 'school-outline', tone: colors.accentOrange },
  { label: 'History', icon: 'bookmarks-outline', tone: colors.accentGreen },
  { label: 'Private', icon: 'lock-closed-outline', tone: colors.textPrimary },
];

const benefitItems = [
  { label: 'Instant\nResults', icon: 'scan-outline', tone: accent },
  { label: 'Accurate &\nReliable', icon: 'shield-checkmark-outline', tone: colors.accentGreen },
  { label: 'AI Powered\nInsights', icon: 'flash-outline', tone: purple },
  { label: '100%\nPrivate', icon: 'lock-closed-outline', tone: colors.textPrimary },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const viewportWidth = Math.min(width, 520);
  const isCompact = height < 760;
  const isNarrow = width < 380;
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);

  const slides = useMemo(
    () => [
      {
        headline: ['Snap.', 'Discover.', 'Understand.'],
        highlight: 1,
        body: 'AI that sees everything,\nso you can know anything.',
        cta: "Let's Get Started",
        visual: <CameraHero compact={isCompact} />,
      },
      {
        headline: ['One Camera.', 'Unlimited', 'Knowledge.'],
        highlight: 1,
        body: 'Powerful AI tools to help you\nlearn, solve and explore.',
        cta: 'Continue',
        visual: <StackedFeatureCards compact={isCompact || isNarrow} />,
      },
      {
        headline: ['Your AI', 'Vision', 'Assistant.'],
        highlight: 1,
        body: 'Snap anything. Get answers.\nExpand your world.',
        cta: 'Start Exploring',
        visual: <PhonePreview compact={isCompact} />,
      },
      {
        headline: ['Snap Anything'],
        highlight: 0,
        body: 'Translation, voice, camera and study tools\nready from one simple action.',
        cta: 'Explore the Possibilities',
        visual: <OrbitExperience compact={isCompact} />,
      },
    ],
    [isCompact, isNarrow],
  );

  const goToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/sign-in');
  };

  const goToStep = (next: number) => {
    const clamped = Math.max(0, Math.min(next, SLIDE_COUNT - 1));
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ x: clamped * viewportWidth, animated: true });
    setStep(clamped);
  };

  const handleNext = () => {
    if (step === SLIDE_COUNT - 1) {
      goToLogin();
      return;
    }
    goToStep(step + 1);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
    setStep(Math.max(0, Math.min(next, SLIDE_COUNT - 1)));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.shell, { maxWidth: viewportWidth }]}>
        <View style={styles.topBar}>
          <BrandPill />
          <Pressable
            onPress={goToLogin}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          style={styles.pager}
        >
          {slides.map((slide, index) => (
            <View key={slide.cta} style={[styles.slide, { width: viewportWidth }]}>
              <View style={[styles.copyBlock, index === 3 && styles.copyBlockCentered]}>
                <AiAmbientDecor index={index} />
                <Headline
                  lines={slide.headline}
                  highlight={slide.highlight}
                  centered={index === 3}
                  compact={isCompact || isNarrow}
                />
                <ProgressBars activeIndex={index} />
                <Text style={[styles.body, index === 3 && styles.bodyCentered]}>{slide.body}</Text>
              </View>
              <View style={[styles.visualWrap, isCompact && styles.visualWrapCompact]}>
                {slide.visual}
              </View>
              <View style={styles.footer}>
                {index === 3 && <BenefitsBar />}
                {index === 3 && !isCompact && (
                  <View style={styles.quoteCard}>
                    <Text style={styles.quoteMark}>“</Text>
                    <Text style={styles.quoteText}>One snap is all it takes to unlock answers, ideas and translations.</Text>
                  </View>
                )}
                <PremiumCTAButton title={slide.cta} onPress={handleNext} />
              </View>
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Headline({
  lines,
  highlight,
  centered,
  compact,
}: {
  lines: string[];
  highlight: number;
  centered?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={centered && styles.centered}>
      {lines.map((line, index) => (
        <Text
          key={line}
          style={[
            styles.headline,
            compact && styles.headlineCompact,
            centered && styles.headlineCentered,
            index === highlight && styles.headlineAccent,
          ]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

function BrandPill() {
  return (
    <View style={styles.brandPill}>
      <LinearGradient colors={['#2D2530', '#18121C', '#0C0B0D']} style={styles.brandMarkShell}>
        <View style={styles.brandShine} />
        <BrandMark size={31} variant="light" />
      </LinearGradient>
      <Text style={styles.brandText}>YSnap</Text>
    </View>
  );
}

function AiAmbientDecor({ index }: { index: number }) {
  return (
    <View pointerEvents="none" style={styles.aiDecorLayer}>
      <View style={[styles.aiGlow, index % 2 === 0 ? styles.aiGlowRight : styles.aiGlowLeft]} />
      <View style={[styles.aiSoftRing, index % 2 === 0 ? styles.aiSoftRingRight : styles.aiSoftRingLeft]} />
      <View style={[styles.aiDiamond, styles.aiDiamondOne]} />
      <View style={[styles.aiDiamond, styles.aiDiamondTwo]} />
      <View style={[styles.aiDiamond, styles.aiDiamondThree]} />
      <Ionicons name="sparkles" size={16} color="#82AFFF" style={styles.aiSparkleOne} />
      {index === 3 && <Ionicons name="hardware-chip-outline" size={17} color="#8C7CF0" style={styles.aiChipDecor} />}
    </View>
  );
}

function ProgressBars({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={styles.progressRow} accessibilityRole="progressbar">
      {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
        <View key={index} style={[styles.progressBar, index === activeIndex && styles.progressBarActive]} />
      ))}
    </View>
  );
}

function FloatingIcon({ icon, tone, style }: { icon: keyof typeof Ionicons.glyphMap; tone: string; style: any }) {
  return (
    <View style={[styles.floatingIcon, style]}>
      <Ionicons name={icon} size={30} color={tone} />
    </View>
  );
}

function CameraHero({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.cameraHero, compact && styles.cameraHeroCompact]}>
      <View style={styles.heroGlow} />
      <View style={styles.sparkleOne} />
      <View style={styles.sparkleTwo} />
      <FloatingIcon icon="medical-outline" tone={accent} style={styles.heroIconTop} />
      <FloatingIcon icon="leaf-outline" tone={colors.accentGreen} style={styles.heroIconRight} />
      <FloatingIcon icon="calculator-outline" tone={purple} style={styles.heroIconMiddle} />
      <FloatingIcon icon="documents-outline" tone={colors.textPrimary} style={styles.heroIconFarRight} />
      <FloatingIcon icon="cash-outline" tone={colors.accentOrange} style={styles.heroIconLeft} />
      <View style={styles.cameraBase}>
        <View style={styles.cameraBody}>
          <View style={styles.viewFinder} />
          <View style={styles.lensOuter}>
            <LinearGradient colors={['#101013', '#050506']} style={styles.lensInner}>
              <View style={styles.lensGlow} />
            </LinearGradient>
          </View>
        </View>
      </View>
      <View style={styles.benefitMiniRow}>
        {['Private', 'Instant', 'Accurate', 'AI'].map((item, index) => (
          <View key={item} style={styles.miniBenefit}>
            <Ionicons
              name={(['shield-checkmark-outline', 'flash-outline', 'locate-outline', 'sparkles-outline'] as const)[index]}
              size={20}
              color={index === 0 ? colors.textPrimary : accent}
            />
            <Text style={styles.miniBenefitText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StackedFeatureCards({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.stack, compact && styles.stackCompact]}>
      {stackedFeatures.map((item) => (
        <View key={item.label} style={[styles.featureRow, compact && styles.featureRowCompact]}>
          <View style={[styles.featureIconWrap, compact && styles.featureIconWrapCompact]}>
            <Ionicons name={item.icon} size={compact ? 23 : 25} color={item.tone} />
          </View>
          <View style={styles.featureTextBlock}>
            <Text style={styles.featureTitle}>{item.label}</Text>
            <Text style={styles.featureDetail}>{item.detail}</Text>
          </View>
          <View style={styles.featureArrow}>
            <Ionicons name="chevron-forward" size={21} color={colors.textSubtle} />
          </View>
        </View>
      ))}
    </View>
  );
}

function PhonePreview({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.phoneScene, compact && styles.phoneSceneCompact]}>
      <FloatingIcon icon="leaf-outline" tone={colors.accentGreen} style={styles.phoneLeaf} />
      <FloatingIcon icon="add-outline" tone={accent} style={styles.phonePlus} />
      <FloatingIcon icon="calculator-outline" tone={purple} style={styles.phoneMath} />
      <FloatingIcon icon="globe-outline" tone={colors.textPrimary} style={styles.phoneGlobe} />
      <View style={styles.phone}>
        <View style={styles.phoneNotch} />
        <View style={styles.phoneScreen}>
          <View style={styles.scanCornerTopLeft} />
          <View style={styles.scanCornerTopRight} />
          <View style={styles.scanCornerBottomLeft} />
          <View style={styles.scanCornerBottomRight} />
          <View style={styles.plantPot}>
            <View style={styles.plantLeafOne} />
            <View style={styles.plantLeafTwo} />
            <View style={styles.plantLeafThree} />
            <View style={styles.pot} />
          </View>
        </View>
        <View style={styles.phoneTabs}>
          <Text style={styles.phoneTab}>SCAN</Text>
          <Text style={[styles.phoneTab, styles.phoneTabActive]}>SOLVE</Text>
          <Text style={styles.phoneTab}>TRANSLATE</Text>
        </View>
        <View style={styles.phoneHome} />
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="sparkles" size={28} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Smart. Fast. Reliable.</Text>
          <Text style={styles.infoText}>All the knowledge you need, right in your pocket.</Text>
        </View>
      </View>
    </View>
  );
}

function OrbitExperience({ compact }: { compact: boolean }) {
  const positions = [
    styles.orbitTop,
    styles.orbitRightTop,
    styles.orbitRightBottom,
    styles.orbitBottom,
    styles.orbitLeftBottom,
    styles.orbitLeftTop,
  ];
  return (
    <View style={[styles.orbitScene, compact && styles.orbitSceneCompact]}>
      <View style={styles.orbitGlow} />
      <View style={styles.orbitDiamondTop} />
      <View style={styles.orbitDiamondBottom} />
      <Ionicons name="sparkles" size={18} color="#82AFFF" style={styles.orbitSparkle} />
      <View style={[styles.orbitRing, compact && styles.orbitRingCompact]} />
      <View style={[styles.orbitRingInner, compact && styles.orbitRingInnerCompact]} />
      {orbitFeatures.map((item, index) => (
        <View key={item.label} style={[styles.orbitTile, compact && styles.orbitTileCompact, positions[index]]}>
          <Ionicons name={item.icon} size={28} color={item.tone} />
          <Text style={styles.orbitTileText}>{item.label}</Text>
        </View>
      ))}
      <LinearGradient colors={['#111014', '#17101C', '#09090B']} style={[styles.centralSnap, compact && styles.centralSnapCompact]}>
        <CameraEmblem compact={compact} />
        <Text style={styles.centralTitle}>Snap Anything</Text>
      </LinearGradient>
    </View>
  );
}

function CameraEmblem({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.cameraEmblem, compact && styles.cameraEmblemCompact]}>
      <View style={styles.cameraEmblemGlow} />
      <LinearGradient colors={['#FFFFFF', '#F7F7FA', '#E9E9EF']} style={styles.cameraEmblemBody}>
        <View style={styles.cameraEmblemShine} />
        <View style={styles.cameraTopRidge} />
        <LinearGradient colors={['#0D0D11', '#282832']} style={styles.cameraLensOuter}>
          <View style={styles.cameraLensInner}>
            <View style={styles.cameraLensCore} />
            <View style={styles.cameraLensSpark} />
          </View>
        </LinearGradient>
        <View style={styles.cameraFlash} />
        <View style={styles.cameraSideDot} />
      </LinearGradient>
    </View>
  );
}

function BenefitsBar() {
  return (
    <View style={styles.benefitsBar}>
      {benefitItems.map((item, index) => (
        <View key={item.label} style={[styles.benefitItem, index < benefitItems.length - 1 && styles.benefitDivider]}>
          <Ionicons name={item.icon} size={25} color={item.tone} />
          <Text style={styles.benefitText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  shell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FEFEFF',
  },
  topBar: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
  },
  brandMarkShell: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3C333F',
    shadowColor: '#08070A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  brandShine: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  brandText: {
    fontFamily: typography.heading2.fontFamily,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '760' as any,
    letterSpacing: -0.55,
    color: colors.textPrimary,
  },
  skipButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  skipText: { ...typography.label, fontSize: 16, color: colors.textPrimary },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.lg,
  },
  copyBlock: {
    paddingTop: spacing.sm,
    position: 'relative',
  },
  copyBlockCentered: {
    alignItems: 'center',
    paddingTop: 0,
  },
  headline: {
    fontFamily: typography.display.fontFamily,
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: -0.85,
    fontWeight: '720' as any,
    color: colors.textPrimary,
    textShadowColor: 'rgba(12, 12, 16, 0.035)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headlineCompact: {
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.65,
  },
  headlineCentered: { textAlign: 'center' },
  headlineAccent: {
    color: accent,
    textShadowColor: 'rgba(24, 119, 242, 0.14)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
  centered: { alignItems: 'center' },
  aiDecorLayer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 126,
  },
  aiGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(24,119,242,0.07)',
  },
  aiGlowRight: { right: -54, top: 16 },
  aiGlowLeft: { left: -60, top: 8, backgroundColor: 'rgba(124,108,208,0.07)' },
  aiSoftRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(130,175,255,0.16)',
  },
  aiSoftRingRight: { right: 10, top: 86 },
  aiSoftRingLeft: { left: 12, top: 92, borderColor: 'rgba(124,108,208,0.14)' },
  aiDiamond: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#DCE9FF',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#82AFFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  aiDiamondOne: { right: 36, top: 4 },
  aiDiamondTwo: { right: 82, top: 72, width: 6, height: 6, backgroundColor: '#EFEAFF' },
  aiDiamondThree: { left: 48, top: 22, width: 5, height: 5, backgroundColor: '#EAF1FF' },
  aiSparkleOne: { position: 'absolute', right: 16, top: 48 },
  aiChipDecor: { position: 'absolute', left: 22, top: 74 },
  progressRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  progressBar: {
    width: 34,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E0E0E4',
  },
  progressBarActive: {
    backgroundColor: accent,
    shadowColor: accent,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  body: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: spacing.sm,
  },
  bodyCentered: { textAlign: 'center' },
  visualWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
  visualWrapCompact: { flex: 0.92 },
  footer: { gap: spacing.md, paddingBottom: spacing.xs },
  pressed: { opacity: 0.62, transform: [{ scale: 0.98 }] },

  cameraHero: { minHeight: 360, justifyContent: 'flex-end', alignItems: 'center' },
  cameraHeroCompact: { minHeight: 290 },
  sparkleOne: { position: 'absolute', top: 32, right: 76, width: 7, height: 7, borderRadius: 4, backgroundColor: '#BFD6FF' },
  sparkleTwo: { position: 'absolute', top: 100, left: 52, width: 9, height: 9, borderRadius: 5, backgroundColor: '#CBD8FF' },
  floatingIcon: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.095,
    shadowRadius: 24,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    bottom: 54,
    width: 260,
    height: 150,
    borderRadius: 130,
    backgroundColor: 'rgba(24,119,242,0.08)',
  },
  heroIconTop: { top: 8, left: '45%', transform: [{ rotate: '4deg' }] },
  heroIconRight: { top: 70, right: 12, transform: [{ rotate: '12deg' }] },
  heroIconMiddle: { top: 130, right: 116, transform: [{ rotate: '10deg' }] },
  heroIconFarRight: { top: 185, right: 18, transform: [{ rotate: '13deg' }] },
  heroIconLeft: { top: 150, left: 12, transform: [{ rotate: '-14deg' }] },
  cameraBase: {
    width: '86%',
    maxWidth: 360,
    height: 170,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 999,
    backgroundColor: '#F2F3F7',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#8AAAF4',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  cameraBody: {
    width: 250,
    height: 138,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 7,
  },
  viewFinder: {
    position: 'absolute',
    left: 36,
    top: 24,
    width: 58,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#111114',
  },
  lensOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#161618',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#28282C',
  },
  lensInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: accent,
  },
  lensGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#55A2FF',
    opacity: 0.5,
  },
  benefitMiniRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  miniBenefit: { alignItems: 'center', width: 78, gap: spacing.xs },
  miniBenefitText: { ...typography.captionMedium, color: colors.textPrimary, textAlign: 'center' },

  stack: { gap: spacing.sm, paddingTop: spacing.sm },
  stackCompact: { gap: 10, paddingTop: 0 },
  featureRow: {
    minHeight: 76,
    borderRadius: 24,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF1',
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.075,
    shadowRadius: 24,
    elevation: 3,
  },
  featureRowCompact: { minHeight: 68, borderRadius: 21 },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FAFAFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#F0F0F4',
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
  },
  featureIconWrapCompact: { width: 48, height: 48, borderRadius: 16, marginRight: spacing.sm },
  featureTextBlock: { flex: 1 },
  featureTitle: { ...typography.heading3, fontSize: 17, lineHeight: 22, color: colors.textPrimary, marginBottom: 2 },
  featureDetail: { ...typography.bodySmall, fontSize: 13, color: colors.textSecondary },
  featureArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  phoneScene: { minHeight: 395, justifyContent: 'flex-end', alignItems: 'center' },
  phoneSceneCompact: { minHeight: 320 },
  phoneLeaf: { left: 20, top: 34, width: 56, height: 56 },
  phonePlus: { left: 8, top: 130, width: 58, height: 58, transform: [{ rotate: '9deg' }] },
  phoneMath: { right: 20, top: 126, width: 58, height: 58, transform: [{ rotate: '9deg' }] },
  phoneGlobe: { right: 36, bottom: 90, width: 64, height: 64 },
  phone: {
    width: 205,
    height: 300,
    borderRadius: 34,
    backgroundColor: '#111114',
    padding: spacing.xs,
    transform: [{ rotate: '9deg' }],
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 8,
  },
  phoneNotch: {
    position: 'absolute',
    zIndex: 2,
    top: 9,
    alignSelf: 'center',
    width: 74,
    height: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#050506',
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#EEF2F7',
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plantPot: { width: 110, height: 126, alignItems: 'center', justifyContent: 'flex-end' },
  plantLeafOne: { position: 'absolute', bottom: 58, left: 20, width: 42, height: 70, borderRadius: 40, backgroundColor: '#47A05F', transform: [{ rotate: '-32deg' }] },
  plantLeafTwo: { position: 'absolute', bottom: 70, width: 48, height: 78, borderRadius: 44, backgroundColor: '#4FB56B' },
  plantLeafThree: { position: 'absolute', bottom: 58, right: 18, width: 42, height: 70, borderRadius: 40, backgroundColor: '#3B954E', transform: [{ rotate: '32deg' }] },
  pot: { width: 76, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8EA' },
  scanCornerTopLeft: { position: 'absolute', top: 52, left: 34, width: 24, height: 24, borderLeftWidth: 3, borderTopWidth: 3, borderColor: '#FFFFFF', borderTopLeftRadius: 8 },
  scanCornerTopRight: { position: 'absolute', top: 52, right: 34, width: 24, height: 24, borderRightWidth: 3, borderTopWidth: 3, borderColor: '#FFFFFF', borderTopRightRadius: 8 },
  scanCornerBottomLeft: { position: 'absolute', bottom: 52, left: 34, width: 24, height: 24, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: '#FFFFFF', borderBottomLeftRadius: 8 },
  scanCornerBottomRight: { position: 'absolute', bottom: 52, right: 34, width: 24, height: 24, borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#FFFFFF', borderBottomRightRadius: 8 },
  phoneTabs: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.xs },
  phoneTab: { color: '#77777D', fontSize: 9, fontWeight: '700' },
  phoneTabActive: { color: colors.textInverse },
  phoneHome: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#FFFFFF', alignSelf: 'center', marginTop: spacing.xs },
  infoCard: {
    width: '94%',
    minHeight: 88,
    marginTop: -10,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.075,
    shadowRadius: 22,
    elevation: 4,
  },
  infoIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: softBlue, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { ...typography.heading3, color: colors.textPrimary },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },

  orbitScene: { height: 360, alignItems: 'center', justifyContent: 'center' },
  orbitSceneCompact: { height: 285 },
  orbitGlow: {
    position: 'absolute',
    width: 264,
    height: 264,
    borderRadius: 132,
    backgroundColor: 'rgba(24,119,242,0.075)',
    shadowColor: '#82AFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 34,
  },
  orbitRing: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BFCBEB',
  },
  orbitRingCompact: { width: 218, height: 218, borderRadius: 109 },
  orbitRingInner: {
    position: 'absolute',
    width: 204,
    height: 204,
    borderRadius: 102,
    borderWidth: 1,
    borderColor: 'rgba(124,108,208,0.16)',
  },
  orbitRingInnerCompact: { width: 168, height: 168, borderRadius: 84 },
  orbitDiamondTop: {
    position: 'absolute',
    top: 38,
    right: 82,
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#DFE9FF',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#82AFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  orbitDiamondBottom: {
    position: 'absolute',
    bottom: 42,
    left: 86,
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#EFEAFF',
    transform: [{ rotate: '45deg' }],
  },
  orbitSparkle: { position: 'absolute', top: 84, left: 64 },
  centralSnap: {
    width: 158,
    height: 158,
    borderRadius: 79,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#EEE9FF',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 10,
  },
  centralSnapCompact: { width: 132, height: 132, borderRadius: 66 },
  cameraEmblem: {
    width: 52,
    height: 42,
    marginBottom: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmblemCompact: {
    width: 48,
    height: 38,
    transform: [{ scale: 0.9 }],
  },
  cameraEmblemGlow: {
    position: 'absolute',
    width: 64,
    height: 46,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  cameraEmblemBody: {
    width: 50,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  cameraEmblemShine: {
    position: 'absolute',
    top: 2,
    left: 9,
    right: 9,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cameraTopRidge: {
    position: 'absolute',
    top: -6,
    width: 22,
    height: 10,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#F7F9FF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  cameraLensOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#050506',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
  },
  cameraLensInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: '#191921',
  },
  cameraLensCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F7F7FA',
    opacity: 0.92,
  },
  cameraLensSpark: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cameraFlash: {
    position: 'absolute',
    top: 8,
    left: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ECECF3',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cameraSideDot: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#BFC0C8',
    opacity: 0.75,
  },
  centralTitle: { ...typography.heading3, color: colors.textInverse, marginTop: 2 },
  orbitTile: {
    position: 'absolute',
    width: 92,
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 5,
  },
  orbitTileCompact: { width: 76, minHeight: 68, borderRadius: 18 },
  orbitTileText: { ...typography.captionMedium, color: colors.textPrimary, textAlign: 'center' },
  orbitTop: { top: 0 },
  orbitRightTop: { right: 0, top: 76 },
  orbitRightBottom: { right: 10, bottom: 54 },
  orbitBottom: { bottom: 0 },
  orbitLeftBottom: { left: 10, bottom: 54 },
  orbitLeftTop: { left: 0, top: 76 },
  benefitsBar: {
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  benefitItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  benefitDivider: { borderRightWidth: 1, borderRightColor: colors.border },
  benefitText: { ...typography.captionMedium, color: colors.textPrimary, textAlign: 'center' },
  quoteCard: {
    borderRadius: 22,
    minHeight: 82,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  quoteMark: { fontSize: 50, lineHeight: 50, color: '#7DA7FF', fontWeight: '800' },
  quoteText: { ...typography.body, color: colors.textPrimary, flex: 1 },
});
