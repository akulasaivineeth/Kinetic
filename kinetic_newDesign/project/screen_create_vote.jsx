// Squad creation (crest builder) + Exercise vote/consensus flow

const { K, Ic, ExIcons } = window;

// ─── Create Squad — crest builder ──────────────────────────────
function KineticCreateSquad({ onBack, onCreated }) {
  const [name, setName] = React.useState('');
  const [shape, setShape] = React.useState('shield');
  const [emblem, setEmblem] = React.useState('bolt');
  const [color, setColor] = React.useState('#1FB37A');

  const shapes = ['shield','hex','circle','diamond','chevron'];
  const emblems = ['bolt','flame','star','peak','wave','cross','arrow','skull'];
  const colors = ['#1FB37A','#E07A5F','#6B7FD8','#9D4EDD','#E3B341','#2A9D8F','#E25C5C','#0E1A14'];

  const canCreate = name.trim().length >= 3;

  return (
    <div style={{ padding: '0 20px 160px', fontFamily: K.font.ui }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: K.r.pill, border: 'none', background: K.card,
          boxShadow: K.shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ic.Back size={18} color={K.ink}/>
        </button>
        <div>
          <KEyebrow>New squad</KEyebrow>
          <KDisplay size={26} style={{ marginTop: 2 }}>CREATE</KDisplay>
        </div>
      </div>

      {/* Preview */}
      <KCard pad={28} style={{
        background: `linear-gradient(180deg, ${K.mintSoft}, #fff)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <KCrest shape={shape} emblem={emblem} color={color} size={120} glow/>
        <div style={{
          fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 28,
          color: K.ink, letterSpacing: -0.5, textAlign: 'center', minHeight: 36,
        }}>{name.trim() ? name.toUpperCase() : 'YOUR SQUAD'}</div>
        <div style={{ fontSize: 11, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {MONSTERS_MEMBERS.length} ready to invite
        </div>
      </KCard>

      {/* Name */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>Name</KEyebrow>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Pick a name" maxLength={24} style={{
          marginTop: 8, width: '100%', border: 'none', outline: 'none',
          background: K.card, borderRadius: K.r.md, padding: '14px 16px',
          fontFamily: K.font.ui, fontSize: 16, fontWeight: 600, color: K.ink,
          boxShadow: K.shadow.card, boxSizing: 'border-box',
        }}/>
      </div>

      {/* Shape */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>Crest shape</KEyebrow>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, overflowX: 'auto' }}>
          {shapes.map(s => (
            <button key={s} onClick={() => setShape(s)} style={pickerBtn(shape === s)}>
              <KCrest shape={s} emblem={emblem} color={shape === s ? color : K.mutedSoft} size={42}/>
            </button>
          ))}
        </div>
      </div>

      {/* Emblem */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>Emblem</KEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
          {emblems.map(e => (
            <button key={e} onClick={() => setEmblem(e)} style={pickerBtn(emblem === e, true)}>
              <KCrest shape={shape} emblem={e} color={emblem === e ? color : K.mutedSoft} size={42}/>
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div style={{ marginTop: 22 }}>
        <KEyebrow>Color</KEyebrow>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 44, height: 44, borderRadius: 22, border: color === c ? `3px solid ${K.ink}` : `3px solid transparent`,
              padding: 3, cursor: 'pointer', background: 'transparent',
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: c }}/>
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => canCreate && onCreated({ name, shape, emblem, color })} disabled={!canCreate} style={{
        marginTop: 32, width: '100%', background: canCreate ? K.green : '#D8DAD9',
        color: '#fff', border: 'none', borderRadius: K.r.lg, padding: '18px',
        fontFamily: K.font.ui, fontSize: 14, fontWeight: 800, letterSpacing: 1.2,
        textTransform: 'uppercase', cursor: canCreate ? 'pointer' : 'not-allowed',
        boxShadow: canCreate ? K.shadow.fab : 'none',
      }}>
        CREATE SQUAD
      </button>
    </div>
  );
}

function pickerBtn(active, flex) {
  return {
    flex: flex ? undefined : '0 0 auto',
    background: active ? K.mint : K.card,
    border: active ? `2px solid ${K.green}` : `1px solid ${K.lineStrong}`,
    borderRadius: K.r.md, padding: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ─── Exercise vote / consensus flow ────────────────────────────
function KineticVote({ onBack, onDone }) {
  // 3 stages: 1 "my picks" → 2 consensus view → 3 locked
  const [stage, setStage] = React.useState(1);
  const [picks, setPicks] = React.useState(new Set(['pushup','squat','run','plank']));
  const maxPicks = 6;

  const toggle = (id) => {
    const next = new Set(picks);
    if (next.has(id)) next.delete(id);
    else if (next.size < maxPicks) next.add(id);
    setPicks(next);
  };

  return (
    <div style={{ padding: '0 20px 160px', fontFamily: K.font.ui }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: K.r.pill, border: 'none', background: K.card,
          boxShadow: K.shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ic.Back size={18} color={K.ink}/>
        </button>
        <div>
          <KEyebrow>Monsters · vote {stage}/3</KEyebrow>
          <KDisplay size={26} style={{ marginTop: 2 }}>
            {stage === 1 ? 'YOUR PICKS' : stage === 2 ? 'CONSENSUS' : 'LOCKED IN'}
          </KDisplay>
        </div>
      </div>

      {/* progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: s <= stage ? K.green : K.lineStrong,
            transition: 'background 0.3s',
          }}/>
        ))}
      </div>

      {stage === 1 && <VoteStage1 picks={picks} toggle={toggle} maxPicks={maxPicks} onNext={() => setStage(2)}/>}
      {stage === 2 && <VoteStage2 myPicks={picks} onNext={() => setStage(3)}/>}
      {stage === 3 && <VoteStage3 onDone={onDone}/>}
    </div>
  );
}

function VoteStage1({ picks, toggle, maxPicks, onNext }) {
  const [cat, setCat] = React.useState('all');
  const filtered = cat === 'all' ? EXERCISES : EXERCISES.filter(e => e.cat === cat);
  return (
    <div>
      <KCard pad={16} style={{ background: K.mintSoft, border: `1px solid ${K.mint}`, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
          Pick up to <b>{maxPicks}</b> exercises you want your squad to track. Everyone votes — majority wins.
        </div>
      </KCard>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
        {CATEGORIES.map(c => (
          <KPill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} size="sm" style={{ flexShrink: 0 }}>{c.name}</KPill>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map(ex => {
          const Icon = ExIcons[ex.icon];
          const picked = picks.has(ex.id);
          return (
            <div key={ex.id} onClick={() => toggle(ex.id)} style={{
              background: picked ? K.mint : K.card, borderRadius: K.r.md, padding: 14,
              boxShadow: K.shadow.card,
              border: picked ? `2px solid ${K.green}` : `2px solid transparent`,
              cursor: 'pointer', position: 'relative',
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: picked ? K.green : K.mintSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
              }}>
                <Icon size={24} color={picked ? '#fff' : K.greenDeep}/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: K.ink }}>{ex.name}</div>
              <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, letterSpacing: 0.3, marginTop: 2 }}>
                {ex.pts}× {ex.unit}
              </div>
              {picked && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 22, height: 22, borderRadius: 11, background: K.green,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ic.Check size={14} color="#fff"/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'sticky', bottom: 90, marginTop: 24,
        display: 'flex', justifyContent: 'center',
      }}>
        <button onClick={onNext} disabled={picks.size === 0} style={{
          background: picks.size ? K.green : '#D8DAD9', color: '#fff', border: 'none',
          borderRadius: K.r.pill, padding: '14px 28px',
          fontFamily: K.font.ui, fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
          textTransform: 'uppercase', cursor: picks.size ? 'pointer' : 'not-allowed',
          boxShadow: picks.size ? K.shadow.fab : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          SUBMIT {picks.size}/{maxPicks} <Ic.Chevron size={12} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

function VoteStage2({ myPicks, onNext }) {
  // Simulate what each member picked
  const votes = {
    pushup: ['You','Amit','Akash','Ram','Neha','Vik'], // 6/6 unanimous
    squat: ['You','Amit','Akash','Ram'], // 4/6
    run: ['You','Amit','Akash','Neha','Vik'], // 5/6
    plank: ['You','Amit','Ram'], // 3/6
    pullup: ['Amit','Akash'], // 2/6
    burpee: ['Amit','Ram'], // 2/6
    yoga: ['Neha'], // 1/6
    bike: ['Vik','Akash'], // 2/6
  };
  const total = 6;
  const sorted = Object.entries(votes).map(([id, voters]) => ({
    id, voters, count: voters.length,
  })).sort((a,b) => b.count - a.count);

  return (
    <div>
      <KCard pad={16} style={{ background: K.mintSoft, border: `1px solid ${K.mint}`, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
          All <b>{total}</b> squad members have voted. Exercises with <b>majority support</b> (≥ 4 votes) will be locked in.
        </div>
      </KCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(v => {
          const ex = EXERCISES.find(e => e.id === v.id);
          const Icon = ExIcons[ex.icon];
          const pct = v.count / total;
          const passing = v.count >= 4;
          return (
            <KCard key={v.id} pad={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: passing ? K.mint : '#F3F4F4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={passing ? K.greenDeep : K.mutedSoft}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: K.ink }}>{ex.name}</div>
                  <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, marginTop: 1, letterSpacing: 0.3 }}>
                    {v.voters.slice(0, 3).join(', ')}{v.voters.length > 3 ? ` +${v.voters.length - 3}` : ''}
                  </div>
                </div>
                <div style={{
                  fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 18,
                  color: passing ? K.greenDeep : K.mutedSoft, letterSpacing: -0.3,
                }}>{v.count}<span style={{ fontSize: 11, color: K.muted }}>/{total}</span></div>
                {passing && <div style={{ width: 20, height: 20, borderRadius: 10, background: K.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic.Check size={12} color="#fff"/>
                </div>}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#EFEFEF', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct * 100}%`, height: '100%',
                  background: passing ? K.green : K.lineStrong,
                  borderRadius: 3, transition: 'width 1s',
                }}/>
              </div>
            </KCard>
          );
        })}
      </div>

      <button onClick={onNext} style={{
        marginTop: 24, width: '100%', background: K.green, color: '#fff', border: 'none',
        borderRadius: K.r.lg, padding: '18px', fontFamily: K.font.ui, fontSize: 14,
        fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
        boxShadow: K.shadow.fab,
      }}>
        LOCK IN LINEUP
      </button>
    </div>
  );
}

