import { parseTimes } from './timetable';

test('normalises, sorts and de-duplicates times', () => {
  expect(parseTimes('8:15, 07:00\n7:00; 23:59').times).toEqual(['07:00', '08:15', '23:59']);
});

test('reports tokens that are not valid times', () => {
  expect(parseTimes('07:00 24:00 7:60 noon 7.30')).toEqual({
    times: ['07:00'],
    invalid: ['24:00', '7:60', 'noon', '7.30'],
  });
});

test('handles empty input', () => {
  expect(parseTimes('')).toEqual({ times: [], invalid: [] });
  expect(parseTimes(undefined)).toEqual({ times: [], invalid: [] });
});
