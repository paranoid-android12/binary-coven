// Test script to check database connection and session codes
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bppbiqlijdgfhxeezhnq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcGJpcWxpamRnZmh4ZWV6aG5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA1MDY2OSwiZXhwIjoyMDc4NjI2NjY5fQ.pIMxza8YSrapf15RSL_m4kIhmnHiTnIZ6i597mKo9So'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConnection() {
  console.log('=== Testing Supabase Connection ===')
  console.log('URL:', supabaseUrl)
  console.log('Service key exists:', !!supabaseServiceKey)
  console.log('')

  try {
    // Test 1: List all session codes
    console.log('Test 1: Fetching all session codes...')
    const { data: allCodes, error: allError } = await supabase
      .from('session_codes')
      .select('*')

    console.log('Result:', {
      count: allCodes?.length || 0,
      error: allError?.message,
      data: allCodes
    })
    console.log('')

    // Test 2: Try specific code lookup
    if (allCodes && allCodes.length > 0) {
      const testCode = allCodes[0].code
      console.log('Test 2: Looking up specific code:', testCode)

      const { data: specificCode, error: specificError } = await supabase
        .from('session_codes')
        .select('id, code, validity_start, validity_end, is_active')
        .eq('code', testCode)
        .single()

      console.log('Result:', {
        error: specificError?.message,
        data: specificCode
      })
      console.log('')
    }

    // Test 3: Check table structure
    console.log('Test 3: Checking table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('session_codes')
      .select('*')
      .limit(1)

    if (tableInfo && tableInfo.length > 0) {
      console.log('Columns:', Object.keys(tableInfo[0]))
    }
    console.log('')

  } catch (error) {
    console.error('Fatal error:', error)
  }
}

testConnection()
