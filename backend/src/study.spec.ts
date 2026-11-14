import { randomUUID } from 'node:crypto';
import { validateReport } from './study.js';

const images = [
  { view: 0, name: 'First', src: '/first', checksum: 'same-image' },
  { view: 1, name: 'Second', src: '/second', checksum: 'same-image' },
];

function key(view: number, caption = 'Finding') {
  return { id: randomUUID(), view, caption };
}

describe('report validation', () => {
  const report = { message: '0123456789' };

  it('accepts the nested report message and the first study view', () => {
    const payload = { report: { message: 'Example study finding' }, keys: [key(0)] };
    expect(validateReport(payload, images)).toEqual(payload);
  });

  it.each(['', '             ', ' 123456789 '])('rejects short report text %j', (message) => {
    expect(() => validateReport({ report: { message }, keys: [key(0)] }, images))
      .toThrow('10 to 16,000 characters');
  });

  it('requires at least one key image and a caption on every entry', () => {
    expect(() => validateReport({ report, keys: [] }, images)).toThrow('at least one key image');
    expect(() => validateReport({ report, keys: [key(0), key(0, '  ')] }, images))
      .toThrow('Caption 2 is required');
  });

  it('keeps the first matching caption and preserves order and distinct captions', () => {
    const keys = [
      key(0, 'Finding'),
      key(1, 'Finding'),
      key(0, 'Other'),
      key(0, 'finding'),
    ];
    expect(validateReport({ report, keys }, images).keys).toEqual([
      keys[0],
      keys[2],
      keys[3],
    ]);
  });

  it('applies the limit after merging', () => {
    const keys = Array.from({ length: 16 }, () => key(0, 'Same finding'));
    expect(validateReport({ report, keys }, images).keys).toEqual([
      keys[0],
    ]);
    expect(() =>
      validateReport(
        { report, keys: keys.map((entry, index) => ({ ...entry, caption: `Finding ${index}` })) },
        images,
      ),
    ).toThrow('up to 15 key images');
  });
});
