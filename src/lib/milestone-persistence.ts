import type { SupabaseClient } from '@supabase/supabase-js';
import type { Milestone } from '@/lib/milestones';
import { milestoneKey } from '@/lib/milestones';

/** Inserts unlock rows and one notification per newly crossed milestone (idempotent). */
export async function persistNewMilestoneUnlocks(
  supabase: SupabaseClient,
  userId: string,
  milestones: Milestone[]
): Promise<void> {
  for (const m of milestones) {
    const key = milestoneKey(m);
    const { error } = await supabase.from('user_milestone_unlocks').insert({
      user_id: userId,
      milestone_key: key,
      label: m.label,
      emoji: m.emoji,
    });

    if (error) {
      if (error.code === '23505') continue;
      console.error('milestone unlock insert:', error.message);
      continue;
    }

    const { error: nErr } = await supabase.from('notifications').insert({
      user_id: userId,
      type: 'milestone_unlocked',
      title: 'Milestone unlocked',
      body: `${m.emoji} ${m.label}`,
      data: { milestone_key: key, label: m.label, emoji: m.emoji },
    });
    if (nErr) console.error('milestone notification:', nErr.message);

    // Push notification to mobile
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: `Milestone Unlocked ${m.emoji}`,
          body: m.label,
          data: { url: '/dashboard' },
        }),
      });
    } catch {
      // Push is best-effort
    }
  }
}
