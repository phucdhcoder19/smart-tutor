import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, fonts, radius } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'upload', title: 'Upload a document', detail: 'A policy, guide, manual or any course material.' },
  { icon: 'cpu', title: 'AI builds the lesson', detail: 'It picks the key ideas, writes a script and records the voiceover.' },
  { icon: 'gift', title: 'Get your materials', detail: 'A narrated video and an infographic, ready to share with your team.' },
];

const FORMATS = ['PDF', 'DOCX', 'TXT', 'MD'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} bounces={false}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Feather name="book-open" size={18} color={colors.ink} />
            </View>
            <Text style={styles.brandName}>SmartTutor</Text>
          </View>

          <Text style={styles.headline}>Turn any document into a training course</Text>
          <Text style={styles.lede}>
            One upload gives you a narrated training video and an infographic your team will actually read.
          </Text>
        </LinearGradient>

        <View style={styles.previews}>
          <VideoPreview />
          <InfographicPreview />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {STEPS.map((step, i) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepRail}>
                <View style={styles.stepDot}>
                  <Feather name={step.icon} size={18} color={colors.primary} />
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.formats}>
          <Text style={styles.formatsLabel}>Works with</Text>
          {FORMATS.map((f) => (
            <Text key={f} style={styles.chip}>
              {f}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Start a training" icon="arrow-right" onPress={() => router.push('/create')} />
      </View>
    </View>
  );
}

/** A miniature of the generated video: footage frame, lower-third bullet and caption. */
function VideoPreview() {
  return (
    <View style={[styles.preview, styles.videoPreview]}>
      <LinearGradient colors={['#2A3B6B', colors.ink]} style={styles.videoFrame}>
        <View style={styles.play}>
          <Feather name="play" size={18} color={colors.ink} style={{ marginLeft: 2 }} />
        </View>
        <View style={styles.caption} />
        <View style={styles.videoTrack}>
          <View style={styles.videoFill} />
        </View>
      </LinearGradient>
      <Text style={styles.previewTitle}>Training video</Text>
      <Text style={styles.previewMeta}>Narrated, up to 5 min</Text>
    </View>
  );
}

/** A miniature of the infographic: photo band, title, stat ticks and bullets. */
function InfographicPreview() {
  return (
    <View style={[styles.preview, styles.infoPreview]}>
      <View style={styles.infoFrame}>
        <View style={styles.infoPhoto} />
        <View style={[styles.bar, { width: '70%', backgroundColor: colors.primary }]} />
        <View style={styles.infoStats}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.infoStat} />
          ))}
        </View>
        <View style={[styles.bar, { width: '85%' }]} />
        <View style={[styles.bar, { width: '60%' }]} />
      </View>
      <Text style={styles.previewTitle}>Infographic</Text>
      <Text style={styles.previewMeta}>One-page cheat sheet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: 24, paddingBottom: 88 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: fonts.bold, fontSize: 17, color: '#fff' },
  headline: {
    marginTop: 36,
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: '#fff',
  },
  lede: { marginTop: 14, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.82)' },

  previews: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: -60 },
  preview: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 10,
    paddingBottom: 14,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  videoPreview: { transform: [{ rotate: '-2deg' }] },
  infoPreview: { transform: [{ rotate: '2deg' }], marginTop: 14 },
  previewTitle: { marginTop: 12, marginHorizontal: 4, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  previewMeta: { marginTop: 2, marginHorizontal: 4, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  videoFrame: { height: 110, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    bottom: 14,
    width: '60%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  videoTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  videoFill: { width: '40%', height: '100%', backgroundColor: colors.sun },

  infoFrame: { height: 110, borderRadius: 10, backgroundColor: colors.sky, padding: 8, gap: 6, overflow: 'hidden' },
  infoPhoto: { height: 30, borderRadius: 6, backgroundColor: '#B9CBF5' },
  infoStats: { flexDirection: 'row', gap: 6 },
  infoStat: { flex: 1, height: 16, borderLeftWidth: 3, borderLeftColor: colors.sun, backgroundColor: '#fff' },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#C9D6F5' },

  section: { marginTop: 36, paddingHorizontal: 24 },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.4, color: colors.ink, marginBottom: 18 },
  step: { flexDirection: 'row', gap: 16 },
  stepRail: { alignItems: 'center' },
  stepDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { flex: 1, width: 2, marginVertical: 4, backgroundColor: colors.border },
  stepBody: { flex: 1, paddingTop: 2, paddingBottom: 24 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  stepDetail: { marginTop: 4, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },

  formats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginTop: 4 },
  formatsLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginRight: 4 },
  chip: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.sky,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },

  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
