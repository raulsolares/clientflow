import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rslhtuhagrsgcmykagcp.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGh0dWhhZ3JzZ2NteWthZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NDI1MjAsImV4cCI6MjA5OTIxODUyMH0.8_HKwcuXxXyl4HE5M-eWc4R7v_nLb3mWUQ4PbyQX3HY';

const supabase = createClient(supabaseUrl, anonKey);

console.log('Checking if migration tables exist...\n');

// Check project_members
const { error: pmError } = await supabase
  .from('project_members')
  .select('count', { count: 'exact', head: true });

if (pmError && pmError.code === '42P01') {
  console.log('❌ project_members table MISSING - migration needed');
} else if (pmError) {
  console.log('❌ project_members error:', pmError.message.substring(0, 100));
} else {
  console.log('✅ project_members table EXISTS');
}

// Check invitations
const { error: invError } = await supabase
  .from('invitations')
  .select('count', { count: 'exact', head: true });

if (invError && invError.code === '42P01') {
  console.log('❌ invitations table MISSING - migration needed');
} else if (invError) {
  console.log('❌ invitations error:', invError.message.substring(0, 100));
} else {
  console.log('✅ invitations table EXISTS');
}

console.log('\nTo run migration:');
console.log('1. Open https://supabase.com/dashboard/project/rslhtuhagrsgcmykagcp/sql/new');
console.log('2. Paste content from supabase/migration_002_project_members.sql');
console.log('3. Click "Run"');
