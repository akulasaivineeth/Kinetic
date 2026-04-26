import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = await createServiceClient();

  const { error: approvalErr } = await admin
    .from('team_lineup_approvals')
    .upsert({ team_id: teamId, user_id: user.id }, { onConflict: 'team_id,user_id' });
  if (approvalErr) {
    return NextResponse.json({ error: approvalErr.message }, { status: 400 });
  }

  const [{ data: members }, { data: approvals }] = await Promise.all([
    admin.from('team_members').select('user_id').eq('team_id', teamId),
    admin.from('team_lineup_approvals').select('user_id').eq('team_id', teamId),
  ]);

  const memberCount = members?.length ?? 0;
  const approvalCount = approvals?.length ?? 0;

  if (approvalCount < memberCount || memberCount === 0) {
    return NextResponse.json({ locked: false, approvalCount, memberCount });
  }

  // All approved — compute consensus and lock
  const { data: votes } = await admin
    .from('team_votes')
    .select('activity_slugs')
    .eq('team_id', teamId);

  const slugCounts = new Map<string, number>();
  for (const vote of votes ?? []) {
    for (const slug of (vote.activity_slugs as string[]) ?? []) {
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }
  }

  const majority = Math.floor(memberCount / 2) + 1;
  const passing = [...slugCounts.entries()]
    .filter(([, count]) => count >= majority)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug)
    .slice(0, 6);

  const finalSlugs =
    passing.length > 0
      ? passing
      : [...slugCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([s]) => s);

  await admin
    .from('teams')
    .update({
      lineup_locked: true,
      lineup_locked_at: new Date().toISOString(),
      lineup_activity_slugs: finalSlugs,
    })
    .eq('id', teamId);

  // Sync team_activities to the locked lineup
  const { data: activityTypes } = await admin
    .from('activity_types')
    .select('id, slug')
    .in('slug', finalSlugs);

  if (activityTypes?.length) {
    await admin.from('team_activities').delete().eq('team_id', teamId);
    await admin.from('team_activities').insert(
      activityTypes.map((t: { id: number; slug: string }) => ({
        team_id: teamId,
        activity_type_id: t.id,
      })),
    );
  }

  return NextResponse.json({ locked: true, activitySlugs: finalSlugs });
}
