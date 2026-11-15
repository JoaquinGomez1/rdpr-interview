import { randomUUID } from 'node:crypto';
import { createReportBodyPipe } from './create-report.dto.js';
import { prepareReport } from './study.js';

const images = [
  { view: 0, name: 'First', src: '/first', checksum: 'same-image' },
  { view: 1, name: 'Second', src: '/second', checksum: 'same-image' },
];

function key(view: number, caption = 'Finding') {
  return { id: randomUUID(), view, caption };
}

describe('report validation', () => {
  const report = { message: '0123456789' };
  const validate = (payload: unknown) =>
    createReportBodyPipe.transform(payload, { type: 'body' });

  it('accepts the nested report message and the first study view', async () => {
    const payload = {
      report: { message: 'Example study finding' },
      keys: [key(0)],
    };
    await expect(validate(payload)).resolves.toEqual(payload);
  });

  it.each(['', '             ', ' 123456789 '])(
    'rejects short report text %j',
    async (message) => {
      await expect(
        validate({ report: { message }, keys: [key(0)] }),
      ).rejects.toThrow('10 to 16,000 characters');
    },
  );

  it('requires at least one key image and a caption on every entry', async () => {
    await expect(validate({ report, keys: [] })).rejects.toThrow(
      'at least one key image',
    );
    await expect(
      validate({ report, keys: [key(0), key(0, '  ')] }),
    ).rejects.toThrow('Caption 2 is required');
  });

  it('rejects malformed nested values and case-insensitive duplicate IDs', async () => {
    const first = key(0);
    for (const payload of [
      [],
      { report: [report], keys: [first] },
      { report, keys: [[first]] },
      { report, keys: [null] },
      { report, keys: [{ ...first, view: '0' }] },
      { report, keys: [{ ...first, id: 'invalid' }] },
    ]) {
      await expect(validate(payload)).rejects.toMatchObject({ status: 422 });
    }
    await expect(
      validate({ report, keys: [first, { ...first, id: first.id.toUpperCase() }] }),
    ).rejects.toThrow('unique entry IDs');
  });
});

describe('report preparation', () => {
  const report = { message: '0123456789' };

  it('keeps the first matching caption and preserves order and distinct captions', () => {
    const keys = [
      key(0, 'Finding'),
      key(1, 'Finding'),
      key(0, 'Other'),
      key(0, 'finding'),
    ];
    expect(prepareReport({ report, keys }, images).keys).toEqual([
      keys[0],
      keys[2],
      keys[3],
    ]);
  });

  it('applies the limit after merging', () => {
    const keys = Array.from({ length: 16 }, () => key(0, 'Same finding'));
    expect(prepareReport({ report, keys }, images).keys).toEqual([keys[0]]);
    expect(() =>
      prepareReport(
        {
          report,
          keys: keys.map((entry, index) => ({
            ...entry,
            caption: `Finding ${index}`,
          })),
        },
        images,
      ),
    ).toThrow('up to 15 key images');
  });
});
