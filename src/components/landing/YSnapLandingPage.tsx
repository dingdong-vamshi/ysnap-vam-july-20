import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '../';

const canonicalPhone = require('../../../assets/landing/cinematic/voice-primary-clean.png');

type FeatureScene = {
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  chips: string[];
};

const featureScenes: FeatureScene[] = [
  {
    eyebrow: 'Voice Translation',
    title: 'Speak naturally.',
    body: 'Capture speech, translate it, replay the result, and keep recent translations accessible without breaking flow.',
    icon: 'mic-outline',
    accent: '#7D65D8',
    chips: ['Record', 'Translate', 'Listen', 'Save'],
  },
  {
    eyebrow: 'Text Translation',
    title: 'Translate what you read.',
    body: 'Type or scan text, switch languages, and get clean translation output with context and alternatives.',
    icon: 'language-outline',
    accent: '#1877F2',
    chips: ['Input', 'Context', 'Audio', 'Alternatives'],
  },
  {
    eyebrow: 'Camera Intelligence',
    title: 'Point. Scan. Understand.',
    body: 'Use the camera to understand everyday objects, images, signs, food, and study material from one familiar workspace.',
    icon: 'scan-outline',
    accent: '#1F9F6D',
    chips: ['Camera', 'AR Scan', 'Objects', 'Study'],
  },
  {
    eyebrow: 'Speech Tools',
    title: 'Give voice more control.',
    body: 'Keep playback, history, speed, and voice personalization feeling simple, polished, and ready for daily use.',
    icon: 'options-outline',
    accent: '#E09C48',
    chips: ['Playback', 'Profiles', 'Speed', 'History'],
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * clamp(progress);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

function useLandingMetadata() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.title = 'YSnap — See it. Hear it. Understand it.';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.background = '#FFFFFF';
    document.body.style.background = '#FFFFFF';

    const description = 'YSnap is a mobile workspace for translation, voice, camera understanding, and speech tools.';
    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let node = document.querySelector(selector) as HTMLMetaElement | null;
      if (!node) {
        node = document.createElement('meta');
        document.head.appendChild(node);
      }
      Object.entries(attrs).forEach(([key, value]) => node?.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: 'YSnap — See it. Hear it. Understand it.' });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#FFFFFF' });
  }, []);
}

