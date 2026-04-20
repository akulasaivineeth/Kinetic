import {
  CREST_EMBLEM_OPTIONS,
  CREST_SHAPE_OPTIONS,
  crestVariantFromSeed,
  type KCrestEmblem,
  type KCrestShape,
} from '@/lib/crest-constants';

const PREFIX = 'kcrest|';

export type TeamCrestPick = { shape: KCrestShape; emblem: KCrestEmblem; color: string };

export function encodeTeamCrest(crest: TeamCrestPick): string {
  return `${PREFIX}${crest.shape}|${crest.emblem}|${encodeURIComponent(crest.color)}`;
}

export function decodeTeamCrest(avatarUrl: string | null | undefined): TeamCrestPick | null {
  if (!avatarUrl?.startsWith(PREFIX)) return null;
  const body = avatarUrl.slice(PREFIX.length);
  const i = body.indexOf('|');
  const j = body.indexOf('|', i + 1);
  if (i < 1 || j < i + 2) return null;
  const shape = body.slice(0, i) as KCrestShape;
  const emblem = body.slice(i + 1, j) as KCrestEmblem;
  const colorEnc = body.slice(j + 1);
  let color: string;
  try {
    color = decodeURIComponent(colorEnc);
  } catch {
    return null;
  }
  if (!CREST_SHAPE_OPTIONS.includes(shape) || !CREST_EMBLEM_OPTIONS.includes(emblem)) return null;
  return { shape, emblem, color };
}

export function crestPropsForTeam(teamId: string, avatarUrl: string | null | undefined) {
  const custom = decodeTeamCrest(avatarUrl);
  return custom ?? crestVariantFromSeed(teamId);
}
