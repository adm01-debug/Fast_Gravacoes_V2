import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealtimeConnection } from './useRealtimeConnection';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useRealtimeConnection', () => {
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => {
        cb('SUBSCRIBED');
        return mockChannel;
      }),
    };
    
    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  it('should connect to realtime channel on mount', () => {
    const { result } = renderHook(() => useRealtimeConnection());

    expect(supabase.channel).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.any(Object),
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle connection errors', () => {
    mockChannel.subscribe.mockImplementation((cb: any) => {
      cb('CHANNEL_ERROR', new Error('Test error'));
      return mockChannel;
    });

    const { result } = renderHook(() => useRealtimeConnection());

    expect(result.current.status).toBe('error');
    expect(result.current.isConnected).toBe(false);
  });

  it('should remove channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeConnection());
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
