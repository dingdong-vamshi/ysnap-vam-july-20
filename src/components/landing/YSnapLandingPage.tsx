import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '../';
import { colors, shadows, spacing } from '../../constants';

const CANONICAL_URL = process.env.EXPO_PUBLIC_APP_URL || '';

const showcaseImages = {
  onboardingLive: require('../../../assets/landing/onboarding-live.jpg'),
  signInLive: require('../../../assets/landing/sign-in-live.jpg'),
  signUpLive: require('../../../assets/landing/sign-up-live.jpg'),
  textTranslation: require('../../../assets/landing/product/text-translation.png'),
  voiceTranslation: require('../../../assets/landing/product/voice-translation.png'),
  voiceChanger: require('../../../assets/landing/product/voice-changer.png'),
  onboardingTwo: require('../../../assets/onboarding/final-slide-2.png'),
  onboardingThree: require('../../../assets/onboarding/final-slide-3.png'),
};

const navItems = [
  { label: 'Features', target: 'features' },
  { label: 'Use Cases', target: 'use-cases' },
  { label: 'How It Works', target: 'how-it-works' },
  { label: 'FAQ', target: 'faq' },
] as const;

const useCases = [
  {
    eyebrow: 'Translate',
    title: 'Understand text around you',
    body: 'Type text, switch languages, and get a clear translation with guidance and alternatives.',
    icon: 'language-outline' as const,
    color: '#1877F2',
  },
  {
    eyebrow: 'Speak',
    title: 'Translate voice naturally',
    body: 'Capture speech, review recent translations, and keep listen/download actions close.',
    icon: 'volume-high-outline' as const,
    color: colors.accentPurple,
  },
  {
    eyebrow: 'Personalize',
    title: 'Shape spoken output',
    body: 'Choose voice profiles so speech-to-speech output can feel more natural and useful.',
    icon: 'mic-outline' as const,
    color: colors.accentGreen,
  },
] as const;

const productScreens = [
  {
    image: showcaseImages.textTranslation,
    label: 'YSnap text translation screen showing English to Spanish translation with context guidance',
    title: 'Translate what you read.',
    body: 'Type or scan text, switch languages, and get a clear translation with helpful context and alternatives.',
    icon: 'language-outline' as const,
  },
  {
    image: showcaseImages.voiceTranslation,
    label: 'YSnap voice translator screen showing English to Spanish ready-to-record interface and recent translation',
    title: 'Speak naturally.',
    body: 'Use voice translation to capture speech, review the result, and keep recent translations accessible.',
    icon: 'mic-outline' as const,
  },
  {
    image: showcaseImages.voiceChanger,
    label: 'YSnap speech voice changer screen showing target voice model selection',
    title: 'Give your voice a new style.',
    body: 'Choose from multiple voice profiles and personalize how spoken output feels.',
    icon: 'options-outline' as const,
  },
] as const;

const capabilities = [
  {
    title: 'Translation',
    items: ['Text translation', 'Voice translation', 'Camera translation', 'Conversation mode'],
    icon: 'language-outline' as const,
  },
  {
    title: 'Visual understanding',
    items: ['Text OCR', 'Nutrition estimates', 'Menu assistance', 'AR Scan modes'],
    icon: 'camera-outline' as const,
  },
  {
    title: 'Voice tools',
    items: ['Translated audio', 'Playback speed', 'Voice library', 'Voice clone where available'],
    icon: 'mic-outline' as const,
  },
  {
    title: 'Personal tools',
    items: ['History', 'Bookmarks', 'Save and download', 'Calorie tracker'],
    icon: 'bookmarks-outline' as const,
  },
] as const;

const cameraModes = [
  { label: 'Text', detail: 'Capture visible text and translate it.', icon: 'text-outline' as const },
  { label: 'Nutrition', detail: 'Estimate meal nutrition from a food photo.', icon: 'nutrition-outline' as const },
  { label: 'Menu', detail: 'Read menus and make choices easier.', icon: 'restaurant-outline' as const },
  { label: 'AR Scan', detail: 'Choose a focused scan mode before capture.', icon: 'cube-outline' as const },
] as const;

const arModes = ['Health / Skin', 'Coin', 'Rock', 'Plant', 'Essay'] as const;