export function YSnapLandingPage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const mobile = width < 760;
  const tablet = width >= 760 && width < 1080;
  const heroHeight = mobile ? Math.max(900, height * 1.08) : Math.max(780, height * 0.94);
  const storyStart = heroHeight * 0.72;
  const storyProgress = clamp((scrollY - storyStart) / Math.max(1, heroHeight * 2.6));
  const activeIndex = clamp(Math.floor(storyProgress * featureScenes.length), 0, featureScenes.length - 1);
  const activeScene = featureScenes[activeIndex] ?? featureScenes[0];

  useLandingMetadata();

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const openApp = () => router.push('/sign-in');
  const createAccount = () => router.push('/sign-up');
  const scrollToStory = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById('ysnap-product-story')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    scrollRef.current?.scrollTo({ y: heroHeight, animated: !reducedMotion });
  };

  const phoneTransform = useMemo(() => {
    if (reducedMotion) {
      return [{ translateY: 0 }, { translateX: 0 }, { scale: mobile ? 0.8 : tablet ? 0.9 : 0.98 }, { rotate: '0deg' }];
    }

    const heroProgress = clamp(scrollY / Math.max(1, heroHeight));
    const travel = clamp((scrollY - heroHeight * 0.3) / Math.max(1, heroHeight * 2.6));

    return [
      { translateX: mobile ? 0 : mix(90, -18, travel) },
      { translateY: mobile ? 0 : mix(8, -34, travel) },
      { scale: mobile ? 0.8 : tablet ? mix(0.82, 0.9, heroProgress) : mix(0.9, 1.02, heroProgress) },
      { rotate: `${mobile ? 0 : mix(-4.5, 4.5, travel)}deg` },
    ];
  }, [heroHeight, mobile, reducedMotion, scrollY, tablet]);

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#FFFFFF', '#FBFCFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      <View style={styles.backgroundPlane} pointerEvents="none" />
      <View style={[styles.backgroundRing, mobile && styles.backgroundRingMobile]} pointerEvents="none" />
      <View style={[styles.backgroundRingTwo, mobile && styles.backgroundRingTwoMobile]} pointerEvents="none" />
      <View style={[styles.dotField, mobile && styles.dotFieldMobile]} pointerEvents="none" />

      <Header mobile={mobile} menuOpen={menuOpen} onMenu={() => setMenuOpen((value) => !value)} onOpen={openApp} onFeatures={scrollToStory} />
      {mobile && menuOpen ? (
        <MobileMenu
          onClose={() => setMenuOpen(false)}
          onOpen={openApp}
          onFeatures={scrollToStory}
          onCreate={createAccount}
        />
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: mobile ? 72 : 110 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, mobile && styles.heroMobile, { minHeight: heroHeight }]}>
          <View style={[styles.heroCopy, mobile && styles.heroCopyMobile]}>
            <View style={[styles.heroPill, mobile && styles.heroPillMobile]}>
              <Ionicons name="sparkles-outline" size={16} color="#1877F2" />
              <Text style={styles.heroPillText}>Built for everyday understanding</Text>
            </View>
            <Text style={[styles.heroTitle, mobile && styles.heroTitleMobile]}>
              See it. Hear it. <Text style={styles.blueText}>Understand it.</Text>
            </Text>
            <Text style={[styles.heroBody, mobile && styles.heroBodyMobile]}>
              Translate conversations, understand images, scan everyday objects, and get useful answers from one intelligent camera.
            </Text>
            <View style={[styles.heroActions, mobile && styles.heroActionsMobile]}>
              <PrimaryButton label="Open YSnap" onPress={openApp} />
              <GhostButton label="Explore the story" icon="arrow-down-outline" onPress={scrollToStory} />
            </View>
          </View>

          <PhoneStage mobile={mobile} tablet={tablet} transform={phoneTransform} activeScene={mobile ? featureScenes[0] : activeScene} />
        </View>

        <View nativeID="ysnap-product-story" style={[styles.storyIntro, mobile && styles.storyIntroMobile]}>
          <Text style={styles.kicker}>Product story</Text>
          <Text style={[styles.sectionTitle, mobile && styles.sectionTitleMobile]}>A light, continuous YSnap product journey.</Text>
          <Text style={[styles.sectionBody, mobile && styles.sectionBodyMobile]}>
            The same clean device anchors the page while the surrounding interface explains each workflow. No mismatched phones, no watermarked renders, no abrupt visual resets.
          </Text>
        </View>

        <View style={styles.sceneStack}>
          {featureScenes.map((scene, index) => (
            <FeatureSceneCard key={scene.title} scene={scene} index={index + 1} mobile={mobile} alignRight={!mobile && index % 2 === 1} />
          ))}
        </View>

        <ProofPanel mobile={mobile} />
        <FinalCTA mobile={mobile} onPrimary={openApp} onSecondary={createAccount} />
      </ScrollView>
    </View>
  );
}

function Header({
  mobile,
  menuOpen,
  onMenu,
  onOpen,
  onFeatures,
}: {
  mobile: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onOpen: () => void;
  onFeatures: () => void;
}) {
  return (
    <View style={[styles.header, mobile && styles.headerMobile]}>
      <View style={styles.brandRow}>
        <BrandMark size={mobile ? 34 : 42} variant="dark" />
        <Text style={[styles.brandText, mobile && styles.brandTextMobile]}>YSnap</Text>
      </View>
      {mobile ? (
        <Pressable accessibilityRole="button" accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onPress={onMenu} style={styles.menuButton}>
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color="#050507" />
        </Pressable>
      ) : (
        <View style={styles.navRow}>
          <Pressable onPress={onFeatures}><Text style={styles.navText}>Product</Text></Pressable>
          <Text style={styles.navText}>Voice</Text>
          <Text style={styles.navText}>Camera</Text>
          <Pressable onPress={onOpen} style={styles.navCta}><Text style={styles.navCtaText}>Open YSnap</Text></Pressable>
        </View>
      )}
    </View>
  );
}

