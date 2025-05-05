import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://ljnvptzkfjnvmmnupirp.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbnZwdHprZmpudm1tbnVwaXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxOTY0NDAsImV4cCI6MjA2MTc3MjQ0MH0.cXqf60krI8LsxvmLQdh7cLam8dSzTAsKId0nCPTqFgE'
)
