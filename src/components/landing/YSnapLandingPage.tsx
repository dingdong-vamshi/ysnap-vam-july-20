import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
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

const heroPhone = require('../../../assets/landing/cinematic/voice-hero-transparent.png');
const voiceLandscape = require('../../../assets/landing/cinematic/voice-landscape.png');
const textLandscape = require('../../../assets/landing/cinematic/text-landscape.png');
const voiceChanger = require('../../../assets/landing/cinematic/voice-changer-portrait.png');

type Scene = {
  eyebrow: string;
  title: string;
  body: string;
  labels: string[];
  image: ImageSourcePropType;
  theme: 'dark' | 'light' | 'blue' | 'violet';
};

const scenes: Scene[] = [
  {
    eyebrow: 'Voice Translation',
    title: 'Speak naturally.',
    body: 'Record speech, review the translation, listen again and keep recent translations close.',
    labels: ['Speak', 'Translate', 'Listen', 'Save'],
    image: voiceLandscape,
    theme: 'dark',
  },
  {
    eyebrow: 'Text Translation',
    title: 'Translate what you read.',
    body: 'Type or scan text, switch languages, and get a clear translation with context and alternatives.',
    labels: ['Switch', 'Translate', 'Context', 'Alternatives'],
    image: textLandscape,
    theme: 'light',
  },
  {
    eyebrow: 'Camera Intelligence',
    title: 'Point. Scan. Understand.',
    body: 'Use YSnap to explore text, menus, plants, coins, food and everyday objects from one intelligent camera.',
    labels: ['Menus', 'Food', 'Objects', 'Study'],
    image: heroPhone,
    theme: 'blue',
  },
  {
    eyebrow: 'Voice Changer',
    title: 'Give your voice a new character.',
    body: 'Choose a voice profile and transform how spoken output feels while keeping the interaction simple.',
    labels: ['Profiles', 'Tone', 'Playback', 'Control'],
    image: voiceChanger,
    theme: 'violet',
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * clamp(progress);
}

function useLandingMetadata() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.title = 'YSnap — See it. Hear it. Understand it.';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';

    const description = 'A cinematic product story for YSnap, the mobile workspace for translation, voice, camera understanding and speech tools.';
    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let node = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!node) {
        node = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
        document.head.appendChild(node);
      }
      Object.entries(attrs).forEach(([key, value]) => node?.setAttribute(key, value));
    };

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: 'YSnap — See it. Hear it. Understand it.' });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#07080D' });
  }, []);
}

