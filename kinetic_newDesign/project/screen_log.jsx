// Log screen — compose today's session + library picker + Submit w/ reveal animation

const { K, Ic, ExIcons } = window;

function KineticLog({ onSubmit, onBack }) {
  // active exercises — user's chosen ones to track (default 4 + allow adding from library)
  const [active, setActive] = React.useState([
    { id: 'pushup', value: 61 },
    { id: 'squat', value: 100 },
    { id: 'plank', value: 75 },
    { id: 'run', value: 3.2 },
  ]);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [revealing, setRevealing] = React.useState(false);

  const setValue = (id, v) => setActive(a => a.map(x => x.id === id ? { ...x, value: v } : x));
  const addExercise = (exId) => {
    if (active.find(a => a.id === exId)) return;
    setActive(a => [...a, { id: exId, value: 0 }]);
  };
  const removeExercise = (exId) => setActive(a => a.filter(x => x.id !== exId));

  const totalPoints = active.reduce((sum, a) => {
    const ex = EXERCISES.find(e => e.id === a.id);
    return sum + Math.round(a.value * (ex?.pts || 0));
  }, 0);

  return (
    <div style={{ padding: '0 20px 160px', fontFamily: K.font.ui, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: K.r.pill, border: 'none', background: K.card,
          boxShadow: K.shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ic.Back size={18} color={K.ink}/>
        </button>
        <div>
          <KEyebrow>Session · Today</KEyebrow>
          <KDisplay size={26} style={{ marginTop: 2 }}>LOG IT</KDisplay>
        </div>
      </div>

      {/* Running total */}
      <KCard pad={16} style={{
        background: `linear-gradient(135deg, ${K.mintSoft}, #fff)`,
        border: `1px solid ${K.mint}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Projected</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 34, color: K.ink, letterSpacing: -1 }}>
              {totalPoints}
            </span>
            <span style={{ fontSize: 12, color: K.greenDeep, fontWeight: 700, letterSpacing: 0.4 }}>pts</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Rank if submitted</div>
          <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 20, color: K.greenDeep, marginTop: 2 }}>#3 ↑1</div>
        </div>
      </KCard>

      {/* Active exercise cards */}
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map(a => (
          <LogRow key={a.id} active={a} onChange={(v) => setValue(a.id, v)} onRemove={() => removeExercise(a.id)}/>
        ))}

        {/* Add exercise */}
        <button onClick={() => setLibraryOpen(true)} style={{
          background: K.card, border: `1.5px dashed ${K.lineStrong}`, borderRadius: K.r.lg,
          padding: '18px', fontFamily: K.font.ui, fontSize: 13, fontWeight: 700, letterSpacing: 0.6,
          color: K.muted, textTransform: 'uppercase', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ic.Plus size={16} color={K.muted}/> ADD EXERCISE
        </button>
      </div>

      {/* Submit */}
      <button onClick={() => setRevealing(true)} style={{
        marginTop: 28, width: '100%',
        background: K.green, color: '#fff', border: 'none', borderRadius: K.r.lg,
        padding: '18px', fontFamily: K.font.ui, fontSize: 14, fontWeight: 800,
        letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: K.shadow.fab,
      }}>
        SUBMIT TO ARENA <Ic.Send size={18} color="#fff"/>
      </button>

      {/* Library sheet */}
      {libraryOpen && (
        <ExerciseLibrary
          active={active.map(a => a.id)}
          onAdd={addExercise}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      {/* Score reveal */}
      {revealing && <ScoreReveal points={totalPoints} onDone={() => { setRevealing(false); onSubmit?.(); }}/>}
    </div>
  );
}

function LogRow({ active, onChange, onRemove }) {
  const ex = EXERCISES.find(e => e.id === active.id);
  const Icon = ExIcons[ex.icon];
  const points = Math.round(active.value * ex.pts);

  const formatSec = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const display = ex.unit === 'sec' ? formatSec(active.value) : active.value;

  const step = ex.unit === 'mi' ? 0.1 : ex.unit === 'sec' ? 15 : 1;
  const bump = (n) => {
    const v = Math.max(0, +(active.value + n).toFixed(ex.unit === 'mi' ? 1 : 0));
    onChange(v);
  };

  return (
    <KCard pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: K.mintSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={K.greenDeep}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{ex.cat}</div>
          <div style={{ fontSize: 14, color: K.ink, fontWeight: 700, marginTop: 1 }}>{ex.name}</div>
        </div>
        <button onClick={onRemove} style={{
          width: 26, height: 26, borderRadius: 13, background: '#F3F4F4', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ic.Close size={12} color={K.muted}/>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => bump(-step)} style={stepperBtn()}>–</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
            fontSize: 44, color: K.ink, letterSpacing: -1, lineHeight: 1,
          }}>{display}</div>
          <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
            {ex.unit} · {points} pts
          </div>
        </div>
        <button onClick={() => bump(+step)} style={stepperBtn()}>+</button>
      </div>
    </KCard>
  );
}

function stepperBtn() {
  return {
    width: 44, height: 44, borderRadius: 22,
    background: K.mintSoft, border: 'none',
    fontFamily: K.font.display, fontWeight: 900, fontSize: 24,
    color: K.greenDeep, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ─── Library sheet ────────────────────────────────────────────
function ExerciseLibrary({ active, onAdd, onClose }) {
  const [cat, setCat] = React.useState('all');
  const [q, setQ] = React.useState('');
  const filtered = EXERCISES.filter(e =>
    (cat === 'all' || e.cat === cat) &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(10,12,11,0.5)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: K.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '14px 20px 120px', maxHeight: '88%', overflow: 'auto',
        boxShadow: K.shadow.pop,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: K.lineStrong }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <KEyebrow>Exercise library</KEyebrow>
            <KDisplay size={24} style={{ marginTop: 4 }}>PICK ONE</KDisplay>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: K.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: 0.4,
          }}>Close</button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: K.card, borderRadius: K.r.pill, padding: '10px 14px',
          boxShadow: K.shadow.card, marginBottom: 12,
        }}>
          <Ic.Search size={16} color={K.muted}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises" style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: K.font.ui, fontSize: 14, color: K.ink,
          }}/>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <KPill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} size="sm" style={{ flexShrink: 0 }}>
              {c.name}
            </KPill>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.map(ex => {
            const Icon = ExIcons[ex.icon];
            const added = active.includes(ex.id);
            return (
              <div key={ex.id} onClick={() => !added && onAdd(ex.id)} style={{
                background: K.card, borderRadius: K.r.md, padding: 14,
                boxShadow: K.shadow.card,
                cursor: added ? 'default' : 'pointer',
                opacity: added ? 0.5 : 1,
                position: 'relative',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: K.mintSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <Icon size={24} color={K.greenDeep}/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: K.ink }}>{ex.name}</div>
                <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 }}>
                  {ex.pts}× per {ex.unit}
                </div>
                {added && (
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
      </div>
    </div>
  );
}

// ─── Score reveal ─────────────────────────────────────────────
function ScoreReveal({ points, onDone }) {
  const [stage, setStage] = React.useState(0); // 0 intro, 1 count, 2 rank, 3 done
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 400);
    const t2 = setTimeout(() => {
      let start = performance.now();
      const dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(points * eased));
        if (p < 1) requestAnimationFrame(tick);
        else setStage(2);
      };
      requestAnimationFrame(tick);
    }, 500);
    const t3 = setTimeout(() => setStage(3), 3200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'linear-gradient(180deg, #0E1A14 0%, #0B0D0C 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 30, color: '#fff',
      animation: 'fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes burstIn { from { opacity: 0; transform: scale(0.3) rotate(-20deg) } to { opacity: 1; transform: scale(1) rotate(0) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.04) } }
      `}</style>

      {/* Rays background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${K.green}22 0%, transparent 55%)`,
        pointerEvents: 'none',
      }}/>

      {/* Eyebrow */}
      <div style={{
        fontFamily: K.font.ui, fontSize: 11, fontWeight: 700,
        letterSpacing: 3, textTransform: 'uppercase',
        color: K.green, marginBottom: 14,
        animation: 'slideUp 0.5s ease both',
      }}>Session Complete</div>

      {/* Big count */}
      <div style={{
        fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
        fontSize: 108, color: '#fff', letterSpacing: -3, lineHeight: 1,
        animation: stage >= 1 ? 'burstIn 0.6s cubic-bezier(.2,1.4,.3,1) both' : 'none',
        textShadow: `0 0 40px ${K.green}88`,
      }}>{shown}</div>
      <div style={{
        fontFamily: K.font.ui, fontSize: 14, fontWeight: 700, color: K.green,
        letterSpacing: 4, textTransform: 'uppercase', marginTop: 6,
      }}>POINTS EARNED</div>

      {/* Rank change */}
      {stage >= 2 && (
        <div style={{
          marginTop: 40, display: 'flex', gap: 20,
          animation: 'slideUp 0.5s ease both',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Rank</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 32, color: 'rgba(255,255,255,0.4)', letterSpacing: -1 }}>#4</span>
              <span style={{ color: K.green, fontSize: 22 }}>→</span>
              <span style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 40, color: K.green, letterSpacing: -1 }}>#3</span>
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }}/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Ic.Flame size={20}/>
              <span style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 40, color: '#fff', letterSpacing: -1 }}>13</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>wk</span>
            </div>
          </div>
        </div>
      )}

      {stage >= 3 && (
        <div style={{
          position: 'absolute', bottom: 40, left: 30, right: 30,
          animation: 'slideUp 0.5s ease both',
        }}>
          <button onClick={onDone} style={{
            width: '100%', background: K.green, color: '#fff', border: 'none', borderRadius: K.r.lg,
            padding: 18, fontFamily: K.font.ui, fontSize: 14, fontWeight: 800,
            letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: K.shadow.fab,
          }}>
            SEE LEADERBOARD
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { KineticLog, ExerciseLibrary, ScoreReveal });
