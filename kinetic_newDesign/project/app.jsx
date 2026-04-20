// Main app shell — routes, phone frame, tab bar

const { K, Ic, KHeader, KStatusBar, KTabBar } = window;

function KineticApp() {
  const [route, setRoute] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('kinetic_route')) || { screen: 'pulse' }; }
    catch { return { screen: 'pulse' }; }
  });
  React.useEffect(() => { localStorage.setItem('kinetic_route', JSON.stringify(route)); }, [route]);

  const go = (r) => setRoute(r);

  // determine active tab for tab bar highlight
  const tab = route.screen === 'pulse' ? 'pulse'
    : route.screen === 'profile' ? 'profile'
    : route.screen === 'log' ? 'log'
    : ['squads','squad','create','vote'].includes(route.screen) ? 'squads'
    : 'pulse';

  const showHeader = ['pulse','profile','squads'].includes(route.screen);
  const showTabBar = !['create','vote'].includes(route.screen);

  return (
    <div data-screen-label={'Kinetic — ' + route.screen} style={{
      position: 'relative', width: '100%', height: '100%',
      background: K.bg, overflow: 'hidden', fontFamily: K.font.ui,
      color: K.ink,
    }}>
      {/* safe-area status bar (fake, underneath phone frame we already have device bezel) */}
      <KStatusBar time="8:33"/>

      {showHeader && (
        <KHeader
          rank="#4"
          notifCount={2}
          onNotifs={() => {}}
        />
      )}

      {/* Scroll area */}
      <div style={{
        position: 'absolute',
        top: showHeader ? 100 : 48, left: 0, right: 0, bottom: 0,
        overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}>
        {route.screen === 'pulse' && (
          <KineticPulse
            onSubmit={() => go({ screen: 'log' })}
            onOpenExercise={() => {}}
          />
        )}
        {route.screen === 'log' && (
          <KineticLog
            onBack={() => go({ screen: 'pulse' })}
            onSubmit={() => go({ screen: 'squads' })}
          />
        )}
        {route.screen === 'squads' && (
          <KineticSquads
            onOpenSquad={(s) => go({ screen: 'squad', squad: s.id })}
            onCreate={() => go({ screen: 'create' })}
            onJoin={() => {}}
          />
        )}
        {route.screen === 'squad' && (
          <KineticSquadDetail
            squad={SQUADS.find(s => s.id === route.squad) || SQUADS[0]}
            onBack={() => go({ screen: 'squads' })}
            onStartVote={() => go({ screen: 'vote' })}
          />
        )}
        {route.screen === 'create' && (
          <KineticCreateSquad
            onBack={() => go({ screen: 'squads' })}
            onCreated={() => go({ screen: 'squads' })}
          />
        )}
        {route.screen === 'vote' && (
          <KineticVote
            onBack={() => go({ screen: 'squad', squad: 'monsters' })}
            onDone={() => go({ screen: 'squad', squad: 'monsters' })}
          />
        )}
        {route.screen === 'profile' && (
          <KineticProfile onOpenTier={() => {}}/>
        )}
      </div>

      {showTabBar && (
        <KTabBar active={tab} onChange={(t) => {
          if (t === 'log') go({ screen: 'log' });
          else if (t === 'pulse') go({ screen: 'pulse' });
          else if (t === 'squads') go({ screen: 'squads' });
          else if (t === 'profile') go({ screen: 'profile' });
        }}/>
      )}
    </div>
  );
}

Object.assign(window, { KineticApp });