export function YSnapLandingPage() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = width < 760;
  const tablet = width < 1040;
  const sceneHeight = Math.max(height * (mobile ? 0.96 : 1.08), mobile ? 720 : 860);
  const activeScene = clamp(Math.floor(Math.max(0, scrollY - sceneHeight * 0.72) / (sceneHeight * 0.78)), 0, scenes.length - 1);
  const active = scenes[activeScene] ?? scenes[0];
  const heroProgress = clamp(scrollY / (sceneHeight * 0.78));
  const travelProgress = clamp((scrollY - sceneHeight * 0.45) / (sceneHeight * 3.2));

  useLandingMetadata();

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const openApp = () => router.push('/sign-in');
  const createAccount = () => router.push('/sign-up');

  const scrollToFeatures = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById('product-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const shellTransform = useMemo(() => {
    const rotate = mobile ? mix(-4, 3, travelProgress) : mix(-8, 8, travelProgress);
    const translateX = mobile ? mix(0, -10, travelProgress) : mix(60, -90, travelProgress);
    const translateY = mobile ? mix(0, -26, heroProgress) : mix(12, -80, heroProgress);
    const scale = mobile ? mix(0.95, 1.02, heroProgress) : mix(0.82, 1.08, heroProgress);

    return [
      { translateX },
      { translateY },
      { scale },
      { rotate: `${rotate}deg` },
    ];
  }, [heroProgress, mobile, travelProgress]);

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <LinearGradient
        pointerEvents="none"
        colors={active.theme === 'dark' ? ['#06070D', '#0C1020', '#16101D'] : active.theme === 'light' ? ['#F8FAFF', '#FFFFFF', '#EEF4FF'] : active.theme === 'blue' ? ['#F7FBFF', '#EDF5FF', '#F9FAFF'] : ['#FBF8FF', '#FFFFFF', '#F2EEFF']}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={[styles.aura, styles.auraOne, mobile && styles.auraOneMobile]} />
      <View pointerEvents="none" style={[styles.aura, styles.auraTwo, mobile && styles.auraTwoMobile]} />
      <View pointerEvents="none" style={[styles.gridGlow, mobile && styles.gridGlowMobile]} />

      <Header menuOpen={menuOpen} onMenu={() => setMenuOpen((value) => !value)} onOpen={openApp} dark={active.theme === 'dark'} mobile={mobile} />
      {mobile && menuOpen ? <MobileMenu onOpen={openApp} onFeatures={scrollToFeatures} onClose={() => setMenuOpen(false)} /> : null}

      <View pointerEvents="none" style={[styles.deviceStage, mobile && styles.deviceStageMobile, tablet && !mobile && styles.deviceStageTablet]}>
        <View style={[styles.deviceHalo, mobile && styles.deviceHaloMobile, active.theme !== 'dark' && styles.deviceHaloLight]} />
        <View style={[styles.deviceOrbit, mobile && styles.deviceOrbitMobile]} />
        <Image source={heroPhone} resizeMode="contain" style={[styles.heroDevice, mobile && styles.heroDeviceMobile, tablet && !mobile && styles.heroDeviceTablet, { transform: shellTransform as any, opacity: mix(1, 0.14, clamp((scrollY - sceneHeight * 1.8) / sceneHeight)) }]} />
        <Image source={active.image} resizeMode="contain" style={[styles.sceneDevice, mobile && styles.sceneDeviceMobile, active.image === voiceChanger && styles.sceneDevicePortrait, mobile && active.image === voiceChanger && styles.sceneDevicePortraitMobile, { opacity: clamp((scrollY - sceneHeight * 0.78) / (sceneHeight * 0.5)), transform: [{ translateY: mix(80, -20, clamp((scrollY - sceneHeight * 0.8) / sceneHeight)) }, { scale: active.image === voiceChanger ? (mobile ? 0.72 : 0.66) : (mobile ? 0.74 : 0.76) }, { rotate: active.image === voiceChanger ? '-4deg' : '0deg' }] }]} />
        <View style={[styles.scanLine, { opacity: active.theme === 'blue' ? 0.72 : 0 }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: mobile ? 80 : 120 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HeroScene mobile={mobile} onPrimary={openApp} onSecondary={scrollToFeatures} progress={heroProgress} />
        <View id="product-story" nativeID="product-story" style={styles.storyStack}>
          {scenes.map((scene, index) => (
            <NarrativeScene key={scene.title} index={index + 1} scene={scene} mobile={mobile} alignRight={index % 2 === 0} />
          ))}
        </View>
        <ConstellationScene mobile={mobile} onPrimary={openApp} onSecondary={createAccount} />
        <FinalCTA mobile={mobile} onPrimary={openApp} onSecondary={scrollToFeatures} />
      </ScrollView>
    </View>
  );
}

function Header({ dark, mobile, menuOpen, onMenu, onOpen }: { dark: boolean; mobile: boolean; menuOpen: boolean; onMenu: () => void; onOpen: () => void }) {
  return (
    <View style={[styles.header, mobile && styles.headerMobile]}>
      <View style={styles.brandRow}>
        <BrandMark size={mobile ? 38 : 46} variant={dark ? 'light' : 'dark'} />
        <Text style={[styles.brandText, dark && styles.brandTextDark, mobile && styles.brandTextMobile]}>YSnap</Text>
      </View>
      {mobile ? (
        <Pressable accessibilityRole="button" accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onPress={onMenu} style={[styles.menuButton, dark && styles.menuButtonDark]}>
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={dark ? '#FFFFFF' : '#06070D'} />
        </Pressable>
      ) : (
        <View style={styles.navRow}>
          <Text style={[styles.navText, dark && styles.navTextDark]}>Product</Text>
          <Text style={[styles.navText, dark && styles.navTextDark]}>Voice</Text>
          <Text style={[styles.navText, dark && styles.navTextDark]}>Camera</Text>
          <Pressable onPress={onOpen} style={[styles.navCta, dark && styles.navCtaDark]}><Text style={[styles.navCtaText, dark && styles.navCtaTextDark]}>Open YSnap</Text></Pressable>
        </View>
      )}
    </View>
  );
}

