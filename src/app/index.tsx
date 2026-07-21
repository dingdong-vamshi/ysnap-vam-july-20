import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { YSnapLandingPage } from '../components/landing/YSnapLandingPage';
import { colors } from '../constants';

export default function PublicLandingRoute() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/(auth)/onboarding');
    }
  }, [router]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <YSnapLandingPage />;
}
