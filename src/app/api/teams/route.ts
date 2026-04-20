import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';
import { encodeTeamCrest, decodeTeamCrest, type TeamCrestPick } from '@/lib/squad-crest-codec';

function postgrestMessage(err: { message: string; details?: string | null; hint?: string | null }) {
  return [err.message, err.details, err.hint].filter(Boolean).join(' · ');
}

type CreateBody = {
  name?: string;
  activitySlugs?: string[];
  crest?: TeamCrestPick | null;
};

export async function POST(request: Request) {
  let createdTeamId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 30) {
      return NextResponse.json({ error: 'Squad name is required (max 30 characters).' }, { status: 400 });
    }

    const activitySlugs = Array.isArray(body.activitySlugs)
      ? body.activitySlugs.filter((s): s is string => typeof s === 'string')
      : [];

    let avatar_url: string | null = null;
    if (body.crest && typeof body.crest === 'object') {
      const crest = body.crest as TeamCrestPick;
      avatar_url = encodeTeamCrest(crest);
      if (!decodeTeamCrest(avatar_url)) {
        return NextResponse.json({ error: 'Invalid crest selection.' }, { status: 400 });
      }
    }

    const admin = await createServiceClient();

    const MAX_ATTEMPTS = 12;
    let team: { id: string } | null = null;
    let invite_code = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error: teamErr } = await admin
        .from('teams')
        .insert({ name, invite_code, created_by: user.id, avatar_url })
        .select('id')
        .single();

      if (!teamErr && data) {
        team = data;
        break;
      }
      if (teamErr?.code === '23505') {
        continue;
      }
      if (teamErr) {
        console.error('[api/teams] teams insert', teamErr);
        return NextResponse.json(
          { error: postgrestMessage(teamErr) || 'Could not create squad.' },
          { status: 400 },
        );
      }
    }

    if (!team) {
      return NextResponse.json({ error: 'Could not assign a unique invite code. Try again.' }, { status: 503 });
    }

    createdTeamId = team.id;

    const { error: memErr } = await admin.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'owner',
    });
    if (memErr) {
      console.error('[api/teams] team_members insert', memErr);
      await admin.from('teams').delete().eq('id', team.id);
      createdTeamId = null;
      return NextResponse.json(
        { error: postgrestMessage(memErr) || 'Could not add you as squad owner.' },
        { status: 400 },
      );
    }

    if (activitySlugs.length > 0) {
      const { data: types, error: typesErr } = await admin
        .from('activity_types')
        .select('id, slug')
        .in('slug', activitySlugs);
      if (typesErr) {
        console.error('[api/teams] activity_types', typesErr);
        await admin.from('teams').delete().eq('id', team.id);
        createdTeamId = null;
        return NextResponse.json(
          { error: postgrestMessage(typesErr) || 'Could not load activity types.' },
          { status: 400 },
        );
      }
      if (types?.length) {
        const { error: actErr } = await admin.from('team_activities').insert(
          types.map((t) => ({ team_id: team.id, activity_type_id: t.id })),
        );
        if (actErr) {
          console.error('[api/teams] team_activities insert', actErr);
          await admin.from('teams').delete().eq('id', team.id);
          createdTeamId = null;
          return NextResponse.json(
            { error: postgrestMessage(actErr) || 'Could not save squad activities.' },
            { status: 400 },
          );
        }
      }
    }

    return NextResponse.json({ team_id: team.id, invite_code });
  } catch (e) {
    console.error('[api/teams]', e);
    if (createdTeamId) {
      try {
        const admin = await createServiceClient();
        await admin.from('teams').delete().eq('id', createdTeamId);
      } catch (cleanupErr) {
        console.error('[api/teams] cleanup', cleanupErr);
      }
    }
    return NextResponse.json({ error: 'Could not create squad.' }, { status: 500 });
  }
}
