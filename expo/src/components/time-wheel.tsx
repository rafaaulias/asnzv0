import { useRef } from 'react';
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
  const padded = ['', ...values, ''];
  const selectedIndex = Math.max(0, values.indexOf(value));
  const initialOffset = (selectedIndex + 1) * ITEM_HEIGHT;

  const commit = (offsetY: number) => {
    const clamped = Math.min(Math.max(Math.round(offsetY / ITEM_HEIGHT) - 1, 0), values.length - 1);
    if (values[clamped] !== value) onChange(values[clamped]);
    listRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
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
        onScrollEndDrag={(event) => commit(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {padded.map((item, index) => {
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
