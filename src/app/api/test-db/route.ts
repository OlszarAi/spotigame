import { NextResponse } from 'next/server'
import { testSupabaseConnection } from '@/lib/test-supabase'

export async function GET() {
  console.log('Testing Supabase connection...')
  
  const result = await testSupabaseConnection()
  
  return NextResponse.json({
    success: result.success,
    error: result.error,
    data: result.data,
    env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
    }
  })
}