function MobileMenu({
  onClose,
  onOpen,
  onFeatures,
  onCreate,
}: {
  onClose: () => void;
  onOpen: () => void;
  onFeatures: () => void;
  onCreate: () => void;
}) {
  const pick = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <View style={styles.mobileMenu}>
      <Pressable style={styles.mobileMenuItem} onPress={() => pick(onFeatures)}>
        <Text style={styles.mobileMenuText}>Product story</Text>
        <Ionicons name="arrow-forward" size={18} color="#6B7280" />
      </Pressable>
      <Pressable style={styles.mobileMenuItem} onPress={() => pick(onOpen)}>
        <Text style={styles.mobileMenuText}>Open YSnap</Text>
        <Ionicons name="arrow-forward" size={18} color="#6B7280" />
      </Pressable>
      <Pressable style={styles.mobileMenuItem} onPress={() => pick(onCreate)}>
        <Text style={styles.mobileMenuText}>Create account</Text>
        <Ionicons name="arrow-forward" size={18} color="#6B7280" />
      </Pressable>
    </View>
  );
}

function PhoneStage({
  mobile,
  tablet,
  transform,
  activeScene,
}: {
  mobile: boolean;
  tablet: boolean;
  transform: object[];
  activeScene: FeatureScene;
}) {
  return (
    <View style={[styles.phoneStage, mobile && styles.phoneStageMobile, tablet && styles.phoneStageTablet]} pointerEvents="none">
      <View style={[styles.phoneGlow, mobile && styles.phoneGlowMobile]} />
      <View style={[styles.orbitOuter, mobile && styles.orbitOuterMobile]} />
      <View style={[styles.orbitInner, mobile && styles.orbitInnerMobile]} />
      <Animated.View style={[styles.phoneWrap, mobile && styles.phoneWrapMobile, tablet && styles.phoneWrapTablet, { transform: transform as any }]}>
        <Image source={canonicalPhone} resizeMode="contain" style={[styles.phoneImage, mobile && styles.phoneImageMobile, tablet && styles.phoneImageTablet]} />
        <View style={[styles.modeBadge, mobile && styles.modeBadgeMobile]}>
          <View style={[styles.modeIcon, { backgroundColor: `${activeScene.accent}14` }]}>
            <Ionicons name={activeScene.icon} size={mobile ? 15 : 18} color={activeScene.accent} />
          </View>
          <View>
            <Text style={styles.modeEyebrow}>Now showing</Text>
            <Text style={styles.modeTitle}>{activeScene.eyebrow}</Text>
          </View>
        </View>
        <View style={[styles.scanGlow, { opacity: activeScene.icon === 'scan-outline' ? 0.9 : 0 }]} />
      </Animated.View>
    </View>
  );
}

