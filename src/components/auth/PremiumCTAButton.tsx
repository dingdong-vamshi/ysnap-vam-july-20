import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants';

interface PremiumCTAButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PremiumCTAButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PremiumCTAButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled) onPress();
      }}
      onPressIn={() => !isDisabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={() => !isDisabled && setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.outer,
        hovered && styles.hovered,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={isDisabled ? ['#D8D8DD', '#BFC0C6'] : ['#242329', '#111114', '#08080A']}
        locations={[0, 0.54, 1]}
        style={styles.face}
      >
        <View style={styles.topHighlight} />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Text style={styles.label}>{title}</Text>
              <View style={[styles.arrowBubble, pressed && styles.arrowBubblePressed]}>
                <Ionicons name="arrow-forward" size={22} color={colors.textInverse} />
              </View>
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function PremiumSecondaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PremiumCTAButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled) onPress();
      }}
      onPressIn={() => !isDisabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={() => !isDisabled && setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.secondaryOuter,
        hovered && styles.secondaryHovered,
        pressed && styles.secondaryPressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient colors={['#FFFFFF', '#FAFAFD']} style={styles.secondaryFace}>
        <View style={styles.secondaryTopHighlight} />
        <View style={styles.secondaryContent}>
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <View style={styles.secondaryIconBubble}>
                <Ionicons name="sparkles-outline" size={18} color="#1877F2" />
              </View>
              <Text style={styles.secondaryLabel}>{title}</Text>
              <Ionicons name="arrow-forward" size={19} color={colors.textMuted} />
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    minHeight: 56,
    borderRadius: 28,
    shadowColor: '#050506',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
      } as any,
    }),
  },
  face: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#34343A',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  topHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  content: {
    minHeight: 56,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  label: {
    color: colors.textInverse,
    fontFamily: typography.button.fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '650' as any,
    letterSpacing: -0.15,
  },
  arrowBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  arrowBubblePressed: {
    transform: [{ translateX: 2 }],
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  hovered: {
    transform: [{ translateY: -1 }],
  },
  pressed: {
    transform: [{ translateY: 2 }, { scale: 0.99 }],
    shadowOpacity: 0.1,
  },
  disabled: {
    opacity: 0.62,
    shadowOpacity: 0.06,
  },
  secondaryOuter: {
    width: '100%',
    minHeight: 54,
    borderRadius: 27,
    shadowColor: '#0A0A0C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
      } as any,
    }),
  },
  secondaryFace: {
    minHeight: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#E6E6EB',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  secondaryTopHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryContent: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F6FF',
    borderWidth: 1,
    borderColor: '#E2ECFF',
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontFamily: typography.button.fontFamily,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '650' as any,
    letterSpacing: -0.1,
  },
  secondaryHovered: {
    transform: [{ translateY: -1 }],
  },
  secondaryPressed: {
    transform: [{ translateY: 1 }, { scale: 0.992 }],
    shadowOpacity: 0.045,
  },
});
