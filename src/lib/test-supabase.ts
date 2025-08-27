import { createClient } from '@supabase/supabase-js'

export async function testSupabaseConnection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Test connection
    const { data, error } = await supabase
      .from('lobbies')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return { success: false, error }
    }

    console.log('Supabase connection successful:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Supabase connection failed:', err)
    return { success: false, error: err }
  }
}