function MobileMenu({ onOpen, onFeatures, onClose }: { onOpen: () => void; onFeatures: () => void; onClose: () => void }) {
  const pick = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <View style={styles.mobileMenu}>
      <Pressable style={styles.mobileMenuItem} onPress={() => pick(onFeatures)}><Text style={styles.mobileMenuText}>Product story</Text><Ionicons name="arrow-forward" size={18} color="#6B7280" /></Pressable>
      <Pressable style={styles.mobileMenuItem} onPress={() => pick(onOpen)}><Text style={styles.mobileMenuText}>Open YSnap</Text><Ionicons name="arrow-forward" size={18} color="#6B7280" /></Pressable>
    </View>
  );
}

function HeroScene({ mobile, onPrimary, onSecondary, progress }: { mobile: boolean; onPrimary: () => void; onSecondary: () => void; progress: number }) {
  return (
    <View style={[styles.heroScene, mobile && styles.heroSceneMobile]}>
      <View style={[styles.heroCopy, mobile && styles.heroCopyMobile, { opacity: mix(1, 0.42, progress), transform: [{ translateY: mix(0, -46, progress) }] }]}>
        <View style={styles.heroPill}><Ionicons name="sparkles-outline" size={16} color="#7DB6FF" /><Text style={styles.heroPillText}>Built for everyday understanding</Text></View>
        <Text style={[styles.heroTitle, mobile && styles.heroTitleMobile]}>See it. Hear it. <Text style={styles.heroBlue}>Understand it.</Text></Text>
        <Text style={[styles.heroBody, mobile && styles.heroBodyMobile]}>Translate conversations, understand images, scan everyday objects, and get useful answers from one intelligent camera.</Text>
        <View style={[styles.heroActions, mobile && styles.heroActionsMobile]}>
          <PrimaryButton label="Open YSnap" onPress={onPrimary} dark />
          <GhostButton label="Explore the story" icon="arrow-down-outline" onPress={onSecondary} dark />
        </View>
      </View>
      <View style={[styles.heroCaption, mobile && styles.heroCaptionMobile]}>
        <Text style={styles.heroCaptionKicker}>Continuous product journey</Text>
        <Text style={styles.heroCaptionText}>Voice, text, camera and speech tools move through one cinematic interface.</Text>
      </View>
    </View>
  );
}

function NarrativeScene({ scene, index, mobile, alignRight }: { scene: Scene; index: number; mobile: boolean; alignRight: boolean }) {
  return (
    <View style={[styles.narrativeScene, mobile && styles.narrativeSceneMobile]}>
      <View style={[styles.sceneCopy, alignRight && !mobile && styles.sceneCopyRight, mobile && styles.sceneCopyMobile]}>
        <Text style={styles.sceneNumber}>{String(index).padStart(2, '0')}</Text>
        <Text style={styles.sceneEyebrow}>{scene.eyebrow}</Text>
        <Text style={[styles.sceneTitle, mobile && styles.sceneTitleMobile]}>{scene.title}</Text>
        <Text style={[styles.sceneBody, mobile && styles.sceneBodyMobile]}>{scene.body}</Text>
        <View style={styles.labelCloud}>
          {scene.labels.map((label) => <Text key={label} style={styles.floatLabel}>{label}</Text>)}
        </View>
      </View>
    </View>
  );
}

function ConstellationScene({ mobile, onPrimary, onSecondary }: { mobile: boolean; onPrimary: () => void; onSecondary: () => void }) {
  return (
    <View style={[styles.constellation, mobile && styles.constellationMobile]}>
      <Text style={styles.constellationEyebrow}>Product constellation</Text>
      <Text style={[styles.constellationTitle, mobile && styles.constellationTitleMobile]}>One app. More ways to understand the world.</Text>
      <View style={[styles.constellationStage, mobile && styles.constellationStageMobile]}>
        <Image source={textLandscape} resizeMode="contain" style={[styles.constellationPhone, styles.constellationLeft, mobile && styles.constellationPhoneMobile]} />
        <Image source={heroPhone} resizeMode="contain" style={[styles.constellationPhone, styles.constellationCenter, mobile && styles.constellationPhoneMobile]} />
        <Image source={voiceChanger} resizeMode="contain" style={[styles.constellationPhone, styles.constellationRight, mobile && styles.constellationPhoneMobile]} />
      </View>
      <View style={[styles.featureStrip, mobile && styles.featureStripMobile]}>
        {['Translation with context', 'Speak, listen, replay', 'Scan-focused workflows', 'Voice personalization'].map((feature) => <Text key={feature} style={styles.featureStripItem}>{feature}</Text>)}
      </View>
      <View style={[styles.finalActions, mobile && styles.finalActionsMobile]}>
        <PrimaryButton label="Open YSnap" onPress={onPrimary} />
        <GhostButton label="Create account" icon="person-add-outline" onPress={onSecondary} />
      </View>
    </View>
  );
}

