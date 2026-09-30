import { Feather } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Variant = 'primary' | 'outline' | 'sun';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  loading?: boolean;
}

const LABEL_COLOR: Record<Variant, string> = { primary: '#fff', outline: colors.primary, sun: colors.ink };

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading }: Props) {
  const color = LABEL_COLOR[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <Text style={[styles.label, { color }]}>{title}</Text>
          {icon && <Feather name={icon} size={19} color={color} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.primary },
  sun: { backgroundColor: colors.sun },
  outline: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  label: { fontSize: 16, fontFamily: fonts.bold },
});
