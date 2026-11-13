import { randomUUID } from 'node:crypto';
import { validateReport } from './study.js';

const images = [
  { view: 0, name: 'First', src: '/first', checksum: 'same-image' },
  { view: 1, name: 'Second', src: '/second', checksum: 'same-image' },
];

function key(view: number, caption = '') {
  return { id: randomUUID(), view, caption };
}

describe('report validation', () => {
  it('keeps the first matching caption and preserves order, distinct captions and blank captions', () => {
    const keys = [key(0, 'Finding'), key(1, 'Finding'), key(0), key(0, 'Other'), key(0)];
    expect(validateReport({ report: 'Findings', keys }, images).keys).toEqual([
      keys[0], keys[2], keys[3], keys[4],
    ]);
  });

  it('applies the limit after merging', () => {
    const keys = Array.from({ length: 16 }, () => key(0, 'Same finding'));
    expect(validateReport({ report: '', keys }, images).keys).toEqual([keys[0]]);
    expect(() => validateReport({ report: '', keys: keys.map((entry) => ({ ...entry, caption: '' })) }, images))
      .toThrow('up to 15 key images');
  });
});
