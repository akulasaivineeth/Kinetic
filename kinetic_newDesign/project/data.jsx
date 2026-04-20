// Fake data + scoring helpers

const EXERCISES = [
  // Strength
  { id: 'pushup',   name: 'Push-ups',     cat: 'strength',  unit: 'reps', icon: 'pushup',  pts: 2 },
  { id: 'squat',    name: 'Squats',       cat: 'strength',  unit: 'reps', icon: 'squat',   pts: 2 },
  { id: 'pullup',   name: 'Pull-ups',     cat: 'strength',  unit: 'reps', icon: 'pullup',  pts: 4 },
  { id: 'dip',      name: 'Dips',         cat: 'strength',  unit: 'reps', icon: 'dip',     pts: 3 },
  { id: 'lunge',    name: 'Lunges',       cat: 'strength',  unit: 'reps', icon: 'lunge',   pts: 2 },
  { id: 'kettlebell', name: 'Kettlebell', cat: 'strength',  unit: 'reps', icon: 'kettlebell', pts: 3 },
  // Core
  { id: 'plank',    name: 'Plank',        cat: 'core',      unit: 'sec',  icon: 'plank',   pts: 1 },
  { id: 'situp',    name: 'Sit-ups',      cat: 'core',      unit: 'reps', icon: 'situp',   pts: 1.5 },
  { id: 'crunch',   name: 'Crunches',     cat: 'core',      unit: 'reps', icon: 'crunch',  pts: 1 },
  { id: 'legraise', name: 'Leg raises',   cat: 'core',      unit: 'reps', icon: 'legraise', pts: 2 },
  { id: 'mountain', name: 'Mtn climbers', cat: 'core',      unit: 'reps', icon: 'mountain', pts: 1 },
  // Cardio
  { id: 'run',      name: 'Run',          cat: 'cardio',    unit: 'mi',   icon: 'run',     pts: 120 },
  { id: 'bike',     name: 'Bike',         cat: 'cardio',    unit: 'mi',   icon: 'bike',    pts: 40 },
  { id: 'row',      name: 'Row',          cat: 'cardio',    unit: 'min',  icon: 'row',     pts: 8 },
  { id: 'swim',     name: 'Swim',         cat: 'cardio',    unit: 'min',  icon: 'swim',    pts: 15 },
  { id: 'jumprope', name: 'Jump rope',    cat: 'cardio',    unit: 'min',  icon: 'jumprope', pts: 10 },
  // HIIT
  { id: 'burpee',   name: 'Burpees',      cat: 'hiit',      unit: 'reps', icon: 'burpee',  pts: 5 },
  { id: 'jack',     name: 'Jumping jacks', cat: 'hiit',     unit: 'reps', icon: 'jumpingjack', pts: 1 },
  { id: 'box',      name: 'Box jumps',    cat: 'hiit',      unit: 'reps', icon: 'box',     pts: 4 },
  // Mobility
  { id: 'yoga',     name: 'Yoga flow',    cat: 'mobility',  unit: 'min',  icon: 'yoga',    pts: 4 },
  { id: 'stretch',  name: 'Stretch',      cat: 'mobility',  unit: 'min',  icon: 'stretch', pts: 2 },
  // Sports
  { id: 'basketball', name: 'Basketball', cat: 'sport',     unit: 'min',  icon: 'basketball', pts: 6 },
  { id: 'soccer',   name: 'Soccer',       cat: 'sport',     unit: 'min',  icon: 'soccer',  pts: 6 },
  { id: 'tennis',   name: 'Tennis',       cat: 'sport',     unit: 'min',  icon: 'tennis',  pts: 5 },
];

const CATEGORIES = [
  { id: 'all',      name: 'All' },
  { id: 'strength', name: 'Strength' },
  { id: 'core',     name: 'Core' },
  { id: 'cardio',   name: 'Cardio' },
  { id: 'hiit',     name: 'HIIT' },
  { id: 'mobility', name: 'Mobility' },
  { id: 'sport',    name: 'Sport' },
];

const TIERS = [
  { id: 'bronze',   name: 'Bronze',   min: 0,     color: '#CD7F32' },
  { id: 'silver',   name: 'Silver',   min: 2500,  color: '#B8BCC2' },
  { id: 'gold',     name: 'Gold',     min: 6000,  color: '#E3B341' },
  { id: 'platinum', name: 'Platinum', min: 12000, color: '#6BB6BF' },
  { id: 'diamond',  name: 'Diamond',  min: 25000, color: '#7A9EF0' },
  { id: 'elite',    name: 'Elite',    min: 50000, color: '#1FB37A' },
];

function tierFor(score) {
  let t = TIERS[0];
  for (const tier of TIERS) if (score >= tier.min) t = tier;
  const next = TIERS[TIERS.indexOf(t) + 1];
  const pct = next ? (score - t.min) / (next.min - t.min) : 1;
  return { ...t, next, pct };
}

