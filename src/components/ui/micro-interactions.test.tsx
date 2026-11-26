import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useRipple } from './micro-interactions';

const RIPPLE_MS = 424242;

function RippleHost() {
  const { triggerRipple } = useRipple({ duration: RIPPLE_MS });
  return <button onClick={triggerRipple}>disparar</button>;
}

describe('useRipple', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('cancela o timer pendente no unmount', () => {
    const setSpy = vi.spyOn(window, 'setTimeout');
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    const { getByRole, unmount } = render(<RippleHost />);

    setSpy.mockClear();
    fireEvent.click(getByRole('button'));

    const rippleCall = setSpy.mock.calls.findIndex(([, delay]) => delay === RIPPLE_MS);
    expect(rippleCall).toBeGreaterThanOrEqual(0);
    const rippleTimer = setSpy.mock.results[rippleCall].value as number;

    unmount();

    expect(clearSpy).toHaveBeenCalledWith(rippleTimer);
  });
});
