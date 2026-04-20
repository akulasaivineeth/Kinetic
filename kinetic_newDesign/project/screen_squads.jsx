// Squads hub + squad detail (overview, arena, chat) + create + vote

const { K, Ic, ExIcons } = window;

// ─── Squads Hub — global leaderboard of squads ─────────────────
function KineticSquads({ onOpenSquad, onCreate, onJoin }) {
  const [scope, setScope] = React.useState('global'); // global | yours

  const list = scope === 'yours' ? SQUADS.filter(s => ['monsters','dawn'].includes(s.id)) : SQUADS;
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div style={{ padding: '0 20px 140px', fontFamily: K.font.ui }}>
      <div>
        <KEyebrow>Leaderboard · this week</KEyebrow>
        <KDisplay size={42} style={{ marginTop: 4 }}>SQUADS</KDisplay>
      </div>

      {/* Scope pills + create / join */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 6, background: K.card, padding: 4, borderRadius: K.r.pill, boxShadow: K.shadow.card }}>
          <KPill active={scope === 'global'} onClick={() => setScope('global')} size="sm" style={{ border: 'none' }}>Global</KPill>
          <KPill active={scope === 'yours'} onClick={() => setScope('yours')} size="sm" style={{ border: 'none' }}>Yours</KPill>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onJoin} style={squadBtn(false)}><Ic.Plus size={14} color={K.muted}/> JOIN</button>
          <button onClick={onCreate} style={squadBtn(true)}><Ic.Plus size={14} color="#fff"/> NEW</button>
        </div>
      </div>

      {/* Podium — top 3 */}
      <div style={{ marginTop: 20 }}>
        <KCard pad={22} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 260, height: 260, borderRadius: '50%',
            background: `radial-gradient(circle, ${K.mint} 0%, transparent 70%)`,
            opacity: 0.6, pointerEvents: 'none',
          }}/>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
            <PodiumEntry squad={top3[1]} rank={2} onClick={() => onOpenSquad(top3[1])}/>
            <PodiumEntry squad={top3[0]} rank={1} big onClick={() => onOpenSquad(top3[0])}/>
            <PodiumEntry squad={top3[2]} rank={3} onClick={() => onOpenSquad(top3[2])}/>
          </div>
        </KCard>
      </div>

      {/* Standings */}
      <div style={{ marginTop: 26 }}>
        <KEyebrow>Standings</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rest.map(s => (
            <SquadRow key={s.id} squad={s} onClick={() => onOpenSquad(s)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function squadBtn(primary) {
  return {
    background: primary ? K.green : K.card,
    color: primary ? '#fff' : K.ink,
    border: primary ? 'none' : `1px solid ${K.lineStrong}`,
    borderRadius: K.r.pill, padding: '8px 14px',
    fontFamily: K.font.ui, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: primary ? '0 4px 10px rgba(31,179,122,0.3)' : K.shadow.card,
  };
}

function PodiumEntry({ squad, rank, big, onClick }) {
  const size = big ? 72 : 56;
  const height = big ? 110 : rank === 2 ? 78 : 60;
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
      {big && <div style={{ fontSize: 22 }}>👑</div>}
      <KCrest {...squad.crest} size={size} glow={big}/>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: big ? 13 : 11, fontWeight: 800, color: K.ink, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{squad.name}</div>
        <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: big ? 22 : 16, color: K.greenDeep, marginTop: 2, letterSpacing: -0.3 }}>
          {squad.weekScore.toLocaleString()}
        </div>
      </div>
      <div style={{
        width: '100%', maxWidth: big ? 100 : 80, height,
        background: rank === 1 ? `linear-gradient(180deg, ${K.green}, ${K.greenDeep})` : K.mintSoft,
        borderRadius: '12px 12px 0 0',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 10,
        fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: big ? 30 : 22,
        color: rank === 1 ? '#fff' : K.muted, letterSpacing: -1,
      }}>{rank}</div>
    </div>
  );
}

function SquadRow({ squad, onClick }) {
  return (
    <KCard pad={14} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16, background: K.mintSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 14,
          color: K.muted, letterSpacing: -0.3,
        }}>{squad.rank}</div>
        <KCrest {...squad.crest} size={40}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: K.ink }}>{squad.name}</div>
          <div style={{ fontSize: 11, color: K.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{squad.members} members</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: K.muted }}/>
            <span style={{ color: K.greenDeep, fontWeight: 700 }}>{squad.active} active</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 20, color: K.greenDeep, letterSpacing: -0.3 }}>
            {squad.weekScore.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>pts</div>
        </div>
        <Ic.Chevron size={14} color={K.muted}/>
      </div>
    </KCard>
  );
}

