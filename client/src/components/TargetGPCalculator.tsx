import { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function TargetGPCalculator() {
  const [currentCGPA, setCurrentCGPA] = useState<string>('');
  const [totalUnits, setTotalUnits] = useState<string>('');
  const [currentUnits, setCurrentUnits] = useState<string>('');
  const [targetCGPA, setTargetCGPA] = useState<number>(4.5);
  const [requiredGP, setRequiredGP] = useState<number | null>(null);

  useEffect(() => {
    calculateRequiredGP();
  }, [currentCGPA, totalUnits, currentUnits, targetCGPA]);

  const calculateRequiredGP = () => {
    const cgpa = parseFloat(currentCGPA);
    const tUnits = parseFloat(totalUnits);
    const cUnits = parseFloat(currentUnits);

    if (
      isNaN(cgpa) ||
      isNaN(tUnits) ||
      isNaN(cUnits) ||
      cUnits === 0 ||
      cgpa < 0 ||
      cgpa > 5
    ) {
      setRequiredGP(null);
      return;
    }

    // Formula: (Target * (Total + Current) - (CurrentCGPA * Total)) / Current
    const totalPoints = cgpa * tUnits;
    const targetTotalPoints = targetCGPA * (tUnits + cUnits);
    const requiredPoints = targetTotalPoints - totalPoints;
    const reqGP = requiredPoints / cUnits;

    setRequiredGP(reqGP);
  };

  const getFeedback = (gp: number) => {
    if (gp > 5.0)
      return {
        text: 'Impossible this semester',
        color: 'text-red-500',
        icon: AlertCircle,
        bg: 'bg-red-50 dark:bg-red-900/20',
      };
    if (gp < 0)
      return {
        text: 'You are already above target!',
        color: 'text-green-500',
        icon: CheckCircle2,
        bg: 'bg-green-50 dark:bg-green-900/20',
      };
    if (gp >= 4.5)
      return {
        text: "You need mostly A's",
        color: 'text-purple-600',
        icon: TrendingUp,
        bg: 'bg-purple-50 dark:bg-purple-900/20',
      };
    if (gp >= 3.5)
      return {
        text: "You need mostly B's",
        color: 'text-blue-600',
        icon: TrendingUp,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
      };
    if (gp >= 2.5)
      return {
        text: "You need mostly C's",
        color: 'text-yellow-600',
        icon: TrendingUp,
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      };
    return {
      text: 'Achievable with effort',
      color: 'text-gray-600',
      icon: CheckCircle2,
      bg: 'bg-gray-50 dark:bg-gray-800',
    };
  };

  const feedback = requiredGP !== null ? getFeedback(requiredGP) : null;
  const FeedbackIcon = feedback?.icon || AlertCircle;

  return (
    <div className='max-w-2xl mx-auto p-6 space-y-8'>
      <div className='text-center space-y-2'>
        <div className='inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl mb-4 shadow-sm'>
          <Calculator className='w-8 h-8' />
        </div>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          Target GP Calculator
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Calculate what you need this semester to hit your target CGPA.
        </p>
        <div className='text-sm text-gray-500 dark:text-gray-500 mt-3 max-w-md mx-auto'>
          <p className='font-medium text-gray-700 dark:text-gray-300 mb-2'>
            How to use:
          </p>
          <ol className='text-left space-y-1 list-decimal list-inside'>
            <li>
              Enter your <strong>current CGPA</strong> (from your transcript)
            </li>
            <li>
              Enter <strong>total units</strong> you've completed so far
            </li>
            <li>
              Enter the units you're <strong>taking this semester</strong>
            </li>
            <li>
              Adjust the slider to set your <strong>target CGPA</strong>
            </li>
          </ol>
        </div>
      </div>

      <div className='bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 space-y-8'>
        <div className='grid gap-6 md:grid-cols-3'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Current CGPA
            </label>
            <input
              type='number'
              value={currentCGPA}
              onChange={(e) => setCurrentCGPA(e.target.value)}
              placeholder='e.g. 3.50'
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Total Units Taken
            </label>
            <input
              type='number'
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value)}
              placeholder='e.g. 80'
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Current Units
            </label>
            <input
              type='number'
              value={currentUnits}
              onChange={(e) => setCurrentUnits(e.target.value)}
              placeholder='e.g. 20'
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            />
          </div>
        </div>

        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <label className='text-lg font-medium text-gray-900 dark:text-gray-100'>
              Target CGPA
            </label>
            <span className='text-2xl font-bold text-primary-600 dark:text-primary-400'>
              {targetCGPA.toFixed(2)}
            </span>
          </div>
          <input
            type='range'
            min='0'
            max='5'
            step='0.01'
            value={targetCGPA}
            onChange={(e) => setTargetCGPA(parseFloat(e.target.value))}
            className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600'
          />
          <div className='flex justify-between text-xs text-gray-500 font-medium'>
            <span>0.00</span>
            <span>2.50</span>
            <span>5.00</span>
          </div>
        </div>

        {requiredGP !== null && feedback && (
          <div
            className={`rounded-2xl p-6 ${feedback.bg} border border-transparent transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
          >
            <div className='flex items-start space-x-4'>
              <div
                className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 ${feedback.color}`}
              >
                <FeedbackIcon className='w-6 h-6' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1'>
                  Required Semester GPA
                </p>
                <div className='flex items-baseline space-x-2'>
                  <span
                    className={`text-4xl font-bold tracking-tight ${feedback.color}`}
                  >
                    {requiredGP.toFixed(2)}
                  </span>
                  <span className='text-gray-500 font-medium'>/ 5.00</span>
                </div>
                <p className={`mt-2 font-medium ${feedback.color}`}>
                  {feedback.text}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
