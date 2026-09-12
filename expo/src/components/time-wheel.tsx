import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
  const listRef = useRef<FlatList<string>>(null);
  const padded = ['', ...values, ''];
  const selectedIndex = Math.max(0, values.indexOf(value));

  const commit = (offsetY: number) => {
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(rawIndex, 0), values.length - 1);
    if (values[clamped] !== value) onChange(values[clamped]);
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={[styles.wheel, { width }]}>
      <View pointerEvents="none" style={styles.centerFrame} />
      <FlatList
        ref={listRef}
        data={padded}
        keyExtractor={(item, index) => `${item}-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        onMomentumScrollEnd={(event) => commit(event.nativeEvent.contentOffset.y)}
        renderItem={({ item }) => {
          const isSelected = item !== '' && item === value;
          return (
            <View style={styles.item}>
              <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{item}</Text>
            </View>
          );
        }}
      />
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
  itemText: { fontSize: 40, fontWeight: '500', color: colors.muted, opacity: 0.3 },
  itemTextActive: { color: colors.ink, fontWeight: '700', opacity: 1 },
});
