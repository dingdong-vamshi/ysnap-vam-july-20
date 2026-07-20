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
import { colors } from '../../constants';
import { PremiumCTAButton } from '../../components/auth/PremiumCTAButton';

const SLIDE_COUNT = 3;
const accent = '#1877F2';
const purple = '#7C6CD0';
const softSurface = '#FAFBFF';

type FeatureCard = {
  title: string;
  detail: string;
  icon: string;
  tone: string;
  visual: string;
};

const slideTwoFeatures: FeatureCard[] = [
  {
    title: 'Text Translation',
    detail: 'Type, paste, and understand instantly.',
    icon: 'language-outline',
    tone: accent,
    visual: 'text-outline',
  },
  {
    title: 'Voice Translation',
    detail: 'Speak naturally across languages.',
    icon: 'mic-outline',
    tone: purple,
    visual: 'volume-high-outline',
  },
  {
    title: 'Camera Translation',
    detail: 'Point at signs, menus, and labels.',
    icon: 'camera-outline',
    tone: accent,
    visual: 'scan-outline',
  },
  {
    title: 'Conversation',
    detail: 'Live back-and-forth translation.',
    icon: 'chatbubbles-outline',
    tone: colors.accentGreen,
    visual: 'people-outline',
  },
  {
    title: 'AR Scan',
    detail: 'Identify objects, food, coins, and more.',
    icon: 'cube-outline',
    tone: colors.accentOrange,
    visual: 'sparkles-outline',
  },
];

const benefitItems = [
  { label: 'Private\n& Secure', icon: 'shield-checkmark-outline' },
  { label: 'Instant\nResults', icon: 'flash-outline' },
  { label: 'Accurate\nTranslation', icon: 'locate-outline' },
  { label: 'AI\nPowered', icon: 'sparkles-outline' },
];