function VoteStage3({ onDone }) {
  const finalSet = ['pushup','run','squat'];
  return (
    <div>
      <KCard pad={24} style={{
        background: `linear-gradient(180deg, ${K.mintSoft}, #fff)`,
        border: `1px solid ${K.mint}`, textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: `linear-gradient(135deg, ${K.green}, ${K.greenDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', boxShadow: `0 8px 20px ${K.green}66`,
        }}>
          <Ic.Check size={32} color="#fff"/>
        </div>
        <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 26, color: K.ink, letterSpacing: -0.5 }}>
          LINEUP LOCKED
        </div>
        <div style={{ fontSize: 13, color: K.muted, marginTop: 6, lineHeight: 1.5 }}>
          Your squad will compete across these 3 exercises. Change anytime with a new vote.
        </div>
      </KCard>

      <div style={{ marginTop: 22 }}>
        <KEyebrow>Final lineup</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {finalSet.map(exId => {
            const ex = EXERCISES.find(e => e.id === exId);
            const Icon = ExIcons[ex.icon];
            return (
              <KCard key={exId} pad={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: K.mintSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={26} color={K.greenDeep}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: K.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
                      {ex.pts}× per {ex.unit}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 10px', borderRadius: K.r.pill, background: K.mint,
                    fontSize: 10, fontWeight: 700, color: K.greenDeep, letterSpacing: 0.8, textTransform: 'uppercase',
                  }}>Unanimous</div>
                </div>
              </KCard>
            );
          })}
        </div>
      </div>

      <button onClick={onDone} style={{
        marginTop: 24, width: '100%', background: K.green, color: '#fff', border: 'none',
        borderRadius: K.r.lg, padding: '18px', fontFamily: K.font.ui, fontSize: 14,
        fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
        boxShadow: K.shadow.fab,
      }}>
        BACK TO SQUAD
      </button>
    </div>
  );
}

Object.assign(window, { KineticCreateSquad, KineticVote });