function FinalCTA({ mobile, onPrimary, onSecondary }: { mobile: boolean; onPrimary: () => void; onSecondary: () => void }) {
  return (
    <View style={[styles.finalCta, mobile && styles.finalCtaMobile]}>
      <View style={styles.finalOrb} />
      <Text style={[styles.finalTitle, mobile && styles.finalTitleMobile]}>Your world makes more sense with YSnap.</Text>
      <Text style={[styles.finalBody, mobile && styles.finalBodyMobile]}>Open the app, choose a mode, and start with the thing in front of you.</Text>
      <View style={[styles.finalActions, mobile && styles.finalActionsMobile]}>
        <PrimaryButton label="Open YSnap" onPress={onPrimary} />
        <GhostButton label="Review story" icon="refresh-outline" onPress={onSecondary} />
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, dark = false }: { label: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <LinearGradient colors={dark ? ['#FFFFFF', '#DDEBFF'] : ['#121318', '#050507']} style={styles.primaryFace}>
        <Text style={[styles.primaryText, dark && styles.primaryTextDark]}>{label}</Text>
        <View style={[styles.primaryIcon, dark && styles.primaryIconDark]}><Ionicons name="arrow-forward" size={20} color={dark ? '#0B1220' : '#FFFFFF'} /></View>
      </LinearGradient>
    </Pressable>
  );
}