// ─── Squad Detail — Overview / Arena / Chat ────────────────────
function KineticSquadDetail({ squad, onBack, onStartVote }) {
  const [tab, setTab] = React.useState('overview');
  return (
    <div style={{ padding: '0 20px 140px', fontFamily: K.font.ui }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: K.r.pill, border: 'none', background: K.card,
          boxShadow: K.shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ic.Back size={18} color={K.ink}/>
        </button>
        <div style={{ flex: 1 }}>
          <KEyebrow>{squad.members} members · Rank {squad.rank}</KEyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <KCrest {...squad.crest} size={32}/>
            <KDisplay size={26}>{squad.name.toUpperCase()}</KDisplay>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: K.r.pill, background: K.card,
          boxShadow: K.shadow.card, fontSize: 11, fontWeight: 600, color: K.muted,
          fontFamily: K.font.mono, letterSpacing: 0.4,
        }}>
          <Ic.Copy size={12} color={K.muted}/> {squad.tag}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: K.card, borderRadius: K.r.pill, padding: 4, boxShadow: K.shadow.card, marginBottom: 18 }}>
        {['overview','arena','chat'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: K.r.pill,
            background: tab === t ? K.mint : 'transparent',
            color: tab === t ? K.greenDeep : K.muted,
            fontFamily: K.font.ui, fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase', cursor: 'pointer',
            position: 'relative',
          }}>
            {t}
            {t === 'chat' && <span style={{
              position: 'absolute', top: 8, right: 14,
              width: 7, height: 7, borderRadius: 4, background: K.green,
            }}/>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <SquadOverview squad={squad} onStartVote={onStartVote}/>}
      {tab === 'arena' && <SquadArena squad={squad}/>}
      {tab === 'chat' && <SquadChat/>}
    </div>
  );
}

