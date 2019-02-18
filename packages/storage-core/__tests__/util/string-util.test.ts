import {endsWith, startsWith} from '../../src/util/string-util';


describe('@wranggle/storage-core/util/string-util', () => {
  const TestString = 'Hello';

  test('startsWith', () => {
    expect(startsWith(TestString, 'He')).toBeTruthy();
    expect(startsWith(TestString, 'he')).toBeFalsy(); // maybe add an option for non-case-sensitive
    expect(startsWith(TestString, 'o')).toBeFalsy();
  });

  test('endsWith', () => {
    expect(endsWith(TestString, 'lo')).toBeTruthy();
    expect(endsWith(TestString, 'H')).toBeFalsy();
  });

});