const faqs = [
  {
    question: 'What is YSnap?',
    answer: 'YSnap is an Expo-based mobile and web app for translation, camera scanning, voice tools, history, and visual-assistance workflows.',
  },
  {
    question: 'Can I use YSnap without creating an account?',
    answer: 'The app includes guest access flow, but availability depends on the configured Supabase project settings. If guest access is unavailable, you can sign in or create an account.',
  },
  {
    question: 'What can the camera understand?',
    answer: 'The current camera experience includes text, food/nutrition, menu, and AR Scan flows. AR Scan includes Health / Skin, Coin, Rock, Plant, and Essay modes.',
  },
  {
    question: 'Does YSnap support voice translation?',
    answer: 'Yes. The app includes voice translation, translated audio playback, playback-speed settings, and related voice tools.',
  },
  {
    question: 'Can I save or download results?',
    answer: 'Text translation history includes save, delete, and download actions when translated text is available.',
  },
  {
    question: 'Is YSnap a medical diagnosis tool?',
    answer: 'No. Visual health or skin results should be treated as informational guidance only and should not replace professional medical advice.',
  },
  {
    question: 'Can YSnap estimate calories from a photo?',
    answer: 'The calorie tracker is designed to analyze food photos through a backend analysis flow and return nutrition estimates such as calories and macros.',
  },
  {
    question: 'Are image-analysis results always accurate?',
    answer: 'No. Results can be uncertain or incomplete. Verify important medical, nutritional, financial, safety, or legal information before relying on it.',
  },
  {
    question: 'What devices can run YSnap?',
    answer: 'YSnap is built with Expo SDK 57 and React Native Web, so it supports mobile app targets and a static-export web deployment.',
  },
] as const;

export function YSnapLandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMode, setActiveMode] = useState(3);
  const [openFaq, setOpenFaq] = useState(0);
  const isMobile = width < 760;

  useLandingMetadata();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const updateScroll = () => setScrolled(window.scrollY > 14);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  const featurePreview = useMemo(() => cameraModes[activeMode], [activeMode]);

  const goToApp = () => router.push('/app');
  const goToSignUp = () => router.push('/(auth)/sign-up');
  const goToAnchor = (target: string) => {
    setMenuOpen(false);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById(target)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <LandingHeader
        scrolled={scrolled}
        menuOpen={menuOpen}
        isMobile={isMobile}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        onAnchor={goToAnchor}
        onOpenApp={goToApp}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HeroSection onPrimary={goToApp} onSecondary={() => goToAnchor('features')} />
        <ProductShowcase />
        <ProductStorySection />
        <UseCasesSection />
        <CapabilitiesSection />
        <HowItWorksSection />
        <CameraModesSection
          activeMode={activeMode}
          featurePreview={featurePreview}
          onSelectMode={setActiveMode}
        />
        <UsageGuideSection onSignUp={goToSignUp} />
        <TrustSection />
        <FAQSection openFaq={openFaq} onToggle={setOpenFaq} />
        <FinalCTA onPrimary={goToApp} onSecondary={() => goToAnchor('features')} />
        <LandingFooter onAnchor={goToAnchor} />
      </ScrollView>
    </View>
  );
}

function useLandingMetadata() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const title = 'YSnap — See, Translate and Understand More';
    const description = 'YSnap helps you translate text and conversations, understand images, scan everyday objects and explore useful information from one intelligent app.';
    document.title = title;

    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!element) {
        element = selector.startsWith('link') ? document.createElement('link') : document.createElement('meta');
        Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
        document.head.appendChild(element);
        return;
      }
      Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#FFFFFF' });

    if (CANONICAL_URL) {
      setMeta('link[rel="canonical"]', { rel: 'canonical', href: CANONICAL_URL });
    }
  }, []);
}

