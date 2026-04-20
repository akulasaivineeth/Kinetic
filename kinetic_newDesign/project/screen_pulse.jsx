// Pulse screen — the "home" / daily ritual
// Redesign focus: ONE hero moment (today's score ring), stacked supporting cards below

const { K, Ic, ExIcons } = window;

function KineticPulse({ onOpenExercise, onSubmit }) {
  const [tier, setTier] = React.useState(() => tierFor(ME.score));

  // Today score animated on mount
  const [animated, setAnimated] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now(), dur = 1200;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(ME.todayScore * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const todayGoal = 600;
  const ringPct = Math.min(1, ME.todayScore / todayGoal);

  return (
    <div style={{ padding: '0 20px 140px', fontFamily: K.font.ui }}>
      {/* Eyebrow */}
      <div style={{ marginBottom: 6 }}>
        <KEyebrow>Today · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</KEyebrow>
      </div>

      {/* Hero ring */}
      <KCard pad={22} style={{ marginTop: 10, position: 'relative', overflow: 'hidden' }}>
        {/* subtle gradient wash */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 180, height: 180,
          borderRadius: '50%', background: `radial-gradient(circle, ${K.mint} 0%, transparent 70%)`,
          opacity: 0.7, pointerEvents: 'none',
        }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <KRing pct={ringPct} size={138} stroke={12} color={K.green}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
                fontSize: 38, color: K.ink, lineHeight: 1, letterSpacing: -1,
              }}>{animated}</div>
              <div style={{ fontSize: 10, color: K.muted, fontWeight: 600, letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' }}>
                of {todayGoal} pts
              </div>
            </div>
          </KRing>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase' }}>Today's effort</div>
            <KDisplay size={24} style={{ marginTop: 4, marginBottom: 10 }}>KEEP<br/>GOING</KDisplay>
            <div style={{ display: 'flex', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Streak</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Ic.Flame size={14} color={K.danger}/>
                  <span style={{ fontSize: 20, fontWeight: 800, color: K.ink, fontFamily: K.font.display, fontStyle: 'italic' }}>{ME.streak}</span>
                  <span style={{ fontSize: 11, color: K.muted, fontWeight: 600 }}>wk</span>
                </div>
              </div>
              <div style={{ width: 1, background: K.line }}/>
              <div>
                <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Rank</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: K.greenDeep, fontFamily: K.font.display, fontStyle: 'italic', marginTop: 2 }}>#4</div>
              </div>
            </div>
          </div>
        </div>
      </KCard>

      {/* Today's logged exercises */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <KEyebrow>Logged today</KEyebrow>
            <KDisplay size={22} style={{ marginTop: 4 }}>4 SESSIONS</KDisplay>
          </div>
          <button onClick={onSubmit} style={{
            background: K.green, color: '#fff', border: 'none', borderRadius: K.r.pill,
            padding: '8px 14px', fontFamily: K.font.ui, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.6, textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 10px rgba(31,179,122,0.3)',
          }}>
            <Ic.Plus size={14} color="#fff"/> LOG
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ME.todayLogged.map(l => {
            const ex = EXERCISES.find(e => e.id === l.id);
            const Icon = ExIcons[ex.icon];
            const pts = Math.round(l.value * ex.pts);
            return (
              <KCard key={l.id} pad={14} onClick={() => onOpenExercise?.(ex)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: K.mintSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={26} color={K.greenDeep}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{ex.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                      <span style={{
                        fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
                        fontSize: 22, color: K.ink, letterSpacing: -0.5,
                      }}>{ex.unit === 'sec' ? `${Math.floor(l.value/60)}:${String(l.value%60).padStart(2,'0')}` : l.value}</span>
                      <span style={{ fontSize: 12, color: K.muted, fontWeight: 600 }}>{ex.unit}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Points</div>
                    <div style={{
                      fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic',
                      fontSize: 18, color: K.greenDeep, letterSpacing: -0.3, marginTop: 2,
                    }}>{pts}</div>
                  </div>
                </div>
              </KCard>
            );
          })}
        </div>
      </div>

      {/* Weekly bar chart */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <KEyebrow>This week</KEyebrow>
            <KDisplay size={22} style={{ marginTop: 4 }}>1,217 PTS</KDisplay>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ic.Sparkle size={12} color={K.greenDeep}/>
            <span style={{ fontSize: 11, color: K.greenDeep, fontWeight: 700, letterSpacing: 0.4 }}>+42% vs last</span>
          </div>
        </div>
        <KCard pad={18}>
          <WeekBars/>
        </KCard>
      </div>

      {/* Tier progress */}
      <div style={{ marginTop: 28 }}>
        <KEyebrow>Progression</KEyebrow>
        <KDisplay size={22} style={{ marginTop: 4, marginBottom: 12 }}>TIER UP</KDisplay>
        <KCard pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px ${tier.color}66`,
            }}>
              <Ic.Trophy size={24} color="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Current tier</div>
              <div style={{ fontFamily: K.font.display, fontWeight: 900, fontStyle: 'italic', fontSize: 22, color: K.ink, marginTop: 2 }}>{tier.name.toUpperCase()}</div>
            </div>
            {tier.next && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Next</div>
                <div style={{ fontFamily: K.font.ui, fontSize: 13, fontWeight: 700, color: tier.next.color, marginTop: 2 }}>{tier.next.name}</div>
              </div>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#EFEFEF', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.round(tier.pct * 100)}%`,
              background: `linear-gradient(90deg, ${tier.color}, ${tier.next?.color || tier.color})`,
              borderRadius: 3, transition: 'width 1s',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, fontFamily: K.font.ui, color: K.muted }}>
            <span>{ME.score.toLocaleString()} pts</span>
            {tier.next && <span>{tier.next.min.toLocaleString()} pts</span>}
          </div>
        </KCard>
      </div>

      {/* Insights */}
      <div style={{ marginTop: 28 }}>
        <KEyebrow>Insights</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <KCard pad={14}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: K.mintSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Ic.Sparkle size={14} color={K.greenDeep}/>
              </div>
              <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
                You're <b style={{ color: K.greenDeep }}>4 push-ups</b> away from a personal best. Want to chase it?
              </div>
            </div>
          </KCard>
          <KCard pad={14}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: '#FCF3E4',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Ic.Flame size={14} color="#D38B2A"/>
              </div>
              <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
                Amit pulled <b>+320 pts</b> ahead in Monsters this week. Close the gap.
              </div>
            </div>
          </KCard>
        </div>
      </div>
    </div>
  );
}

function WeekBars() {
  const max = Math.max(...WEEK_DATA.scores, ...WEEK_DATA.last);
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120 }}>
        {WEEK_DATA.scores.map((v, i) => {
          const last = WEEK_DATA.last[i];
          const isToday = i === 6;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 9, color: isToday ? K.greenDeep : K.mutedSoft, fontWeight: 700, letterSpacing: 0.5, height: 12 }}>
                {v > 0 ? v : ''}
              </div>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, justifyContent: 'center' }}>
                {/* last week — faded */}
                <div style={{
                  width: 6, height: `${(last / max) * 100}%`,
                  background: K.lineStrong, borderRadius: 3, minHeight: last > 0 ? 3 : 0,
                }}/>
                {/* this week */}
                <div style={{
                  width: 14, height: `${(v / max) * 100}%`,
                  background: isToday ? K.green : K.greenDeep,
                  borderRadius: 4, minHeight: v > 0 ? 3 : 0,
                  opacity: v === 0 ? 0.2 : 1,
                  boxShadow: isToday ? `0 0 12px ${K.green}88` : 'none',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {WEEK_DATA.days.map((d, i) => (
          <div key={d} style={{
            flex: 1, textAlign: 'center', fontSize: 10, fontFamily: K.font.ui,
            color: i === 6 ? K.greenDeep : K.mutedSoft,
            fontWeight: i === 6 ? 700 : 500,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${K.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: K.greenDeep, borderRadius: 2 }}/>
          <span style={{ fontSize: 10, color: K.muted, fontWeight: 600, letterSpacing: 0.4 }}>This week</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: K.lineStrong, borderRadius: 2 }}/>
          <span style={{ fontSize: 10, color: K.muted, fontWeight: 600, letterSpacing: 0.4 }}>Last week</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KineticPulse });
