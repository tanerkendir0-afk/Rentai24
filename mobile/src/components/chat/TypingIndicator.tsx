import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

export default function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View className="px-4 mb-3 items-start">
      <View className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex-row gap-1.5">
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[dotStyle(dot)]}
            className="w-2 h-2 rounded-full bg-muted-foreground"
          />
        ))}
      </View>
    </View>
  );
}
