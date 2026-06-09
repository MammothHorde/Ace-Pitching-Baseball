import { CloserScenario } from './GameTypes';

export const CLOSER_SCENARIOS: CloserScenario[] = [
  {
    id: 'classic_save',
    label: 'Classic Save',
    pressureLabel: 'SAVE SITUATION',
    inning: 9,
    leadRuns: 1,
    startingOuts: 0,
    runners: [false, false, false],
    description: '9th inning, 1-run lead, bases empty. Three outs to close it out.',
    weight: 20,
  },
  {
    id: 'bases_loaded',
    label: 'Bases Loaded',
    pressureLabel: 'BASES LOADED — NO MARGIN',
    inning: 9,
    leadRuns: 1,
    startingOuts: 1,
    runners: [true, true, true],
    description: '9th inning, 1-run lead, bases loaded. One run ends it.',
    weight: 15,
  },
  {
    id: 'two_on',
    label: 'Runners on the Corners',
    pressureLabel: 'RUNNERS ON — HOLD YOUR LEAD',
    inning: 9,
    leadRuns: 2,
    startingOuts: 0,
    runners: [true, false, true],
    description: '9th inning, 2-run lead, runners on 1st and 3rd.',
    weight: 20,
  },
  {
    id: 'hold_situation',
    label: '8th Inning Hold',
    pressureLabel: 'HOLD SITUATION',
    inning: 8,
    leadRuns: 2,
    startingOuts: 0,
    runners: [true, true, false],
    description: '8th inning, 2-run lead, runners on 1st and 2nd. Bridge to the closer.',
    weight: 25,
  },
  {
    id: 'three_run_lead',
    label: '3-Run Cushion',
    pressureLabel: 'PROTECT THE LEAD',
    inning: 9,
    leadRuns: 3,
    startingOuts: 0,
    runners: [false, true, false],
    description: '9th inning, 3-run lead, runner on 2nd. Comfortable but stay sharp.',
    weight: 20,
  },
];

export function pickScenario(): CloserScenario {
  const totalWeight = CLOSER_SCENARIOS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const scenario of CLOSER_SCENARIOS) {
    roll -= scenario.weight;
    if (roll <= 0) return scenario;
  }
  return CLOSER_SCENARIOS[0];
}