function GhostButton({ label, icon, onPress, dark = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.ghostButton, dark && styles.ghostButtonDark, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={dark ? '#EAF2FF' : '#111827'} />
      <Text style={[styles.ghostText, dark && styles.ghostTextDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07080D' },
  scroll: { flex: 1 },
  scrollContent: { minHeight: '100%' },
  aura: { position: 'absolute', borderRadius: 999, opacity: 0.82 },
  auraOne: { width: 620, height: 620, top: -180, right: 0, backgroundColor: 'rgba(24,119,242,0.28)' },
  auraTwo: { width: 520, height: 520, bottom: 180, left: 0, backgroundColor: 'rgba(126,106,220,0.18)' },
  auraOneMobile: { width: 300, height: 300, right: 0, top: 80 },
  auraTwoMobile: { width: 260, height: 260, left: 0, bottom: 120 },
  gridGlow: { position: 'absolute', width: 620, height: 620, borderRadius: 310, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', right: '12%', top: '18%' },
  gridGlowMobile: { width: 180, height: 180, right: 0, top: 260 },

  header: { position: 'absolute', zIndex: 20, top: 0, left: 0, right: 0, height: 94, paddingHorizontal: 54, paddingTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMobile: { height: 76, paddingHorizontal: 18, paddingTop: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandText: { fontSize: 31, fontWeight: '900', letterSpacing: -1.2, color: '#07080D' },
  brandTextDark: { color: '#FFFFFF' },
  brandTextMobile: { fontSize: 26 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navText: { fontSize: 14, fontWeight: '800', color: '#4B5563' },
  navTextDark: { color: 'rgba(255,255,255,0.70)' },
  navCta: { minHeight: 44, borderRadius: 24, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101217' },
  navCtaDark: { backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  navCtaText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  navCtaTextDark: { color: '#FFFFFF' },
  menuButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(16,18,24,0.08)' },
  menuButtonDark: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)' },
  mobileMenu: { position: 'absolute', zIndex: 30, top: 76, left: 18, right: 18, borderRadius: 26, padding: 10, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(10,12,18,0.08)' },
  mobileMenuItem: { minHeight: 52, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mobileMenuText: { fontSize: 16, fontWeight: '850' as any, color: '#101217' },

  deviceStage: { position: 'absolute', zIndex: 4, top: 80, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', perspective: 1200 as any },
  deviceStageTablet: { top: 160 },
  deviceStageMobile: { top: 292, justifyContent: 'flex-start' },
  deviceHalo: { position: 'absolute', width: 620, height: 620, borderRadius: 310, backgroundColor: 'rgba(24,119,242,0.18)', shadowColor: '#6EA8FF', shadowOpacity: 0.38, shadowRadius: 90, shadowOffset: { width: 0, height: 0 } },
  deviceHaloMobile: { width: 320, height: 320, borderRadius: 160 },
  deviceHaloLight: { backgroundColor: 'rgba(24,119,242,0.10)', shadowOpacity: 0.18 },
  deviceOrbit: { position: 'absolute', width: 360, height: 360, borderRadius: 180, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  deviceOrbitMobile: { width: 270, height: 270, borderRadius: 135 },
  heroDevice: { width: 640, height: 480, zIndex: 2 },
  heroDeviceTablet: { width: 520, height: 390 },
  heroDeviceMobile: { width: 230, height: 174 },
  sceneDevice: { position: 'absolute', zIndex: 3, width: 900, height: 520 },
  sceneDeviceMobile: { width: 420, height: 245 },
  sceneDevicePortrait: { width: 470, height: 760 },
  sceneDevicePortraitMobile: { width: 310, height: 550 },
  scanLine: { position: 'absolute', zIndex: 5, width: 520, height: 2, borderRadius: 2, backgroundColor: '#53A4FF', shadowColor: '#53A4FF', shadowOpacity: 0.7, shadowRadius: 18 },

  heroScene: { minHeight: 900, paddingTop: 150, paddingHorizontal: 58, justifyContent: 'center' },
  heroSceneMobile: { minHeight: 760, paddingHorizontal: 18, paddingTop: 110, justifyContent: 'flex-start' },
  heroCopy: { maxWidth: 640, zIndex: 7 },
  heroCopyMobile: { maxWidth: 380 },
  heroPill: { alignSelf: 'flex-start', minHeight: 38, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', marginBottom: 24 },
  heroPillText: { color: '#EAF2FF', fontSize: 14, fontWeight: '850' as any },
  heroTitle: { color: '#FFFFFF', fontSize: 94, lineHeight: 94, fontWeight: '950' as any, letterSpacing: -5.2 },
  heroTitleMobile: { fontSize: 48, lineHeight: 50, letterSpacing: -2.3 },
  heroBlue: { color: '#72ADFF' },
  heroBody: { marginTop: 28, maxWidth: 560, color: 'rgba(255,255,255,0.72)', fontSize: 23, lineHeight: 34, fontWeight: '650' as any },
  heroBodyMobile: { fontSize: 17, lineHeight: 26, marginTop: 20, maxWidth: 340 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 34 },
  heroActionsMobile: { flexDirection: 'column', marginTop: 24 },
  heroCaption: { position: 'absolute', right: 54, bottom: 70, maxWidth: 300, zIndex: 8, padding: 22, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  heroCaptionMobile: { left: 18, right: 18, bottom: 24, maxWidth: undefined, padding: 18 },
  heroCaptionKicker: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.8 },
  heroCaptionText: { color: 'rgba(255,255,255,0.70)', fontSize: 15, lineHeight: 22, fontWeight: '650' as any, marginTop: 8 },

  storyStack: { zIndex: 8 },
  narrativeScene: { minHeight: 780, paddingHorizontal: 58, justifyContent: 'center' },
  narrativeSceneMobile: { minHeight: 720, paddingHorizontal: 18, justifyContent: 'flex-start', paddingTop: 350 },
  sceneCopy: { maxWidth: 470, padding: 30, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.80)', borderWidth: 1, borderColor: 'rgba(16,24,40,0.08)', shadowColor: '#0B1220', shadowOpacity: 0.08, shadowRadius: 34, shadowOffset: { width: 0, height: 24 } },
  sceneCopyRight: { alignSelf: 'flex-end' },
  sceneCopyMobile: { maxWidth: '100%', padding: 22, borderRadius: 28 },
  sceneNumber: { color: '#1877F2', fontSize: 13, fontWeight: '950' as any, letterSpacing: 2.4, marginBottom: 10 },
  sceneEyebrow: { color: '#727887', fontSize: 12, fontWeight: '950' as any, textTransform: 'uppercase', letterSpacing: 2.2, marginBottom: 12 },
  sceneTitle: { color: '#050507', fontSize: 47, lineHeight: 50, fontWeight: '950' as any, letterSpacing: -2.4 },
  sceneTitleMobile: { fontSize: 32, lineHeight: 35, letterSpacing: -1.4 },
  sceneBody: { marginTop: 16, color: '#5A606D', fontSize: 18, lineHeight: 28, fontWeight: '650' as any },
  sceneBodyMobile: { fontSize: 16, lineHeight: 25 },
  labelCloud: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  floatLabel: { overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F2F6FF', color: '#1672EC', fontSize: 13, fontWeight: '900' },

  constellation: { zIndex: 8, minHeight: 940, paddingHorizontal: 58, paddingTop: 100, alignItems: 'center' },
  constellationMobile: { minHeight: 860, paddingHorizontal: 18, paddingTop: 70 },
  constellationEyebrow: { color: '#1877F2', fontSize: 13, fontWeight: '950' as any, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 14 },
  constellationTitle: { maxWidth: 820, textAlign: 'center', color: '#07080D', fontSize: 74, lineHeight: 76, fontWeight: '950' as any, letterSpacing: -4.4 },
  constellationTitleMobile: { fontSize: 39, lineHeight: 42, letterSpacing: -2 },
  constellationStage: { width: '100%', height: 430, marginTop: 42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  constellationStageMobile: { height: 330, marginTop: 24, overflow: 'hidden' },
  constellationPhone: { position: 'absolute', width: 620, height: 350 },
  constellationPhoneMobile: { width: 300, height: 190 },
  constellationLeft: { transform: [{ translateX: -290 }, { translateY: 20 }, { rotate: '-8deg' }, { scale: 0.78 }], opacity: 0.88 },
  constellationCenter: { width: 480, height: 360, transform: [{ translateY: -20 }, { scale: 1.08 }], zIndex: 4 },
  constellationRight: { width: 330, height: 520, transform: [{ translateX: 310 }, { translateY: 20 }, { rotate: '8deg' }, { scale: 0.78 }], opacity: 0.9 },
  featureStrip: { marginTop: 20, maxWidth: 1000, borderRadius: 34, padding: 10, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(16,24,40,0.08)', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  featureStripMobile: { borderRadius: 28, padding: 8 },
  featureStripItem: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, color: '#111827', backgroundColor: '#F7F9FC', fontSize: 14, fontWeight: '850' as any },

  finalCta: { zIndex: 8, minHeight: 720, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  finalCtaMobile: { minHeight: 620, paddingHorizontal: 18 },
  finalOrb: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#101217', marginBottom: 28, shadowColor: '#1877F2', shadowOpacity: 0.28, shadowRadius: 44, shadowOffset: { width: 0, height: 18 } },
  finalTitle: { maxWidth: 820, textAlign: 'center', color: '#07080D', fontSize: 66, lineHeight: 70, fontWeight: '950' as any, letterSpacing: -3.6 },
  finalTitleMobile: { fontSize: 37, lineHeight: 40, letterSpacing: -1.8 },
  finalBody: { maxWidth: 560, marginTop: 18, textAlign: 'center', color: '#5F6673', fontSize: 20, lineHeight: 30, fontWeight: '650' as any },
  finalBodyMobile: { fontSize: 16, lineHeight: 24 },
  finalActions: { flexDirection: 'row', gap: 14, marginTop: 30, justifyContent: 'center', flexWrap: 'wrap' },
  finalActionsMobile: { flexDirection: 'column', alignSelf: 'stretch' },

  primaryButton: { minHeight: 58, borderRadius: 30, overflow: 'hidden', shadowColor: '#02040A', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } },
  primaryFace: { minHeight: 58, borderRadius: 30, paddingLeft: 24, paddingRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '950' as any },
  primaryTextDark: { color: '#07111F' },
  primaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)' },
  primaryIconDark: { backgroundColor: 'rgba(7,17,31,0.10)' },
  ghostButton: { minHeight: 58, borderRadius: 30, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(16,24,40,0.10)' },
  ghostButtonDark: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.15)' },
  ghostText: { color: '#111827', fontSize: 16, fontWeight: '900' },
  ghostTextDark: { color: '#FFFFFF' },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.99 }] },
});
