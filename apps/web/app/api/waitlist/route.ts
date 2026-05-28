import { NextResponse } from 'next/server';
import { supabaseService } from '../../../lib/supabase/service';

export async function POST(request: Request) {
  const { email }: { email: string } = await request.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { error } = await supabaseService
    .from('waitlist')
    .insert({ email: email.toLowerCase().trim() });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already on the list!' }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'success' }, { status: 201 });
}
