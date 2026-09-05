/**
 * Asserts that a value is neither null nor undefined and returns it,
 * eliminating the need for non-null assertions (`!`) inside test files.
 * Fails the current test with a clear message when the value is missing.
 */
export function assertNonNull<T>(value: T | null | undefined, label = 'value'): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${label} to be defined, got ${value}`);
  }
  return value;
}