const ME = {
  name: 'Sai Vineeth',
  first: 'Sai',
  handle: 'sai',
  score: 9240,
  weekScore: 1217,
  todayScore: 420,
  streak: 12,
  weeklyGoalPct: 0.68,
  // today's logged exercises
  todayLogged: [
    { id: 'pushup', value: 61 },
    { id: 'squat', value: 100 },
    { id: 'plank', value: 75 },
    { id: 'run', value: 3.2 },
  ],
};

const FRIENDS = [
  { name: 'Amit Anand',    first: 'Amit',  color: '#6B7FD8', weekScore: 2292, streak: 8,  tier: 'platinum' },
  { name: 'Akash Deep',    first: 'Akash', color: '#E07A5F', weekScore: 2188, streak: 5,  tier: 'platinum' },
  { name: 'Ram Kandimalla', first: 'Ram',   color: '#D4A373', weekScore: 1399, streak: 3,  tier: 'gold' },
  { name: 'Sai Vineeth',   first: 'You',    color: '#1FB37A', weekScore: 1217, streak: 12, tier: 'gold' },
  { name: 'Neha Rao',      first: 'Neha',  color: '#9D4EDD', weekScore: 980,  streak: 4,  tier: 'gold' },
  { name: 'Vikram Joshi',  first: 'Vik',   color: '#2A9D8F', weekScore: 742,  streak: 2,  tier: 'silver' },
];

const SQUADS = [
  {
    id: 'monsters', name: 'Monsters', tag: '28B194',
    crest: { shape: 'shield', emblem: 'bolt', color: '#1FB37A' },
    members: 6, weekScore: 8812, rank: 1, tier: 'diamond',
    exercises: ['pushup', 'squat', 'run', 'plank', 'pullup'],
    active: 4,
  },
  {
    id: 'dawn', name: 'Dawn Patrol', tag: '7FA33E',
    crest: { shape: 'chevron', emblem: 'peak', color: '#E07A5F' },
    members: 8, weekScore: 7220, rank: 2, tier: 'platinum',
    exercises: ['run', 'bike', 'swim'],
    active: 6,
  },
  {
    id: 'ironcore', name: 'Iron Core', tag: 'A32F1D',
    crest: { shape: 'hex', emblem: 'cross', color: '#6B7FD8' },
    members: 5, weekScore: 5890, rank: 3, tier: 'platinum',
    exercises: ['pushup', 'pullup', 'burpee', 'plank'],
    active: 3,
  },
  {
    id: 'mileclub', name: 'The Mile Club', tag: 'BB71AF',
    crest: { shape: 'circle', emblem: 'wave', color: '#9D4EDD' },
    members: 12, weekScore: 5102, rank: 4, tier: 'gold',
    exercises: ['run', 'bike'],
    active: 7,
  },
  {
    id: 'hyrox', name: 'HYROX Wannabes', tag: '4E2C2A',
    crest: { shape: 'diamond', emblem: 'bolt', color: '#E3B341' },
    members: 7, weekScore: 4211, rank: 5, tier: 'gold',
    exercises: ['run', 'row', 'burpee', 'lunge', 'box'],
    active: 4,
  },
];

// Squad squad members used in the main squad (Monsters)
const MONSTERS_MEMBERS = [
  { ...FRIENDS[0], role: 'member', weekScore: 2292 },
  { ...FRIENDS[1], role: 'member', weekScore: 2188 },
  { ...FRIENDS[3], role: 'owner',  weekScore: 1217 },
  { ...FRIENDS[2], role: 'member', weekScore: 1399 },
  { ...FRIENDS[4], role: 'member', weekScore: 980 },
  { ...FRIENDS[5], role: 'member', weekScore: 742 },
];

// Personal weekly trend data (last 7 days, today = 6)
const WEEK_DATA = {
  scores:   [310, 0, 480, 90, 0, 220, 420], // today
  last:     [180, 0, 220, 350, 410, 0, 60],
  days:     ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
};

// Chat messages
const CHAT = [
  { who: 'Amit',  mine: false, text: 'who\'s in for a 6am run tomorrow', time: '8:14 AM' },
  { who: 'Amit',  mine: false, text: 'aiming for 5k', time: '8:14 AM' },
  { who: 'Akash', mine: false, text: 'count me in', time: '8:20 AM' },
  { who: 'Ram',   mine: false, text: 'ill do the squats goal instead 💀', time: '8:32 AM' },
  { who: 'You',   mine: true,  text: 'ok putting it on the board', time: '8:35 AM' },
  { who: 'You',   mine: true,  text: 'amit you\'re on fire this week btw', time: '8:35 AM' },
  { who: 'Amit',  mine: false, text: 'recovery is a cheat code', time: '8:41 AM' },
  { who: 'Neha',  mine: false, text: 'anyone want to add yoga to our lineup?', time: '9:02 AM' },
];

Object.assign(window, {
  EXERCISES, CATEGORIES, TIERS, ME, FRIENDS, SQUADS, MONSTERS_MEMBERS, WEEK_DATA, CHAT, tierFor,
});