function SquadOverview({ squad, onStartVote }) {
  return (
    <div>
      {/* Score + active stat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10 }}>
        <KCard pad={16} style={{ background: `linear-gradient(135deg, ${K.green}, ${K.greenDeep})`, color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>Squad score</div>
          <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 34, letterSpacing: -1, marginTop: 4 }}>
            {squad.weekScore.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginTop: 4 }}>this week</div>
        </KCard>
        <KCard pad={16}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: K.muted }}>Active</div>
          <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 34, color: K.ink, letterSpacing: -1, marginTop: 4 }}>
            {squad.active}<span style={{ color: K.muted, fontSize: 20 }}>/{squad.members}</span>
          </div>
          <div style={{ fontSize: 11, color: K.muted, fontWeight: 600, marginTop: 4 }}>today</div>
        </KCard>
      </div>

      {/* Lineup */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <KEyebrow>Squad lineup</KEyebrow>
          <button onClick={onStartVote} style={{
            background: 'none', border: 'none', color: K.greenDeep,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Ic.Vote size={14} color={K.greenDeep}/> START VOTE
          </button>
        </div>
        <KCard pad={14}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {squad.exercises.map(exId => {
              const ex = EXERCISES.find(e => e.id === exId);
              const Icon = ExIcons[ex.icon];
              return (
                <div key={exId} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: K.r.pill, background: K.mintSoft,
                }}>
                  <Icon size={16} color={K.greenDeep}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: K.greenInk }}>{ex.name}</span>
                </div>
              );
            })}
          </div>
        </KCard>
      </div>

      {/* Members */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>Members · sorted by week</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MONSTERS_MEMBERS.sort((a,b) => b.weekScore - a.weekScore).map((m, i) => (
            <KCard key={m.name} pad={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
                  fontSize: 14, color: i === 0 ? K.greenDeep : K.muted, textAlign: 'center',
                }}>{i + 1}</div>
                <KAvatar name={m.name} size={36} color={m.color}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: K.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.first === 'You' ? 'You' : m.name}
                    {m.role === 'owner' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: K.greenDeep, background: K.mint, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Owner</span>}
                    {m.streak >= 5 && <Ic.Flame size={12} color={K.danger}/>}
                  </div>
                  <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, marginTop: 1, letterSpacing: 0.4 }}>
                    {m.streak}-week streak · {TIERS.find(t => t.id === m.tier)?.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 18, color: K.greenDeep, letterSpacing: -0.3 }}>
                    {m.weekScore.toLocaleString()}
                  </div>
                </div>
              </div>
            </KCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function SquadArena({ squad }) {
  const members = [...MONSTERS_MEMBERS].sort((a,b) => b.weekScore - a.weekScore);
  const max = members[0].weekScore;
  return (
    <div>
      {/* Head to head chart */}
      <KCard pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Head to head</div>
            <KDisplay size={18} style={{ marginTop: 4 }}>WEEK RACE</KDisplay>
          </div>
          <div style={{ fontSize: 10, color: K.muted, fontWeight: 700 }}>Apr 13 – 19</div>
        </div>

        {/* race bars */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.slice(0, 4).map((m, i) => (
            <div key={m.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <KAvatar name={m.name} size={22} color={m.color}/>
                <span style={{ fontSize: 12, fontWeight: 700, color: K.ink, flex: 1 }}>{m.first}</span>
                <span style={{ fontFamily: K.font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 14, color: K.greenDeep }}>{m.weekScore.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: '#EFEFEF', overflow: 'hidden' }}>
                <div style={{
                  width: `${(m.weekScore / max) * 100}%`, height: '100%',
                  background: i === 0 ? `linear-gradient(90deg, ${K.green}, ${K.greenDeep})` : m.color,
                  borderRadius: 4, transition: 'width 1s',
                  boxShadow: i === 0 ? `0 0 10px ${K.green}88` : 'none',
                }}/>
              </div>
            </div>
          ))}
        </div>
      </KCard>

      {/* Breakdown by exercise */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>By exercise</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {squad.exercises.slice(0, 3).map(exId => {
            const ex = EXERCISES.find(e => e.id === exId);
            const Icon = ExIcons[ex.icon];
            const leader = members[Math.floor(Math.random() * 4)];
            const total = Math.floor(600 + Math.random() * 1400);
            return (
              <KCard key={exId} pad={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: K.mintSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color={K.greenDeep}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: K.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, marginTop: 1, letterSpacing: 0.3 }}>
                      Leader · <b style={{ color: leader.color }}>{leader.first}</b>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: K.font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 16, color: K.greenDeep }}>
                      {total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{ex.unit}</div>
                  </div>
                </div>
              </KCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SquadChat() {
  const [msg, setMsg] = React.useState('');
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);
  return (
    <div style={{
      background: K.card, borderRadius: K.r.lg, boxShadow: K.shadow.card,
      display: 'flex', flexDirection: 'column', height: 520,
    }}>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* grouped */}
        {CHAT.map((m, i) => {
          const prev = CHAT[i-1];
          const samePerson = prev && prev.who === m.who;
          if (m.mine) {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '75%', padding: '8px 12px', borderRadius: 16,
                  background: K.mint, color: K.greenInk,
                  fontSize: 13, lineHeight: 1.35,
                  borderBottomRightRadius: 4,
                }}>{m.text}</div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {!samePerson ? (
                <KAvatar name={m.who} size={28} color={FRIENDS.find(f => f.first === m.who)?.color}/>
              ) : <div style={{ width: 28 }}/>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '75%' }}>
                {!samePerson && <div style={{ fontSize: 10, fontWeight: 700, color: K.muted, marginLeft: 4, letterSpacing: 0.3 }}>{m.who}</div>}
                <div style={{
                  padding: '8px 12px', borderRadius: 16, background: '#F3F4F4', color: K.ink,
                  fontSize: 13, lineHeight: 1.35, borderBottomLeftRadius: 4,
                }}>{m.text}</div>
              </div>
            </div>
          );
        })}
        {/* typing indicator */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <KAvatar name="Akash" size={28} color={FRIENDS[1].color}/>
          <div style={{
            padding: '10px 14px', borderRadius: 16, background: '#F3F4F4',
            display: 'flex', gap: 4, borderBottomLeftRadius: 4,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 3, background: K.mutedSoft,
                animation: `typing 1.2s ${i * 0.15}s infinite`,
              }}/>
            ))}
          </div>
        </div>
        <style>{`@keyframes typing { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-2px)} }`}</style>
      </div>
      {/* input */}
      <div style={{ borderTop: `1px solid ${K.line}`, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Message Monsters" style={{
          flex: 1, border: 'none', outline: 'none', background: '#F3F4F4',
          padding: '10px 14px', borderRadius: K.r.pill,
          fontFamily: K.font.ui, fontSize: 13,
        }}/>
        <button style={{
          width: 40, height: 40, borderRadius: 20, background: K.green, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 3px 8px rgba(31,179,122,0.35)',
        }}>
          <Ic.Send size={16} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { KineticSquads, KineticSquadDetail });