function FeatureSceneCard({
  scene,
  index,
  mobile,
  alignRight,
}: {
  scene: FeatureScene;
  index: number;
  mobile: boolean;
  alignRight: boolean;
}) {
  return (
    <View style={[styles.scene, mobile && styles.sceneMobile]}>
      <View style={[styles.sceneCard, alignRight && styles.sceneCardRight, mobile && styles.sceneCardMobile]}>
        <View style={[styles.sceneIcon, { backgroundColor: `${scene.accent}12`, borderColor: `${scene.accent}22` }]}>
          <Ionicons name={scene.icon} size={mobile ? 23 : 27} color={scene.accent} />
        </View>
        <Text style={styles.sceneNumber}>{String(index).padStart(2, '0')}</Text>
        <Text style={styles.sceneKicker}>{scene.eyebrow}</Text>
        <Text style={[styles.sceneTitle, mobile && styles.sceneTitleMobile]}>{scene.title}</Text>
        <Text style={[styles.sceneBody, mobile && styles.sceneBodyMobile]}>{scene.body}</Text>
        <View style={styles.chipRow}>
          {scene.chips.map((chip) => (
            <Text key={chip} style={[styles.chip, { color: scene.accent, backgroundColor: `${scene.accent}0F` }]}>{chip}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function ProofPanel({ mobile }: { mobile: boolean }) {
  return (
    <View style={[styles.proof, mobile && styles.proofMobile]}>
      <View style={[styles.proofCard, mobile && styles.proofCardMobile]}>
        <Text style={styles.kicker}>Production-ready asset rules</Text>
        <Text style={[styles.proofTitle, mobile && styles.proofTitleMobile]}>One clean phone. One white system. No visual noise.</Text>
        <Text style={[styles.proofBody, mobile && styles.proofBodyMobile]}>
          The rebuilt page rejects watermarked mockups and keeps the transparent YSnap phone as the single visual anchor. Feature states are expressed through clean overlays until matching transparent screenshots are available.
        </Text>
      </View>
      <View style={[styles.proofGrid, mobile && styles.proofGridMobile]}>
        {[
          ['No watermark', 'Only transparent production assets are used.'],
          ['No dark reset', 'The page stays in YSnap’s white, black, and soft gray identity.'],
          ['Mobile-safe', 'The phone remains contained and readable across small widths.'],
        ].map(([title, body]) => (
          <View key={title} style={styles.proofTile}>
            <Ionicons name="checkmark-circle-outline" size={23} color="#1877F2" />
            <Text style={styles.proofTileTitle}>{title}</Text>
            <Text style={styles.proofTileBody}>{body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FinalCTA({ mobile, onPrimary, onSecondary }: { mobile: boolean; onPrimary: () => void; onSecondary: () => void }) {
  return (
    <View style={[styles.final, mobile && styles.finalMobile]}>
      <View style={styles.finalOrb}>
        <Ionicons name="sparkles" size={28} color="#1877F2" />
      </View>
      <Text style={[styles.finalTitle, mobile && styles.finalTitleMobile]}>Your world makes more sense with YSnap.</Text>
      <Text style={[styles.finalBody, mobile && styles.finalBodyMobile]}>Open the app, choose a mode, and start with the thing in front of you.</Text>
      <View style={[styles.finalActions, mobile && styles.finalActionsMobile]}>
        <PrimaryButton label="Open YSnap" onPress={onPrimary} />
        <GhostButton label="Create account" icon="person-add-outline" onPress={onSecondary} />
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <LinearGradient colors={['#15161B', '#07080B']} style={styles.primaryFace}>
        <Text style={styles.primaryText}>{label}</Text>
        <View style={styles.primaryIcon}><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></View>
      </LinearGradient>
    </Pressable>
  );
}

function GhostButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color="#111827" />
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { minHeight: '100%' },
  backgroundPlane: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    height: 780,
    backgroundColor: 'rgba(245,248,253,0.72)',
    transform: [{ skewY: '-7deg' }],
  },
  backgroundRing: {
    position: 'absolute',
    top: -150,
    right: -190,
    width: 520,
    height: 520,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.12)',
    backgroundColor: 'rgba(24,119,242,0.045)',
  },
  backgroundRingMobile: { width: 270, height: 270, borderRadius: 135, top: 92, right: -142 },
  backgroundRingTwo: {
    position: 'absolute',
    bottom: 220,
    left: -210,
    width: 470,
    height: 470,
    borderRadius: 235,
    borderWidth: 1,
    borderColor: 'rgba(125,101,216,0.10)',
  },
  backgroundRingTwoMobile: { width: 250, height: 250, borderRadius: 125, left: -150, bottom: 380 },
  dotField: {
    position: 'absolute',
    top: 540,
    left: '52%',
    width: 180,
    height: 180,
    opacity: 0.28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.08)',
  },
  dotFieldMobile: { width: 110, height: 110, top: 470, left: '70%' },

  header: {
    position: 'absolute',
    zIndex: 40,
    top: 0,
    left: 0,
    right: 0,
    height: 92,
    paddingHorizontal: 56,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerMobile: { height: 78, paddingHorizontal: 18, paddingTop: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandText: { fontSize: 31, fontWeight: '900', letterSpacing: -1.25, color: '#050507' },
  brandTextMobile: { fontSize: 25, letterSpacing: -1 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navText: { color: '#5D6470', fontSize: 14, fontWeight: '800' },
  navCta: {
    minHeight: 44,
    borderRadius: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101116',
    shadowColor: '#03050A',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  navCtaText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  menuButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  mobileMenu: {
    position: 'absolute',
    zIndex: 55,
    top: 78,
    left: 18,
    right: 18,
    padding: 10,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.10)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
  mobileMenuItem: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileMenuText: { fontSize: 16, fontWeight: '800', color: '#101217' },

  hero: {
    paddingTop: 142,
    paddingHorizontal: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },
  heroMobile: { paddingTop: 104, paddingHorizontal: 18, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: 22 },
  heroCopy: { zIndex: 10, flex: 1, maxWidth: 640 },
  heroCopyMobile: { maxWidth: '100%', flex: 0 },
  heroPill: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: '#DDEAFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  heroPillMobile: { marginBottom: 18 },
  heroPillText: { color: '#111827', fontSize: 14, fontWeight: '850' as any },
  heroTitle: { color: '#050507', fontSize: 92, lineHeight: 91, fontWeight: '950' as any, letterSpacing: -5.2 },
  heroTitleMobile: { fontSize: 42, lineHeight: 44, letterSpacing: -2 },
  blueText: { color: '#1877F2' },
  heroBody: { marginTop: 26, maxWidth: 600, color: '#666B75', fontSize: 23, lineHeight: 35, fontWeight: '650' as any },
  heroBodyMobile: { marginTop: 16, fontSize: 16, lineHeight: 24 },
  heroActions: { marginTop: 34, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  heroActionsMobile: { flexDirection: 'column', marginTop: 18 },

  phoneStage: {
    zIndex: 8,
    flex: 1,
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  phoneStageTablet: { minHeight: 470 },
  phoneStageMobile: { flex: 0, minHeight: 270, height: 270, width: '100%', marginTop: 360, overflow: 'hidden' },
  phoneGlow: {
    position: 'absolute',
    width: 520,
    height: 370,
    borderRadius: 260,
    backgroundColor: 'rgba(24,119,242,0.08)',
    shadowColor: '#8BBFFF',
    shadowOpacity: 0.32,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 16 },
  },
  phoneGlowMobile: { width: 330, height: 220, borderRadius: 165 },
  orbitOuter: {
    position: 'absolute',
    width: 520,
    height: 360,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.12)',
    transform: [{ rotate: '-8deg' }],
  },
  orbitOuterMobile: { width: 300, height: 210, borderRadius: 150 },
  orbitInner: {
    position: 'absolute',
    width: 360,
    height: 250,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(125,101,216,0.11)',
    transform: [{ rotate: '9deg' }],
  },
  orbitInnerMobile: { width: 220, height: 155, borderRadius: 110 },
  phoneWrap: { alignItems: 'center', justifyContent: 'center' },
  phoneWrapTablet: {},
  phoneWrapMobile: {},
  phoneImage: { width: 640, height: 480 },
  phoneImageTablet: { width: 520, height: 390 },
  phoneImageMobile: { width: 292, height: 219 },
  modeBadge: {
    position: 'absolute',
    right: 16,
    bottom: 56,
    maxWidth: 230,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0B1220',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  modeBadgeMobile: { right: 16, bottom: 28, maxWidth: 175, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 18 },
  modeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  modeEyebrow: { color: '#7A808C', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  modeTitle: { color: '#101217', fontSize: 13, fontWeight: '900', marginTop: 2 },
  scanGlow: {
    position: 'absolute',
    width: 300,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#3DA0FF',
    shadowColor: '#3DA0FF',
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },

  storyIntro: { zIndex: 12, paddingHorizontal: 56, paddingTop: 74, paddingBottom: 34, maxWidth: 980 },
  storyIntroMobile: { paddingHorizontal: 18, paddingTop: 38, paddingBottom: 18 },
  kicker: { color: '#1877F2', fontSize: 13, fontWeight: '950' as any, textTransform: 'uppercase', letterSpacing: 2.8, marginBottom: 14 },
  sectionTitle: { color: '#050507', fontSize: 64, lineHeight: 66, fontWeight: '950' as any, letterSpacing: -3.6 },
  sectionTitleMobile: { fontSize: 36, lineHeight: 39, letterSpacing: -1.8 },
  sectionBody: { marginTop: 18, maxWidth: 720, color: '#646A75', fontSize: 20, lineHeight: 31, fontWeight: '650' as any },
  sectionBodyMobile: { fontSize: 16, lineHeight: 25 },

  sceneStack: { zIndex: 12 },
  scene: { minHeight: 560, paddingHorizontal: 56, justifyContent: 'center' },
  sceneMobile: { minHeight: 0, paddingHorizontal: 18, paddingVertical: 18 },
  sceneCard: {
    maxWidth: 500,
    padding: 30,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 22 },
  },
  sceneCardRight: { alignSelf: 'flex-end' },
  sceneCardMobile: { maxWidth: '100%', padding: 24, borderRadius: 30 },
  sceneIcon: { width: 56, height: 56, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 24 },
  sceneNumber: { color: '#9AA0AA', fontSize: 13, fontWeight: '950' as any, letterSpacing: 2.4, marginBottom: 8 },
  sceneKicker: { color: '#7B8190', fontSize: 12, fontWeight: '950' as any, textTransform: 'uppercase', letterSpacing: 2.2, marginBottom: 12 },
  sceneTitle: { color: '#050507', fontSize: 45, lineHeight: 48, fontWeight: '950' as any, letterSpacing: -2.3 },
  sceneTitleMobile: { fontSize: 32, lineHeight: 35, letterSpacing: -1.4 },
  sceneBody: { marginTop: 16, color: '#5F6673', fontSize: 18, lineHeight: 28, fontWeight: '650' as any },
  sceneBodyMobile: { fontSize: 16, lineHeight: 25 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  chip: { overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, fontSize: 13, fontWeight: '900' },

  proof: { zIndex: 12, paddingHorizontal: 56, paddingVertical: 90, gap: 28 },
  proofMobile: { paddingHorizontal: 18, paddingVertical: 52, gap: 18 },
  proofCard: {
    padding: 34,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 24 },
  },
  proofCardMobile: { padding: 24, borderRadius: 30 },
  proofTitle: { maxWidth: 820, color: '#050507', fontSize: 52, lineHeight: 55, fontWeight: '950' as any, letterSpacing: -2.8 },
  proofTitleMobile: { fontSize: 32, lineHeight: 35, letterSpacing: -1.5 },
  proofBody: { marginTop: 16, maxWidth: 780, color: '#626873', fontSize: 19, lineHeight: 30, fontWeight: '650' as any },
  proofBodyMobile: { fontSize: 16, lineHeight: 25 },
  proofGrid: { flexDirection: 'row', gap: 16 },
  proofGridMobile: { flexDirection: 'column' },
  proofTile: {
    flex: 1,
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
  },
  proofTileTitle: { marginTop: 12, color: '#050507', fontSize: 18, fontWeight: '900' },
  proofTileBody: { marginTop: 7, color: '#636A75', fontSize: 14, lineHeight: 21, fontWeight: '650' as any },

  final: { zIndex: 12, minHeight: 620, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  finalMobile: { minHeight: 520, paddingHorizontal: 18 },
  finalOrb: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: '#DDEAFF',
    marginBottom: 26,
    shadowColor: '#1877F2',
    shadowOpacity: 0.14,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
  },
  finalTitle: { maxWidth: 840, textAlign: 'center', color: '#050507', fontSize: 64, lineHeight: 68, fontWeight: '950' as any, letterSpacing: -3.4 },
  finalTitleMobile: { fontSize: 36, lineHeight: 39, letterSpacing: -1.7 },
  finalBody: { maxWidth: 580, marginTop: 18, textAlign: 'center', color: '#626873', fontSize: 20, lineHeight: 30, fontWeight: '650' as any },
  finalBodyMobile: { fontSize: 16, lineHeight: 24 },
  finalActions: { flexDirection: 'row', gap: 14, marginTop: 30, justifyContent: 'center', flexWrap: 'wrap' },
  finalActionsMobile: { flexDirection: 'column', alignSelf: 'stretch' },

  primaryButton: {
    minHeight: 58,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#02040A',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
  },
  primaryFace: { minHeight: 58, borderRadius: 30, paddingLeft: 24, paddingRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '950' as any },
  primaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)' },
  ghostButton: {
    minHeight: 58,
    borderRadius: 30,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.10)',
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  ghostText: { color: '#111827', fontSize: 16, fontWeight: '900' },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.99 }] },
});