function prefersReducedMotion() {
  return Platform.OS === 'web'
    && typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function LandingHeader({
  scrolled,
  menuOpen,
  isMobile,
  onToggleMenu,
  onAnchor,
  onOpenApp,
}: {
  scrolled: boolean;
  menuOpen: boolean;
  isMobile: boolean;
  onToggleMenu: () => void;
  onAnchor: (target: string) => void;
  onOpenApp: () => void;
}) {
  return (
    <View style={[styles.headerShell, scrolled && styles.headerShellScrolled]}>
      <View style={styles.header}>
        <Pressable
          style={styles.brandButton}
          accessibilityRole="link"
          accessibilityLabel="YSnap home"
          onPress={() => onAnchor('top')}
        >
          <LandingBrandLockup size={42} />
        </Pressable>

        {isMobile ? (
          <Pressable
            style={styles.menuButton}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            accessibilityState={{ expanded: menuOpen }}
            onPress={onToggleMenu}
          >
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.desktopNav}>
            {navItems.map((item) => (
              <Pressable key={item.target} style={styles.navLink} accessibilityRole="link" onPress={() => onAnchor(item.target)}>
                <Text style={styles.navLinkText}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.navCta} accessibilityRole="link" onPress={onOpenApp}>
              <Text style={styles.navCtaText}>Open App</Text>
            </Pressable>
          </View>
        )}
      </View>

      {isMobile && menuOpen ? (
        <View style={styles.mobileMenu}>
          {navItems.map((item) => (
            <Pressable key={item.target} style={styles.mobileNavLink} accessibilityRole="link" onPress={() => onAnchor(item.target)}>
              <Text style={styles.mobileNavText}>{item.label}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
          <Pressable style={styles.mobileMenuCta} accessibilityRole="link" onPress={onOpenApp}>
            <Text style={styles.mobileMenuCtaText}>Open YSnap</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function HeroSection({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const mobile = width < 760;

  return (
    <View nativeID="top" style={[styles.section, styles.heroSection, stacked && styles.heroSectionStacked, mobile && styles.sectionMobile]}>
      <View style={styles.heroCopy}>
        <View style={styles.trustPill}>
          <Ionicons name="sparkles-outline" size={16} color="#1877F2" />
          <Text style={styles.trustPillText}>Built for everyday understanding</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.h1, stacked && styles.h1Tablet, mobile && styles.h1Mobile]}>
          See it. Hear it. Understand it.
        </Text>
        <Text style={[styles.heroSubtitle, mobile && styles.heroSubtitleMobile]}>
          Translate conversations, understand images, scan everyday objects, and get useful answers from one intelligent camera.
        </Text>
        <View style={[styles.heroActions, mobile && styles.heroActionsMobile]}>
          <PrimaryLandingButton label="Open YSnap" onPress={onPrimary} />
          <SecondaryLandingButton label="Explore features" onPress={onSecondary} icon="arrow-down-outline" />
        </View>
      </View>

      <View style={[styles.heroVisual, stacked && styles.heroVisualStacked, mobile && styles.heroVisualMobile]}>
        <View style={styles.heroGlow} />
        <PhoneFrame image={showcaseImages.voiceTranslation} label="YSnap voice translator screen showing English to Spanish voice translation" priority />
        {!mobile ? <View style={styles.heroFloatingCard}>
          <Ionicons name="language-outline" size={22} color="#1877F2" />
          <Text style={styles.heroFloatingTitle}>Text translation</Text>
          <Text style={styles.heroFloatingText}>Context, alternatives, and playback.</Text>
        </View> : null}
        {!mobile ? <View style={[styles.heroFloatingCard, styles.heroFloatingCardRight]}>
          <Ionicons name="mic-outline" size={22} color={colors.accentGreen} />
          <Text style={styles.heroFloatingTitle}>Voice tools</Text>
          <Text style={styles.heroFloatingText}>Speak, listen, and personalize.</Text>
        </View> : null}
      </View>
    </View>
  );
}

function ProductShowcase() {
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const mobile = width < 760;

  return (
    <View nativeID="features" style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="Product"
        title="A real mobile workspace for translation and voice."
        body="Approved in-app product screens show how YSnap handles text, voice translation, and speech personalization without overcrowding the experience."
      />
      <View style={[styles.showcaseGrid, stacked && styles.showcaseGridStacked]}>
        <View style={[styles.showcasePrimary, mobile && styles.showcasePrimaryMobile]}>
          <View style={styles.showcaseGlow} />
          <View style={[styles.layeredScreens, mobile && styles.layeredScreensMobile]}>
            <View style={[styles.layeredPhone, styles.layeredPhoneLeft, mobile && styles.layeredPhoneHidden]}>
              <PhoneFrame image={showcaseImages.textTranslation} label="YSnap text translation product screen" compact />
            </View>
            <View style={styles.layeredPhoneMain}>
              <PhoneFrame image={showcaseImages.voiceTranslation} label="YSnap voice translator product screen" />
            </View>
            <View style={[styles.layeredPhone, styles.layeredPhoneRight, mobile && styles.layeredPhoneHidden]}>
              <PhoneFrame image={showcaseImages.voiceChanger} label="YSnap speech voice changer product screen" compact />
            </View>
          </View>
          <View style={[styles.annotationCard, mobile && styles.annotationCardMobile]}>
            <Text style={styles.annotationTitle}>Product screens, front and center</Text>
            <Text style={styles.annotationText}>Text translation, voice translation, and voice changer are shown using the approved mobile screenshots.</Text>
          </View>
        </View>
        <View style={styles.showcaseStack}>
          <FeatureStory
            icon="language-outline"
            title="Translate with context"
            body="The text flow shows language switching, translation output, guidance, playback, and alternatives."
          />
          <FeatureStory
            icon="mic-outline"
            title="Voice translation feels immediate"
            body="The voice screen keeps the recording action, language pair, and recent translation visible."
          />
          <FeatureStory
            icon="options-outline"
            title="Voice personalization is clear"
            body="The voice changer screen makes profile selection easy to understand at a glance."
          />
        </View>
      </View>
    </View>
  );
}

function ProductStorySection() {
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const mobile = width < 760;

  return (
    <View style={[styles.section, styles.productStorySection, mobile && styles.sectionMobile]}>
      {productScreens.map((screen, index) => {
        const reverse = index % 2 === 1 && !stacked;
        return (
          <View key={screen.title} style={[styles.productStoryBlock, stacked && styles.productStoryBlockStacked, reverse && styles.productStoryBlockReverse]}>
            <View style={styles.productStoryCopy}>
              <View style={styles.productStoryIcon}>
                <Ionicons name={screen.icon} size={22} color="#1877F2" />
              </View>
              <Text accessibilityRole="header" style={[styles.productStoryTitle, mobile && styles.productStoryTitleMobile]}>{screen.title}</Text>
              <Text style={styles.productStoryBody}>{screen.body}</Text>
            </View>
            <View style={[styles.productStoryVisual, mobile && styles.productStoryVisualMobile]}>
              <View style={styles.productStoryGlow} />
              <PhoneFrame image={screen.image} label={screen.label} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function UseCasesSection() {
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const mobile = width < 760;

  return (
    <View nativeID="use-cases" style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="Use cases"
        title="Designed around real tasks, not a feature checklist."
        body="Each flow starts from something familiar: typing, speaking, uploading, or opening the camera."
      />
      <View style={[styles.useCaseLayout, stacked && styles.useCaseLayoutStacked]}>
        {useCases.map((item, index) => (
          <View key={item.title} style={[styles.useCaseCard, index === 1 && !stacked && styles.useCaseCardRaised]}>
            <View style={[styles.useCaseIcon, { backgroundColor: `${item.color}14` }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.useCaseEyebrow}>{item.eyebrow}</Text>
            <Text style={styles.useCaseTitle}>{item.title}</Text>
            <Text style={styles.useCaseBody}>{item.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CapabilitiesSection() {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="Capabilities"
        title="A focused toolkit for translation, voice, camera, and personal history."
        body="The landing page only describes features present in the current repository and avoids unsupported claims."
      />
      <View style={styles.capabilityGrid}>
        {capabilities.map((item) => (
          <View key={item.title} style={[styles.capabilityCard, mobile && styles.capabilityCardMobile]}>
            <View style={styles.capabilityHeader}>
              <View style={styles.capabilityIcon}>
                <Ionicons name={item.icon} size={22} color="#1877F2" />
              </View>
              <Text style={styles.capabilityTitle}>{item.title}</Text>
            </View>
            {item.items.map((capability) => (
              <View key={capability} style={styles.capabilityItem}>
                <Ionicons name="checkmark-circle" size={17} color={colors.accentGreen} />
                <Text style={styles.capabilityText}>{capability}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function HowItWorksSection() {
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const mobile = width < 760;
  const steps = [
    ['Capture or speak', 'Take a photo, upload an image, enter text, or record speech.'],
    ['YSnap understands', 'The app processes the content according to the selected feature.'],
    ['Review the result', 'Read, listen, save, download, replay, or continue exploring.'],
  ] as const;

  return (
    <View nativeID="how-it-works" style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="How it works"
        title="Simple inputs. Useful outputs."
        body="The core flow stays predictable across translation and camera features."
      />
      <View style={[styles.stepsRail, stacked && styles.stepsRailStacked]}>
        {steps.map(([title, body], index) => (
          <View key={title} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepBody}>{body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CameraModesSection({
  activeMode,
  featurePreview,
  onSelectMode,
}: {
  activeMode: number;
  featurePreview: (typeof cameraModes)[number];
  onSelectMode: (index: number) => void;
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View style={[styles.section, styles.cameraSection, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="One camera"
        title="Choose the right mode before you capture."
        body="Text, Nutrition, Menu, and AR Scan flows stay visible and focused, with AR Scan offering its own mode choices."
      />
      <View style={styles.cameraModePanel}>
        <View style={styles.modeChips} accessibilityRole="tablist">
          {cameraModes.map((mode, index) => {
            const selected = index === activeMode;
            return (
              <Pressable
                key={mode.label}
                style={[styles.modeChip, selected && styles.modeChipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onSelectMode(index)}
              >
                <Ionicons name={mode.icon} size={18} color={selected ? colors.textInverse : colors.textPrimary} />
                <Text style={[styles.modeChipText, selected && styles.modeChipTextActive]}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.modePreview, mobile && styles.modePreviewMobile]}>
          <View style={styles.modePreviewIcon}>
            <Ionicons name={featurePreview.icon} size={34} color="#1877F2" />
          </View>
          <View style={styles.modePreviewCopy}>
            <Text style={styles.modePreviewTitle}>{featurePreview.label}</Text>
            <Text style={styles.modePreviewText}>{featurePreview.detail}</Text>
          </View>
        </View>
        <View style={styles.arModeRail}>
          {arModes.map((mode) => (
            <View key={mode} style={styles.arModePill}>
              <Text style={styles.arModeText}>{mode}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function UsageGuideSection({ onSignUp }: { onSignUp: () => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const guide = [
    'Start as a guest when available, or create an account.',
    'Select translation, camera, conversation, audio, or calorie tracking.',
    'Capture, upload, type, or speak depending on the feature.',
    'Review the result, then save, replay, or download where supported.',
  ];

  return (
    <View style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="First time"
        title="How to use YSnap"
        body="The product is built to keep the next action obvious, even when the underlying feature is powerful."
      />
      <View style={styles.guideCard}>
        {guide.map((item, index) => (
          <View key={item} style={styles.guideItem}>
            <View style={styles.guideBullet}>
              <Text style={styles.guideBulletText}>{index + 1}</Text>
            </View>
            <Text style={styles.guideText}>{item}</Text>
          </View>
        ))}
        <SecondaryLandingButton label="Create account" onPress={onSignUp} icon="person-add-outline" compact />
      </View>
    </View>
  );
}

function TrustSection() {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View style={[styles.section, styles.trustSection, mobile && styles.sectionMobile]}>
      <View style={[styles.trustCard, mobile && styles.trustCardMobile]}>
        <View style={styles.trustIcon}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.textPrimary} />
        </View>
        <View style={styles.trustCopy}>
          <Text style={styles.trustTitle}>Practical safety, honest boundaries.</Text>
          <Text style={styles.trustText}>
            YSnap uses Supabase-backed account infrastructure and keeps provider secrets in server-side endpoints. Visual analysis and nutrition estimates can be uncertain, so important information should be verified and professional advice should not be replaced.
          </Text>
        </View>
      </View>
    </View>
  );
}

function FAQSection({ openFaq, onToggle }: { openFaq: number; onToggle: (index: number) => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View nativeID="faq" style={[styles.section, mobile && styles.sectionMobile]}>
      <SectionIntro
        eyebrow="FAQ"
        title="Clear answers before you start."
        body="Grounded notes about what YSnap does today and where users should use judgment."
      />
      <View style={styles.faqList}>
        {faqs.map((item, index) => {
          const expanded = openFaq === index;
          return (
            <View key={item.question} style={styles.faqItem}>
              <Pressable
                style={styles.faqQuestion}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => onToggle(expanded ? -1 : index)}
              >
                <Text style={styles.faqQuestionText}>{item.question}</Text>
                <Ionicons name={expanded ? 'remove' : 'add'} size={22} color={colors.textPrimary} />
              </Pressable>
              {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FinalCTA({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View style={[styles.finalCtaSection, mobile && styles.finalCtaSectionMobile]}>
      <View style={styles.finalCtaCard}>
        <BrandMark size={58} variant="dark" />
        <Text style={[styles.finalCtaTitle, mobile && styles.finalCtaTitleMobile]}>Your world makes more sense with YSnap.</Text>
        <Text style={styles.finalCtaText}>Open the app, choose a mode, and start with the thing in front of you.</Text>
        <View style={[styles.finalCtaActions, mobile && styles.finalCtaActionsMobile]}>
          <PrimaryLandingButton label="Open YSnap" onPress={onPrimary} />
          <SecondaryLandingButton label="Review features" onPress={onSecondary} icon="list-outline" />
        </View>
      </View>
    </View>
  );
}

function LandingFooter({ onAnchor }: { onAnchor: (target: string) => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const year = new Date().getFullYear();
  return (
    <View style={[styles.footer, mobile && styles.footerMobile]}>
      <View style={styles.footerBrand}>
        <LandingBrandLockup size={38} />
        <Text style={styles.footerText}>Translation, camera, voice, and visual-assistance tools in one app.</Text>
      </View>
      <View style={[styles.footerLinks, mobile && styles.footerLinksMobile]}>
        {navItems.map((item) => (
          <Pressable key={item.target} onPress={() => onAnchor(item.target)} accessibilityRole="link">
            <Text style={styles.footerLinkText}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="link">
          <Text style={styles.footerLinkText}>Privacy Policy TODO</Text>
        </Pressable>
        <Pressable accessibilityRole="link">
          <Text style={styles.footerLinkText}>Terms</Text>
        </Pressable>
      </View>
      <Text style={styles.copyright}>© {year} YSnap. All rights reserved.</Text>
    </View>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View style={styles.sectionIntro}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={[styles.sectionTitle, mobile && styles.sectionTitleMobile]}>{title}</Text>
      <Text style={[styles.sectionBody, mobile && styles.sectionBodyMobile]}>{body}</Text>
    </View>
  );
}

function LandingBrandLockup({ size }: { size: number }) {
  return (
    <View style={styles.landingBrandLockup}>
      <BrandMark size={size} variant="dark" />
      <Text style={[styles.landingBrandText, { fontSize: Math.round(size * 0.7), lineHeight: Math.round(size * 0.78) }]}>YSnap</Text>
    </View>
  );
}

function PhoneFrame({
  image,
  label,
  priority = false,
  compact = false,
}: {
  image: ImageSourcePropType;
  label: string;
  priority?: boolean;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const tiny = width < 360;

  return (
    <View style={[styles.phoneFrame, compact && styles.phoneFrameCompact, mobile && styles.phoneFrameMobile, tiny && styles.phoneFrameTiny]}>
      <Image
        source={image}
        style={styles.phoneImage}
        resizeMode="cover"
        accessibilityLabel={label}
        accessibilityIgnoresInvertColors
        {...(priority ? { loading: 'eager' as any } : { loading: 'lazy' as any })}
      />
    </View>
  );
}

function FeatureStory({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.featureStory}>
      <View style={styles.featureStoryIcon}>
        <Ionicons name={icon} size={22} color="#1877F2" />
      </View>
      <View style={styles.featureStoryCopy}>
        <Text style={styles.featureStoryTitle}>{title}</Text>
        <Text style={styles.featureStoryBody}>{body}</Text>
      </View>
    </View>
  );
}

function PrimaryLandingButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable style={({ pressed }) => [styles.primaryButton, mobile && styles.buttonMobileFull, pressed && styles.buttonPressed]} accessibilityRole="link" onPress={onPress}>
      <LinearGradient colors={['#242329', '#111114', '#08080A']} style={styles.primaryButtonFace}>
        <Text style={styles.primaryButtonText}>{label}</Text>
        <View style={styles.primaryButtonIcon}>
          <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SecondaryLandingButton({
  label,
  onPress,
  icon,
  compact,
}: {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable style={({ pressed }) => [styles.secondaryButton, mobile && !compact && styles.buttonMobileFull, compact && styles.secondaryButtonCompact, pressed && styles.buttonPressed]} accessibilityRole="link" onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.textPrimary} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 86,
  },
  headerShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,230,235,0)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(18px)',
        transition: 'border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
      } as any,
    }),
  },
  headerShellScrolled: {
    borderBottomColor: 'rgba(231,230,235,0.92)',
    shadowColor: '#090909',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  header: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    minHeight: 76,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandButton: {
    minHeight: 48,
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  landingBrandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  landingBrandText: {
    fontWeight: '900',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navLink: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  navCta: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    marginLeft: 8,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  navCtaText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  mobileMenu: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadows.lg,
  },
  mobileNavLink: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileNavText: {
    fontSize: 15,
    fontWeight: '750' as any,
    color: colors.textPrimary,
  },
  mobileMenuCta: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  mobileMenuCtaText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 15,
  },
  section: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 72,
  },
  sectionMobile: {
    paddingHorizontal: 18,
    paddingVertical: 54,
  },
  heroSection: {
    minHeight: 720,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
    paddingTop: 42,
  },
  heroSectionStacked: {
    flexDirection: 'column',
    minHeight: 0,
    alignItems: 'stretch',
    gap: 32,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  trustPill: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  trustPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  h1: {
    fontSize: 76,
    lineHeight: 78,
    fontWeight: '900',
    letterSpacing: -3.6,
    color: colors.textPrimary,
    maxWidth: 720,
  },
  h1Tablet: {
    fontSize: 58,
    lineHeight: 62,
    letterSpacing: -2.6,
  },
  h1Mobile: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.8,
  },
  heroSubtitle: {
    marginTop: 24,
    fontSize: 21,
    lineHeight: 33,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 620,
  },
  heroSubtitleMobile: {
    fontSize: 17,
    lineHeight: 27,
  },
  heroActions: {
    marginTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  heroActionsMobile: {
    alignItems: 'stretch',
  },
  heroVisual: {
    flex: 0.86,
    minHeight: 570,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVisualStacked: {
    flex: 0,
    minHeight: 620,
  },
  heroVisualMobile: {
    minHeight: 560,
  },
  heroGlow: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(24,119,242,0.075)',
  },
  heroFloatingCard: {
    position: 'absolute',
    left: 0,
    bottom: 96,
    width: 184,
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  heroFloatingCardRight: {
    left: undefined,
    right: 0,
    top: 124,
    bottom: undefined,
  },
  heroFloatingTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '850' as any,
    color: colors.textPrimary,
  },
  heroFloatingText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  phoneFrame: {
    width: 292,
    height: 630,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 10,
    borderColor: '#111114',
    overflow: 'hidden',
    shadowColor: '#08080A',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.16,
    shadowRadius: 42,
    elevation: 8,
  },
  phoneFrameCompact: {
    width: 230,
    height: 498,
    borderRadius: 34,
    borderWidth: 8,
    shadowOpacity: 0.11,
    shadowRadius: 32,
  },
  phoneFrameMobile: {
    width: 250,
    height: 540,
    borderRadius: 36,
    borderWidth: 8,
  },
  phoneFrameTiny: {
    width: 224,
    height: 484,
  },
  phoneImage: {
    width: '100%',
    height: '100%',
  },
  sectionIntro: {
    maxWidth: 760,
    marginBottom: 34,
  },
  eyebrow: {
    color: '#1877F2',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '900',
    letterSpacing: -1.7,
    color: colors.textPrimary,
  },
  sectionTitleMobile: {
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.2,
  },
  sectionBody: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 29,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 680,
  },
  sectionBodyMobile: {
    fontSize: 16,
    lineHeight: 25,
  },
  showcaseGrid: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'center',
  },
  showcaseGridStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  showcasePrimary: {
    flex: 0.95,
    minHeight: 680,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  showcasePrimaryMobile: {
    minHeight: 620,
    borderRadius: 30,
  },
  showcaseGlow: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(24,119,242,0.08)',
  },
  layeredScreens: {
    width: '100%',
    minHeight: 650,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layeredScreensMobile: {
    minHeight: 560,
  },
  layeredPhone: {
    position: 'absolute',
    opacity: 0.92,
  },
  layeredPhoneMain: {
    zIndex: 2,
  },
  layeredPhoneLeft: {
    left: 20,
    transform: [{ rotate: '-7deg' }, { scale: 0.88 }],
  },
  layeredPhoneRight: {
    right: 20,
    transform: [{ rotate: '7deg' }, { scale: 0.88 }],
  },
  layeredPhoneHidden: {
    display: 'none',
  },
  annotationCard: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 230,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.md,
  },
  annotationCardMobile: {
    position: 'relative',
    right: undefined,
    bottom: undefined,
    width: 'auto',
    marginHorizontal: 18,
    marginBottom: 18,
  },
  annotationTitle: {
    fontSize: 15,
    fontWeight: '850' as any,
    color: colors.textPrimary,
  },
  annotationText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  showcaseStack: {
    flex: 1,
    gap: 16,
  },
  featureStory: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    ...shadows.md,
  },
  featureStoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F4F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureStoryCopy: {
    flex: 1,
  },
  featureStoryTitle: {
    fontSize: 18,
    fontWeight: '850' as any,
    color: colors.textPrimary,
  },
  featureStoryBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  productStorySection: {
    paddingTop: 28,
    gap: 44,
  },
  productStoryBlock: {
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 34,
    overflow: 'hidden',
    ...shadows.md,
  },
  productStoryBlockReverse: {
    flexDirection: 'row-reverse',
  },
  productStoryBlockStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  productStoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  productStoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  productStoryTitle: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1.4,
    color: colors.textPrimary,
  },
  productStoryTitleMobile: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.9,
  },
  productStoryBody: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 520,
  },
  productStoryVisual: {
    flex: 0.85,
    minHeight: 610,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productStoryVisualMobile: {
    minHeight: 560,
  },
  productStoryGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(126,106,220,0.08)',
  },
  useCaseLayout: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'stretch',
  },
  useCaseLayoutStacked: {
    flexDirection: 'column',
  },
  useCaseCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 24,
    minHeight: 300,
    ...shadows.md,
  },
  useCaseCardRaised: {
    marginTop: 34,
  },
  useCaseIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  useCaseEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  useCaseTitle: {
    marginTop: 8,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  useCaseBody: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  capabilityCard: {
    width: '48.9%',
    minWidth: 280,
    borderRadius: 28,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  capabilityCardMobile: {
    width: '100%',
    minWidth: 0,
  },
  capabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  capabilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  capabilityTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
  },
  capabilityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepsRail: {
    flexDirection: 'row',
    gap: 16,
  },
  stepsRailStacked: {
    flexDirection: 'column',
  },
  stepCard: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    ...shadows.md,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepNumberText: {
    color: colors.textInverse,
    fontWeight: '900',
    fontSize: 16,
  },
  stepTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  stepBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cameraSection: {
    paddingTop: 44,
  },
  cameraModePanel: {
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 24,
    ...shadows.lg,
  },
  modeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  modeChip: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modeChipTextActive: {
    color: colors.textInverse,
  },
  modePreview: {
    minHeight: 200,
    borderRadius: 32,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  modePreviewMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  modePreviewIcon: {
    width: 86,
    height: 86,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  modePreviewCopy: {
    flex: 1,
  },
  modePreviewTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  modePreviewText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  arModeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  arModePill: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#E5EEFF',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  arModeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  guideCard: {
    maxWidth: 780,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 14,
    ...shadows.md,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  guideBullet: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideBulletText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  guideText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  trustSection: {
    paddingVertical: 36,
  },
  trustCard: {
    borderRadius: 36,
    backgroundColor: colors.primary,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  trustCardMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  trustIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.textInverse,
    letterSpacing: -0.8,
  },
  trustText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqQuestion: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '850' as any,
    color: colors.textPrimary,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  finalCtaSection: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 72,
  },
  finalCtaSectionMobile: {
    paddingHorizontal: 18,
    paddingVertical: 54,
  },
  finalCtaCard: {
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: 34,
    alignItems: 'center',
    ...shadows.lg,
  },
  finalCtaTitle: {
    marginTop: 18,
    maxWidth: 660,
    textAlign: 'center',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.6,
    color: colors.textPrimary,
  },
  finalCtaTitleMobile: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
  },
  finalCtaText: {
    marginTop: 12,
    maxWidth: 520,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  finalCtaActions: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  finalCtaActionsMobile: {
    width: '100%',
    alignItems: 'stretch',
  },
  footer: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 42,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerMobile: {
    flexDirection: 'column',
  },
  footerBrand: {
    maxWidth: 340,
  },
  footerText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    maxWidth: 560,
    justifyContent: 'flex-end',
  },
  footerLinksMobile: {
    justifyContent: 'flex-start',
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  copyright: {
    width: '100%',
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  primaryButton: {
    minWidth: 178,
    minHeight: 56,
    borderRadius: 28,
    ...shadows.lg,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'transform 120ms ease' } as any }),
  },
  buttonMobileFull: {
    width: '100%',
  },
  primaryButtonFace: {
    minHeight: 56,
    borderRadius: 28,
    paddingLeft: 22,
    paddingRight: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '850' as any,
  },
  primaryButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'transform 120ms ease' } as any }),
  },
  secondaryButtonCompact: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressed: {
    transform: [{ translateY: 1 }, { scale: 0.99 }],
  },
});
