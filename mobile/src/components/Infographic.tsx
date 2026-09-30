import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors, radius } from '@/theme';

/** The infographic is a tall poster, so size it by its real aspect ratio once loaded. */
export function Infographic({ uri }: { uri: string }) {
  const [aspectRatio, setAspectRatio] = useState(1080 / 3000);

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { aspectRatio }]}
      contentFit="contain"
      transition={200}
      onLoad={(e) => setAspectRatio(e.source.width / e.source.height)}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: radius, backgroundColor: colors.border },
});
