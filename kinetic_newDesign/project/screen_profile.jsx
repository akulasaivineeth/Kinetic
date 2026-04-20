// Profile screen — identity + settings + progression

const { K, Ic } = window;

function KineticProfile({ onOpenTier }) {
  const tier = tierFor(ME.score);
  return (
    <div style={{ padding: '0 20px 140px', fontFamily: K.font.ui }}>
      <KEyebrow>You</KEyebrow>
      <KDisplay size={36} style={{ marginTop: 4 }}>PROFILE</KDisplay>

      {/* Identity card */}
      <KCard pad={22} style={{ marginTop: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${tier.color}33 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <KAvatar name={ME.name} size={72} color={K.green} ring={tier.color}/>
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              padding: '3px 8px', borderRadius: K.r.pill,
              background: tier.color, color: '#fff',
              fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}>{tier.name}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: K.font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: K.ink, letterSpacing: -0.3 }}>
              {ME.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: K.muted, fontWeight: 600, marginTop: 2 }}>@{ME.handle} · Elite member</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <Stat label="Total" value={ME.score.toLocaleString()}/>
              <Stat label="Streak" value={`${ME.streak}w`} icon={<Ic.Flame size={10} color={K.danger}/>}/>
              <Stat label="Rank" value="#4" color={K.greenDeep}/>
            </div>
          </div>
        </div>
      </KCard>

      {/* Tier bar */}
      <KCard pad={16} style={{ marginTop: 12 }} onClick={onOpenTier}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Ic.Trophy size={18} color={tier.color}/>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: K.ink }}>
            {ME.score.toLocaleString()} / {tier.next?.min.toLocaleString()} pts
          </div>
          <div style={{ fontSize: 11, color: K.muted, fontWeight: 600 }}>→ {tier.next?.name}</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#EFEFEF', overflow: 'hidden' }}>
          <div style={{
            width: `${tier.pct * 100}%`, height: '100%',
            background: `linear-gradient(90deg, ${tier.color}, ${tier.next?.color || tier.color})`,
            borderRadius: 3,
          }}/>
        </div>
      </KCard>

      {/* Settings list */}
      <div style={{ marginTop: 26 }}>
        <KEyebrow>Settings</KEyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Row icon={<Ic.Target size={16} color={K.greenDeep}/>} label="Performance goals" detail="4 active"/>
          <Row icon={<Ic.Squads size={16} color={K.greenDeep}/>} label="Sharing" detail="3 active"/>
          <Row icon={<Ic.Calendar size={16} color={K.greenDeep}/>} label="Weekly reset" detail="Mon 00:00"/>
          <Row icon={<Ic.Bell size={16} color={K.greenDeep}/>} label="Notifications" detail="On"/>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <KEyebrow>Integrations</KEyebrow>
        <div style={{ marginTop: 10 }}>
          <Row icon={<Ic.Pulse size={16} color={K.greenDeep}/>} label="Apple Health" detail="Connected" last/>
        </div>
      </div>

      <div style={{ marginTop: 26, textAlign: 'center', fontSize: 10, color: K.mutedSoft, letterSpacing: 1, fontWeight: 700 }}>
        KINETIC · v4.2.0 · BUILD 2026
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: K.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
        {icon}
        <span style={{
          fontFamily: K.font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 16,
          color: color || K.ink, letterSpacing: -0.3,
        }}>{value}</span>
      </div>
    </div>
  );
}

function Row({ icon, label, detail, last }) {
  return (
    <div style={{
      background: K.card, borderRadius: K.r.md, padding: '12px 14px',
      boxShadow: K.shadow.card, display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', marginBottom: 8,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: K.mintSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: K.ink }}>{label}</div>
      <div style={{ fontSize: 12, color: K.muted, fontWeight: 600 }}>{detail}</div>
      <Ic.Chevron size={12} color={K.mutedSoft}/>
    </div>
  );
}

Object.assign(window, { KineticProfile });
