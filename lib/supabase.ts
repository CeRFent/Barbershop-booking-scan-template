// Stub implementation to prevent import errors
// This will be replaced with proper MongoDB implementations

export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    resend: async () => ({ data: null, error: null }),
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error('Not implemented') }),
      }),
      order: () => ({
        limit: () => ({
          single: async () => ({ data: null, error: new Error('Not implemented') }),
        }),
      }),
    }),
    insert: async () => ({ data: null, error: new Error('Not implemented') }),
    update: async () => ({ data: null, error: new Error('Not implemented') }),
    upsert: async () => ({ data: null, error: new Error('Not implemented') }),
  }),
}

export type Profile = {
  id: string
  email: string
  full_name?: string
  phone?: string
  role: string
  referral_code?: string
}

export type Cut = {
  id: string
  user_id: string
  month_year: string
  cut_number: number
  status: string
  used_at?: string
  barber_id?: string
}

export async function getCurrentUser() {
  return null
}

export function handleSupabaseError(error: any, context?: string) {
  return context ? `Error in ${context}` : 'An error occurred'
}
