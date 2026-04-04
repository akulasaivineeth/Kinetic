import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Export user's workout logs as CSV
 * GET /api/export → returns CSV file download
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('logged_at', { ascending: true });

    if (error) throw error;

    // Build CSV
    const headers = [
      'Date',
      'Push-up Reps',
      'Plank Seconds',
      'Run Distance (km)',
      'Run Duration (min)',
      'Whoop Activity',
      'Whoop Strain',
      'Notes',
      'Submitted At',
    ];

    type LogRow = Record<string, unknown>;
    const rows = ((logs || []) as LogRow[]).map((log) => [
      new Date(log.logged_at as string).toLocaleDateString(),
      log.pushup_reps,
      log.plank_seconds,
      log.run_distance,
      Math.round(((log.run_duration as number) || 0) / 60),
      (log.whoop_activity_type as string) || '',
      log.whoop_strain || '',
      ((log.notes as string) || '').replace(/"/g, '""'),
      log.submitted_at ? new Date(log.submitted_at as string).toLocaleDateString() : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kinetic-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
