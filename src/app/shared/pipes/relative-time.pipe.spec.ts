import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();
  const now = new Date('2026-09-28T12:00:00Z').getTime();

  it('returns "justo ahora" for recent dates', () => {
    expect(pipe.transform('2026-09-28T11:59:30Z', now)).toBe('justo ahora');
  });

  it('formats minutes and hours in Spanish', () => {
    expect(pipe.transform('2026-09-28T11:55:00Z', now)).toBe('hace 5 minutos');
    expect(pipe.transform('2026-09-28T09:00:00Z', now)).toBe('hace 3 horas');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null, now)).toBe('');
  });
});
