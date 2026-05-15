import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLORS = ['#EFFF3B', '#FF914D', '#38BDF8', '#4ADE80', '#F87171', '#8B5CF6', '#FACC15', '#FB7185', '#34D399'];
const COUNT = 50;

interface Particle {
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  isRect: boolean;
  drift: number;
  translateY: Animated.Value;
  translateX: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
}

export default function ConfettiCelebration({ visible }: { visible: boolean }) {
  const particles = useRef<Particle[]>(
    Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 9,
      delay: Math.random() * 1500,
      duration: 2000 + Math.random() * 1500,
      isRect: Math.random() > 0.4,
      drift: (Math.random() - 0.5) * 140,
      translateY: new Animated.Value(-30),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    particles.forEach(p => {
      p.translateY.setValue(-30);
      p.translateX.setValue(0);
      p.opacity.setValue(0);
      p.rotate.setValue(0);

      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          // Fade in quickly, fade out near the end
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.delay(p.duration - 500),
            Animated.timing(p.opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
          ]),
          // Fall
          Animated.timing(p.translateY, {
            toValue: height * 0.88,
            duration: p.duration,
            useNativeDriver: true,
          }),
          // Drift sideways
          Animated.timing(p.translateX, {
            toValue: p.drift,
            duration: p.duration,
            useNativeDriver: true,
          }),
          // Spin
          Animated.timing(p.rotate, {
            toValue: 1440,
            duration: p.duration,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: 0,
            width: p.size,
            height: p.isRect ? p.size * 1.8 : p.size,
            backgroundColor: p.color,
            borderRadius: p.isRect ? 2 : p.size / 2,
            opacity: p.opacity,
            transform: [
              { translateY: p.translateY },
              { translateX: p.translateX },
              {
                rotate: p.rotate.interpolate({
                  inputRange: [0, 1440],
                  outputRange: ['0deg', '1440deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
