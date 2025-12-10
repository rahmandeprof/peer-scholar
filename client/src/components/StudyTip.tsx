import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';

const STUDY_TIPS = [
    {
        tip: "Use the Pomodoro technique: 25 minutes of focused study, 5 minutes break.",
        category: "Focus"
    },
    {
        tip: "Teaching others what you've learned helps solidify your understanding.",
        category: "Learning"
    },
    {
        tip: "Take handwritten notes - they're proven to improve retention.",
        category: "Notes"
    },
    {
        tip: "Review material within 24 hours to boost long-term memory by up to 80%.",
        category: "Memory"
    },
    {
        tip: "Break complex topics into smaller chunks for easier understanding.",
        category: "Strategy"
    },
    {
        tip: "Quiz yourself often - active recall strengthens neural pathways.",
        category: "Testing"
    },
    {
        tip: "Study in different locations to improve memory recall.",
        category: "Environment"
    },
    {
        tip: "Get enough sleep - memory consolidation happens during rest.",
        category: "Health"
    },
    {
        tip: "Connect new information to what you already know.",
        category: "Learning"
    },
    {
        tip: "Use spaced repetition - review at increasing intervals.",
        category: "Memory"
    },
    {
        tip: "Explain concepts out loud, even to yourself.",
        category: "Learning"
    },
    {
        tip: "Start with the hardest material when your energy is highest.",
        category: "Strategy"
    },
    {
        tip: "Take breaks every 45-60 minutes to maintain focus.",
        category: "Focus"
    },
    {
        tip: "Use AI tools to summarize and quiz yourself on materials.",
        category: "Tools"
    },
    {
        tip: "Set specific goals for each study session.",
        category: "Planning"
    }
];

interface StudyTipProps {
    compact?: boolean;
}

export function StudyTip({ compact = false }: StudyTipProps) {
    const [currentTip, setCurrentTip] = useState(STUDY_TIPS[0]);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Select random tip on mount
        const randomIndex = Math.floor(Math.random() * STUDY_TIPS.length);
        setCurrentTip(STUDY_TIPS[randomIndex]);
    }, []);

    const getNewTip = () => {
        setIsAnimating(true);
        setTimeout(() => {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * STUDY_TIPS.length);
            } while (STUDY_TIPS[newIndex].tip === currentTip.tip);
            setCurrentTip(STUDY_TIPS[newIndex]);
            setIsAnimating(false);
        }, 200);
    };

    if (compact) {
        return (
            <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                <Lightbulb className='w-4 h-4 text-yellow-500 shrink-0' />
                <span className='line-clamp-1'>{currentTip.tip}</span>
            </div>
        );
    }

    return (
        <div className='bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200/50 dark:border-yellow-800/30 p-4'>
            <div className='flex items-start gap-3'>
                <div className='p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg shrink-0'>
                    <Lightbulb className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
                </div>

                <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between gap-2 mb-1'>
                        <span className='text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider'>
                            Study Tip
                        </span>
                        <span className='text-[10px] px-2 py-0.5 bg-yellow-200/50 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-400 rounded-full'>
                            {currentTip.category}
                        </span>
                    </div>

                    <p className={`text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        {currentTip.tip}
                    </p>
                </div>

                <button
                    onClick={getNewTip}
                    className='p-1.5 hover:bg-yellow-200/50 dark:hover:bg-yellow-800/30 rounded-lg transition-colors shrink-0'
                    title='Get another tip'
                >
                    <RefreshCw className={`w-4 h-4 text-yellow-600 dark:text-yellow-400 transition-transform ${isAnimating ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
}