export default function Onboarding() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const pageWidth = Math.min(width, 480);
  const isShort = height < 860;
  const isVeryShort = height < 740;
  const isNarrow = width < 375;
  const isShortLandscape = height < 520 && width > height;
  const isSmall = isShort || width < 390;
  const isTiny = isVeryShort || width < 340;
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);

  const slides = useMemo(
    () => [
      {
        lines: ['Snap.', 'Discover.', 'Understand.'],
        highlight: 1,
        body: 'See, capture, and translate the world around you instantly.',
        cta: "Let’s Get Started",
        visual: <CameraTranslationHero compact={isSmall} tiny={isTiny} landscape={isShortLandscape} />,
      },
      {
        lines: ['One Camera.', 'Unlimited', 'Translation.'],
        highlight: 1,
        body: 'Powerful AI tools to help you understand, translate, and explore.',
        cta: 'Continue',
        visual: <FeatureStack compact={isSmall} />,
      },
      {
        lines: ['Your AI', 'Vision', 'Assistant.'],
        highlight: 1,
        body: 'Point, scan, and understand anything around you.',
        cta: 'Start Exploring',
        visual: <PhoneVisionHero compact={isSmall} tiny={isTiny} landscape={isShortLandscape} />,
      },
    ],
    [isSmall, isTiny, isShortLandscape],
  );

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
        <TopNav
          canGoBack={step > 0}
          onBack={() => goToStep(step - 1)}
          onSkip={completeOnboarding}
        />

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
          {slides.map((slide, index) => (
            <View
              key={slide.cta}
              style={[
                styles.slide,
                isSmall && styles.slideCompact,
                isTiny && styles.slideTiny,
                isShortLandscape && styles.slideLandscape,
                { width: pageWidth, paddingHorizontal: isNarrow ? 22 : 28 },
              ]}
            >
              <View style={[styles.copyBlock, isSmall && styles.copyBlockCompact, isShortLandscape && styles.copyBlockLandscape]}>
                {index === 0 ? <BrandStrip /> : null}
                <DecorLayer variant={index} />
                <Headline lines={slide.lines} highlight={slide.highlight} compact={isSmall || isShortLandscape} />
                <ProgressBars activeIndex={index} compact={isSmall} />
                <Text style={[styles.bodyText, isSmall && styles.bodyTextSmall]}>{slide.body}</Text>
              </View>

              <View style={[styles.stage, isShortLandscape && styles.stageLandscape]}>
                <View
                  style={[
                    styles.visualArea,
                    index === 0 && styles.cameraVisualArea,
                    index === 2 && styles.phoneVisualArea,
                    isSmall && styles.visualAreaSmall,
                    isTiny && styles.visualAreaTiny,
                    isShortLandscape && styles.visualAreaLandscape,
                  ]}
                >
                  {slide.visual}
                </View>

                <View style={[styles.footer, isSmall && styles.footerCompact, isShortLandscape && styles.footerLandscape]}>
                  {index === 0 ? <BenefitsRow compact={isSmall || isShortLandscape} landscape={isShortLandscape} /> : null}
                  {index === 2 ? <InfoCard compact={isShortLandscape} /> : null}
                  <PremiumCTAButton title={slide.cta} onPress={handleNext} />
                </View>
              </View>
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

function TopNav({
  canGoBack,
  onBack,
  onSkip,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.topNav}>
      {canGoBack ? (
        <Pressable
          style={({ pressed }) => [styles.navCircle, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.navCircleGhost} />
      )}

      <Pressable
        style={({ pressed }) => [styles.skipPill, pressed && styles.pressed]}
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function BrandStrip() {
  return (
    <View style={styles.brandStrip}>
      <LinearGradient colors={['#2D2530', '#18121C', '#0C0B0D']} style={styles.brandMarkWrap}>
        <BrandMark size={30} variant="light" />
      </LinearGradient>
      <Text style={styles.brandText}>YSnap</Text>
    </View>
  );
}

function Headline({
  lines,
  highlight,
  compact,
}: {
  lines: string[];
  highlight: number;
  compact: boolean;
}) {
  return (
    <View style={styles.headlineWrap}>
      {lines.map((line, index) => (
        <Text
          key={line}
          style={[
            styles.headline,
            compact && styles.headlineCompact,
            index === highlight && styles.headlineAccent,
          ]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

function ProgressBars({ activeIndex, compact }: { activeIndex: number; compact: boolean }) {
  return (
    <View style={[styles.progressRow, compact && styles.progressRowCompact]} accessibilityRole="progressbar">
      {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
        <View key={index} style={[styles.progressBar, index === activeIndex && styles.progressBarActive]} />
      ))}
    </View>
  );
}

function DecorLayer({ variant }: { variant: number }) {
  return (
    <View style={[styles.decorLayer, styles.pointerNone]}>
      <View style={[styles.softGlow, variant === 1 ? styles.softGlowLeft : styles.softGlowRight]} />
      <View style={[styles.softRing, variant === 2 ? styles.softRingRight : styles.softRingLeft]} />
      <View style={[styles.diamond, styles.diamondOne]} />
      <View style={[styles.diamond, styles.diamondTwo]} />
      <Ionicons name="sparkles" size={16} color="#80AFFF" style={styles.sparkleDecor} />
    </View>
  );
}

function FloatingIcon({
  icon,
  tone,
  style,
  size = 26,
  muted = false,
}: {
  icon: string;
  tone: string;
  style: any;
  size?: number;
  muted?: boolean;
}) {
  return (
    <View style={[styles.floatingIcon, muted && styles.floatingIconMuted, style]}>
      <Ionicons name={icon as any} size={size} color={tone} />
    </View>
  );
}

function CameraTranslationHero({ compact, tiny, landscape }: { compact: boolean; tiny: boolean; landscape: boolean }) {
  return (
    <View style={[styles.cameraHero, compact && styles.cameraHeroCompact, tiny && styles.cameraHeroTiny, landscape && styles.cameraHeroLandscape]}>
      <View style={styles.cameraOrbitOuter} />
      <View style={styles.cameraOrbitInner} />
      <View style={styles.heroHalo} />
      <View style={styles.heroSparkleOne} />
      <View style={styles.heroSparkleTwo} />
      <FloatingIcon icon="mic-outline" tone={accent} style={styles.floatMic} size={compact ? 22 : 25} />
      <FloatingIcon icon="language-outline" tone={accent} style={styles.floatLanguage} size={compact ? 22 : 25} />
      {!tiny ? <FloatingIcon icon="document-text-outline" tone={colors.textPrimary} style={styles.floatDoc} size={compact ? 21 : 24} muted /> : null}
      <FloatingIcon icon="chatbubbles-outline" tone={purple} style={styles.floatChat} size={compact ? 22 : 25} />
      <FloatingIcon icon="scan-outline" tone={colors.accentGreen} style={styles.floatScan} size={compact ? 22 : 25} />

      <View style={styles.cameraPlatform}>
        <View style={styles.cameraCastShadow} />
        <LinearGradient colors={['#FFFFFF', '#F7F8FC', '#ECEEF5']} style={styles.cameraBody}>
          <View style={styles.cameraBodyHighlight} />
          <View style={styles.cameraTop} />
          <View style={styles.cameraTopButton} />
          <View style={styles.cameraShutter} />
          <View style={styles.cameraGripLeft} />
          <View style={styles.cameraGripRight} />
          <LinearGradient colors={['#101116', '#292B35']} style={styles.lensOuter}>
            <View style={styles.lensChromeRing} />
            <LinearGradient colors={['#11131A', '#252A3A', '#050609']} style={styles.lensMiddle}>
              <View style={styles.lensBlueRing} />
              <LinearGradient colors={['#74BAFF', '#1B5FFF', '#0B1638']} style={styles.lensCore}>
                <View style={styles.lensCatchLightLarge} />
                <View style={styles.lensCatchLightSmall} />
              </LinearGradient>
            </LinearGradient>
          </LinearGradient>
        </LinearGradient>
      </View>
    </View>
  );
}

function BenefitsRow({ compact, landscape = false }: { compact: boolean; landscape?: boolean }) {
  return (
    <View style={[styles.benefitsRow, compact && styles.benefitsRowCompact, landscape && styles.benefitsRowLandscape]}>
      {benefitItems.map((item) => (
        <View key={item.label} style={styles.benefitItem}>
          <Ionicons name={item.icon as any} size={compact ? 19 : 21} color={item.label.includes('Secure') ? colors.textPrimary : accent} />
          <Text style={[styles.benefitLabel, compact && styles.benefitLabelSmall, landscape && styles.benefitLabelLandscape]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function FeatureStack({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.featureStack, compact && styles.featureStackCompact]}>
      {slideTwoFeatures.map((feature) => (
        <View key={feature.title} style={[styles.featureCard, compact && styles.featureCardCompact]}>
          <View style={[styles.featureIcon, { backgroundColor: `${feature.tone}12` }]}>
            <Ionicons name={feature.icon as any} size={compact ? 23 : 25} color={feature.tone} />
          </View>
          <View style={styles.featureCopy}>
            <Text style={[styles.featureTitle, compact && styles.featureTitleCompact]}>{feature.title}</Text>
            <Text style={[styles.featureDetail, compact && styles.featureDetailCompact]}>{feature.detail}</Text>
          </View>
          <View style={[styles.featureVisual, { backgroundColor: `${feature.tone}0F` }]}>
            <Ionicons name={feature.visual as any} size={compact ? 27 : 32} color={feature.tone} />
          </View>
          <Ionicons name="chevron-forward" size={21} color={colors.textSubtle} />
        </View>
      ))}
    </View>
  );
}

function PhoneVisionHero({ compact, tiny, landscape }: { compact: boolean; tiny: boolean; landscape: boolean }) {
  return (
    <View style={[styles.phoneHero, compact && styles.phoneHeroCompact, tiny && styles.phoneHeroTiny, landscape && styles.phoneHeroLandscape]}>
      <View style={styles.phoneOrbit} />
      <FloatingIcon icon="language-outline" tone={accent} style={styles.phoneLang} size={24} />
      <FloatingIcon icon="leaf-outline" tone={colors.accentGreen} style={styles.phoneLeaf} size={25} />
      <FloatingIcon icon="calculator-outline" tone={purple} style={styles.phoneMath} size={25} />
      {!tiny ? <FloatingIcon icon="globe-outline" tone={colors.textPrimary} style={styles.phoneGlobe} size={26} /> : null}
      <FloatingIcon icon="document-text-outline" tone={colors.accentOrange} style={styles.phonePaper} size={23} />

      <View style={styles.phoneTilt}>
        <View style={styles.phoneNotch} />
        <View style={styles.phoneScreen}>
          <View style={styles.focusTopLeft} />
          <View style={styles.focusTopRight} />
          <View style={styles.focusBottomLeft} />
          <View style={styles.focusBottomRight} />
          <View style={styles.previewObject}>
            <View style={styles.plantStemPrimary} />
            <View style={styles.plantStemLeft} />
            <View style={styles.plantStemRight} />
            <LinearGradient colors={['#6ED47F', '#2F9048']} style={[styles.realLeaf, styles.realLeafOne]} />
            <LinearGradient colors={['#75DA87', '#379D51']} style={[styles.realLeaf, styles.realLeafTwo]} />
            <LinearGradient colors={['#5DCB71', '#267B3C']} style={[styles.realLeaf, styles.realLeafThree]} />
            <LinearGradient colors={['#84E094', '#3AA456']} style={[styles.realLeafSmall, styles.realLeafFour]} />
            <LinearGradient colors={['#7ADC8C', '#348F4D']} style={[styles.realLeafSmall, styles.realLeafFive]} />
            <LinearGradient colors={['#FFFFFF', '#EEF0F3']} style={styles.previewPot}>
              <View style={styles.previewPotLip} />
              <View style={styles.previewPotShadow} />
            </LinearGradient>
          </View>
          <View style={styles.translationBubble}>
            <Text style={styles.translationBubbleText}>Translate</Text>
          </View>
        </View>
        <View style={styles.phoneModeBar}>
          <Text style={styles.phoneMode}>SCAN</Text>
          <Text style={[styles.phoneMode, styles.phoneModeActive]}>SOLVE</Text>
          <Text style={styles.phoneMode}>TRANSLATE</Text>
        </View>
        <View style={styles.phoneHome} />
      </View>
    </View>
  );
}

function InfoCard({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.infoCard, compact && styles.infoCardCompact]}>
      <View style={[styles.infoIcon, compact && styles.infoIconCompact]}>
        <Ionicons name="sparkles" size={compact ? 19 : 26} color={accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoTitle, compact && styles.infoTitleCompact]}>Smart. Fast. Reliable.</Text>
        <Text style={[styles.infoText, compact && styles.infoTextCompact]}>Translate and understand the world from your pocket.</Text>
      </View>
    </View>
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
    backgroundColor: '#FEFEFF',
  },
  topNav: {
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 8,
  },
  navCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
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
  navCircleGhost: {
    width: 54,
    height: 54,
  },
  skipPill: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
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
  skipText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    paddingBottom: 14,
  },
  slideCompact: {
    paddingBottom: 10,
  },
  slideTiny: {
    paddingBottom: 8,
  },
  slideLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    paddingBottom: 8,
  },
  copyBlock: {
    position: 'relative',
    paddingTop: 4,
  },
  copyBlockCompact: {
    paddingTop: 0,
  },
  copyBlockLandscape: {
    width: '42%',
    alignSelf: 'center',
  },
  brandStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  brandMarkWrap: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5,
  },
  brandText: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  headlineWrap: {
    marginTop: 2,
  },
  headline: {
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.05,
    color: colors.textPrimary,
  },
  headlineCompact: {
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.7,
  },
  headlineAccent: {
    color: accent,
    textShadowColor: 'rgba(24,119,242,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    marginBottom: 24,
  },
  progressRowCompact: {
    marginTop: 14,
    marginBottom: 16,
  },
  progressBar: {
    width: 42,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#DFE0E4',
  },
  progressBarActive: {
    backgroundColor: accent,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '500',
    color: '#62636A',
    letterSpacing: -0.15,
    maxWidth: 340,
  },
  bodyTextSmall: {
    fontSize: 14,
    lineHeight: 22,
  },
  stage: {
    flex: 1,
    minHeight: 0,
  },
  stageLandscape: {
    justifyContent: 'center',
  },
  visualArea: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  cameraVisualArea: {
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  phoneVisualArea: {
    justifyContent: 'center',
    paddingTop: 10,
  },
  visualAreaSmall: {
    flex: 0.78,
  },
  visualAreaTiny: {
    flex: 0.64,
    paddingTop: 4,
  },
  visualAreaLandscape: {
    flex: 0,
    minHeight: 142,
    paddingTop: 0,
    justifyContent: 'center',
  },
  footer: {
    gap: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  footerCompact: {
    gap: 10,
  },
  footerLandscape: {
    gap: 6,
    paddingBottom: 0,
  },
  pressed: {
    opacity: 0.66,
    transform: [{ scale: 0.98 }],
  },

  decorLayer: {
    position: 'absolute',
    top: -30,
    left: -28,
    right: -28,
    height: 170,
  },
  pointerNone: {
    pointerEvents: 'none',
  },
  softGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(24,119,242,0.07)',
  },
  softGlowRight: { right: -72, top: 18 },
  softGlowLeft: { left: -80, top: 12, backgroundColor: 'rgba(124,108,208,0.065)' },
  softRing: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: 'rgba(124,108,208,0.12)',
  },
  softRingLeft: { left: -8, top: 96 },
  softRingRight: { right: 20, top: 96 },
  diamond: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#E2ECFF',
    transform: [{ rotate: '45deg' }],
  },
  diamondOne: { right: 46, top: 42 },
  diamondTwo: { left: 96, top: 106, width: 7, height: 7, backgroundColor: '#F0EBFF' },
  sparkleDecor: { position: 'absolute', right: 12, top: 98 },

  floatingIcon: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  floatingIconMuted: {
    opacity: 0.86,
    transform: [{ scale: 0.92 }],
  },
  cameraHero: {
    minHeight: 336,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cameraHeroCompact: {
    minHeight: 244,
    transform: [{ scale: 0.84 }],
  },
  cameraHeroTiny: {
    minHeight: 214,
    transform: [{ scale: 0.74 }],
  },
  cameraHeroLandscape: {
    minHeight: 142,
    transform: [{ scale: 0.5 }],
  },
  cameraOrbitOuter: {
    position: 'absolute',
    bottom: 18,
    width: '82%',
    height: 230,
    borderRadius: 150,
    borderWidth: 1.5,
    borderColor: 'rgba(24,119,242,0.12)',
    transform: [{ rotate: '-7deg' }],
  },
  cameraOrbitInner: {
    position: 'absolute',
    bottom: 48,
    width: '66%',
    height: 160,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(124,108,208,0.12)',
    transform: [{ rotate: '8deg' }],
  },
  heroHalo: {
    position: 'absolute',
    bottom: 2,
    width: '86%',
    maxWidth: 320,
    height: 178,
    borderRadius: 140,
    backgroundColor: 'rgba(24,119,242,0.08)',
  },
  heroSparkleOne: {
    position: 'absolute',
    top: 72,
    right: '21%',
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#D9E6FF',
    transform: [{ rotate: '45deg' }],
  },
  heroSparkleTwo: {
    position: 'absolute',
    top: 138,
    left: '21%',
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#EFEAFF',
    transform: [{ rotate: '45deg' }],
  },
  floatMic: { top: '2%', left: '44%', transform: [{ rotate: '4deg' }] },
  floatLanguage: { top: '23%', right: '8%', transform: [{ rotate: '10deg' }] },
  floatDoc: { top: '49%', right: '4%', transform: [{ rotate: '9deg' }] },
  floatChat: { top: '43%', left: '7%', transform: [{ rotate: '-10deg' }] },
  floatScan: { top: '23%', left: '25%', transform: [{ rotate: '7deg' }] },
  cameraPlatform: {
    width: '92%',
    maxWidth: 360,
    height: 112,
    borderRadius: 80,
    backgroundColor: '#F0F2F7',
    borderWidth: 1,
    borderColor: '#E4E6EF',
    alignItems: 'center',
    justifyContent: 'flex-end',
    shadowColor: '#8AAAF4',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  cameraCastShadow: {
    position: 'absolute',
    bottom: 38,
    width: 230,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(10,11,18,0.16)',
    transform: [{ scaleX: 1.08 }],
  },
  cameraBody: {
    width: 252,
    height: 138,
    marginBottom: 30,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E7E8EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
  cameraBodyHighlight: {
    position: 'absolute',
    top: 9,
    left: 22,
    right: 22,
    height: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  cameraTop: {
    position: 'absolute',
    top: -14,
    width: 78,
    height: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E8EE',
  },
  cameraTopButton: {
    position: 'absolute',
    top: -25,
    left: 58,
    width: 38,
    height: 11,
    borderRadius: 7,
    backgroundColor: '#20222A',
  },
  cameraShutter: {
    position: 'absolute',
    top: 16,
    right: 48,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16171D',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
  },
  cameraGripLeft: {
    position: 'absolute',
    left: 18,
    top: 26,
    width: 48,
    height: 78,
    borderRadius: 15,
    backgroundColor: '#15161C',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  cameraGripRight: {
    position: 'absolute',
    right: 18,
    top: 26,
    width: 48,
    height: 78,
    borderRadius: 15,
    backgroundColor: '#15161C',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  lensOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 7,
    borderColor: '#333643',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  lensChromeRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  lensMiddle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensBlueRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: accent,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  lensCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
  },
  lensCatchLightLarge: {
    position: 'absolute',
    top: 8,
    left: 9,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  lensCatchLightSmall: {
    position: 'absolute',
    right: 8,
    bottom: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  benefitsRowCompact: {
    marginTop: -8,
  },
  benefitsRowLandscape: {
    marginTop: 0,
  },
  benefitItem: {
    width: '24%',
    alignItems: 'center',
    gap: 7,
  },
  benefitLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  benefitLabelSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
  benefitLabelLandscape: {
    fontSize: 9,
    lineHeight: 12,
  },

  featureStack: {
    gap: 12,
    paddingTop: 4,
  },
  featureStackCompact: {
    gap: 8,
  },
  featureCard: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.075,
    shadowRadius: 24,
    elevation: 4,
  },
  featureCardCompact: {
    minHeight: 67,
    borderRadius: 21,
    paddingHorizontal: 12,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureCopy: { flex: 1 },
  featureTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  featureTitleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  featureDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#666871',
    marginTop: 1,
  },
  featureDetailCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  featureVisual: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 2,
  },

  phoneHero: {
    minHeight: 370,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneHeroCompact: {
    minHeight: 278,
    transform: [{ scale: 0.82 }],
  },
  phoneHeroTiny: {
    minHeight: 232,
    transform: [{ scale: 0.7 }],
  },
  phoneHeroLandscape: {
    minHeight: 142,
    transform: [{ scale: 0.48 }],
  },
  phoneOrbit: {
    position: 'absolute',
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1.5,
    borderColor: 'rgba(24,119,242,0.13)',
    backgroundColor: 'rgba(24,119,242,0.045)',
  },
  phoneLang: { left: 18, top: 70, transform: [{ rotate: '-10deg' }] },
  phoneLeaf: { right: '7%', top: '11%', transform: [{ rotate: '12deg' }, { scale: 0.96 }] },
  phoneMath: { right: '5%', bottom: '24%', transform: [{ rotate: '10deg' }, { scale: 0.92 }] },
  phoneGlobe: { right: '24%', bottom: '2%', transform: [{ scale: 0.9 }] },
  phonePaper: { left: '12%', bottom: '16%', transform: [{ rotate: '-8deg' }, { scale: 0.9 }] },
  phoneTilt: {
    width: 200,
    height: 292,
    borderRadius: 34,
    backgroundColor: '#111114',
    padding: 7,
    transform: [{ rotate: '9deg' }],
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
  },
  phoneNotch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 2,
    width: 70,
    height: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#050506',
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#EEF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewObject: {
    width: 118,
    height: 138,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  plantStemPrimary: {
    position: 'absolute',
    bottom: 48,
    width: 4,
    height: 78,
    borderRadius: 4,
    backgroundColor: '#3C8B47',
  },
  plantStemLeft: {
    position: 'absolute',
    bottom: 56,
    left: 48,
    width: 3,
    height: 58,
    borderRadius: 3,
    backgroundColor: '#3F944D',
    transform: [{ rotate: '-26deg' }],
  },
  plantStemRight: {
    position: 'absolute',
    bottom: 56,
    right: 48,
    width: 3,
    height: 58,
    borderRadius: 3,
    backgroundColor: '#3F944D',
    transform: [{ rotate: '26deg' }],
  },
  realLeaf: {
    position: 'absolute',
    width: 40,
    height: 70,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 34,
    borderWidth: 0.7,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#1C5E31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  realLeafSmall: {
    position: 'absolute',
    width: 32,
    height: 56,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 28,
    borderWidth: 0.7,
    borderColor: 'rgba(255,255,255,0.24)',
    shadowColor: '#1C5E31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 7,
  },
  realLeafOne: {
    bottom: 58,
    left: 26,
    transform: [{ rotate: '-43deg' }],
  },
  realLeafTwo: {
    bottom: 72,
    left: 43,
    transform: [{ rotate: '-10deg' }],
  },
  realLeafThree: {
    bottom: 58,
    right: 24,
    transform: [{ rotate: '38deg' }, { scaleX: -1 }],
  },
  realLeafFour: {
    bottom: 92,
    left: 33,
    transform: [{ rotate: '-28deg' }, { scale: 0.9 }],
  },
  realLeafFive: {
    bottom: 88,
    right: 33,
    transform: [{ rotate: '26deg' }, { scaleX: -1 }, { scale: 0.9 }],
  },
  previewPot: {
    width: 72,
    height: 52,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: '#DEE1E7',
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  previewPotLip: {
    height: 10,
    borderRadius: 999,
    marginHorizontal: 7,
    marginTop: 6,
    backgroundColor: 'rgba(210,214,222,0.65)',
  },
  previewPotShadow: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    width: 58,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(177,184,196,0.34)',
  },
  translationBubble: {
    position: 'absolute',
    top: 34,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E4E6EC',
  },
  translationBubbleText: {
    fontSize: 10,
    fontWeight: '800',
    color: accent,
  },
  focusTopLeft: {
    position: 'absolute',
    top: 70,
    left: 28,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 8,
  },
  focusTopRight: {
    position: 'absolute',
    top: 70,
    right: 28,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 8,
  },
  focusBottomLeft: {
    position: 'absolute',
    bottom: 62,
    left: 28,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
  },
  focusBottomRight: {
    position: 'absolute',
    bottom: 62,
    right: 28,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 8,
  },
  phoneModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 7,
    paddingHorizontal: 5,
  },
  phoneMode: {
    fontSize: 8,
    fontWeight: '800',
    color: '#77777D',
  },
  phoneModeActive: {
    color: '#FFFFFF',
  },
  phoneHome: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignSelf: 'center',
    marginTop: 7,
  },
  infoCard: {
    minHeight: 84,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    shadowColor: '#0D0E12',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.075,
    shadowRadius: 22,
    elevation: 4,
  },
  infoCardCompact: {
    minHeight: 58,
    borderRadius: 18,
    padding: 8,
    gap: 9,
  },
  infoIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: softSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  infoCopy: { flex: 1 },
  infoTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  infoTitleCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  infoText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: '#62636A',
  },
  infoTextCompact: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 12,
  },
});
