'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './glass-card';
import { Dumbbell, Timer, Route, Zap, ArrowRight, Check } from 'lucide-react';
import { useUpdateGoals } from '@/hooks/use-goals';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [pushupGoal, setPushupGoal] = useState(500);
  const [plankGoal, setPlankGoal] = useState(600);
  const [runGoal, setRunGoal] = useState(15);
  const updateGoals = useUpdateGoals();

  const handleFinish = async () => {
    await updateGoals.mutateAsync({
      pushup_weekly_goal: pushupGoal,
      plank_weekly_goal: plankGoal,
      run_weekly_goal: runGoal,
    });
    localStorage.setItem('kinetic-onboarded', 'true');
    onComplete();
  };

  const steps = [
    {
      title: 'WELCOME TO KINETIC',
      subtitle: 'Track push-ups, squats, plank, and running with friends in a year-long fitness challenge.',
      content: (
        <div className="flex justify-center gap-5 py-6">
          <div className="text-center">
            <Dumbbell size={28} className="text-emerald-500 mx-auto" />
            <p className="text-[10px] text-dark-muted mt-1">PUSH-UPS</p>
          </div>
          <div className="text-center">
            <Zap size={28} className="text-emerald-500 mx-auto" />
            <p className="text-[10px] text-dark-muted mt-1">SQUATS</p>
          </div>
          <div className="text-center">
            <Timer size={28} className="text-emerald-500 mx-auto" />
            <p className="text-[10px] text-dark-muted mt-1">PLANK</p>
          </div>
          <div className="text-center">
            <Route size={28} className="text-emerald-500 mx-auto" />
            <p className="text-[10px] text-dark-muted mt-1">RUNNING</p>
          </div>
        </div>
      ),
    },
    {
      title: 'SET YOUR WEEKLY GOALS',
      subtitle: 'These are your personal targets. You can change them anytime in Profile.',
      content: (
        <div className="space-y-4 py-4">
          {[
            { label: 'Push-ups per week', value: pushupGoal, set: setPushupGoal, suffix: 'reps' },
            { label: 'Plank per week', value: plankGoal, set: setPlankGoal, suffix: 'sec' },
            { label: 'Running per week', value: runGoal, set: setRunGoal, suffix: 'km' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border">
              <span className="text-xs text-dark-text font-semibold">{item.label}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                  className="w-16 text-right text-sm font-bold bg-transparent text-emerald-500 outline-none"
                />
                <span className="text-[10px] text-dark-muted">{item.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'YOU\'RE ALL SET',
      subtitle: 'Log your first workout and start climbing the leaderboard.',
      content: (
        <div className="flex justify-center py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center">
            <Check size={36} className="text-emerald-500" />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg/95 backdrop-blur-xl flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="w-full max-w-sm"
        >
          <GlassCard className="p-6" animate={false}>
            <div className="flex gap-1 mb-6">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-dark-border'}`} />
              ))}
            </div>
            <h2 className="text-xl font-black text-dark-text">{current.title}</h2>
            <p className="text-xs text-dark-muted mt-1">{current.subtitle}</p>
            {current.content}
            <button
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  handleFinish();
                }
              }}
              className="w-full py-3 rounded-xl emerald-gradient font-bold text-sm tracking-wider text-white flex items-center justify-center gap-2 mt-4"
            >
              {step < steps.length - 1 ? (
                <>NEXT <ArrowRight size={16} /></>
              ) : (
                <>START TRAINING <ArrowRight size={16} /></>
              )}
            </button>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
