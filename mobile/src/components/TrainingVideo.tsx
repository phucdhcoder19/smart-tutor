import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

export function TrainingVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);

  return (
    <View style={styles.wrapper}>
      <VideoView player={player} style={styles.video} nativeControls fullscreenOptions={{ enable: true }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', aspectRatio: 16 / 9 },
});
