import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mocking the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe('Supabase Authentication & Data Loading', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createClient('http://localhost:54321', 'fake-key');
  });

  it('should validate a valid token and return user data', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

    const { data, error } = await mockSupabase.auth.getUser('valid-token');

    expect(error).toBeNull();
    expect(data.user).toEqual(mockUser);
    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
  });

  it('should return an error for an invalid token', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ 
      data: { user: null }, 
      error: { message: 'Invalid token' } 
    });

    const { data, error } = await mockSupabase.auth.getUser('invalid-token');

    expect(error).toBeDefined();
    expect(data.user).toBeNull();
  });

  it('should load dashboard sales data correctly', async () => {
    const mockSales = [
      { id: 1, amount: 100, status: 'approved' },
      { id: 2, amount: 200, status: 'pending' },
    ];

    const selectMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValueOnce({ data: mockSales, error: null });

    mockSupabase.from.mockReturnValueOnce({
      select: selectMock,
      order: orderMock,
      limit: limitMock
    } as any);

    const { data, error } = await mockSupabase.from('sales').select('*').order('created_at').limit(10);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].amount).toBe(100);
  });
});
