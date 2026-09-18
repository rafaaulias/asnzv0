import { useEffect, useMemo, useRef } from 'react';
import { Haptics } from '@/services/feedback';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/theme';
import { colors } from '@/theme';

const ITEM_HEIGHT = 74;
const VISIBLE_ITEMS = 3;

type TimeWheelProps = {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  width?: number;
};

// A drum-style picker: one bold selected row with faded neighbors above and
// below, matching the Figma time picker. A leading/trailing blank row lets
// the middle visible slot land exactly on the selected value.
export function TimeWheel({ values, value, onChange, width = 94 }: TimeWheelProps) {
  const listRef = useRef<ScrollView>(null);
  const cycleCount = 5;
  const cycleValues = useMemo(() => Array.from({ length: cycleCount }, () => values).flat(), [values]);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const middleCycle = Math.floor(cycleCount / 2);
  const initialIndex = middleCycle * values.length + selectedIndex;
  const initialRenderIndex = initialIndex + 1;
  const initialOffset = initialRenderIndex * ITEM_HEIGHT;

  useEffect(() => {
    listRef.current?.scrollTo({ y: initialOffset, animated: false });
  }, [initialOffset]);

  const commit = (offsetY: number) => {
    const rawRenderIndex = Math.round(offsetY / ITEM_HEIGHT);
    const valueIndex = (((rawRenderIndex - 1) % values.length) + values.length) % values.length;
    const middleIndex = middleCycle * values.length + valueIndex + 1;
    if (values[valueIndex] !== value) {
      Haptics.selection();
      onChange(values[valueIndex]);
    }
    if (Math.abs(rawRenderIndex - middleIndex) > values.length) {
      requestAnimationFrame(() => listRef.current?.scrollTo({ y: middleIndex * ITEM_HEIGHT, animated: false }));
    }
  };

  return (
    <View style={[styles.wheel, { width }]}>
      <View pointerEvents="none" style={styles.centerFrame} />
      <ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: initialOffset }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onMomentumScrollEnd={(event) => commit(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {['', ...cycleValues, ''].map((item, index) => {
          const isSelected = item !== '' && item === value;
          return (
            <View key={`${item}-${index}`} style={styles.item}>
              <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{item}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: { height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' },
  centerFrame: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 40, fontWeight: '400', fontFamily: fonts.regular, color: colors.muted, opacity: 0.3 },
  itemTextActive: { color: colors.ink, fontWeight: '600', fontFamily: fonts.semibold, opacity: 1 },
});
