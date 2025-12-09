import { memo } from 'react';
import { Users, Shield, Clock } from 'lucide-react';

interface PartnerData {
    id: string;
    firstName: string;
    lastName: string;
    currentStreak: number;
    combinedStreak: number;
    lastSeen?: string;
}

interface PartnerCardProps {
    partner: PartnerData;
    onNudge: (partnerId: string) => void;
    onStudyTogether: (partnerId: string) => void;
    onChallenge: (partnerId: string) => void;
    formatLastSeen: (dateString?: string) => string;
}

export const PartnerCard = memo<PartnerCardProps>(({
    partner,
    onNudge,
    onStudyTogether,
    onChallenge,
    formatLastSeen,
}) => {
    return (
        <div className="bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Study Partner</h2>
                        <p className="text-primary-100 text-xs font-medium">Together you go further</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold tracking-tighter">{partner.combinedStreak}</div>
                    <div className="text-primary-100 text-[10px] font-bold uppercase tracking-wider">
                        Combined Streak
                    </div>
                </div>
            </div>

            {/* Partner Info */}
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md border border-white/10 relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-bold flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        {partner.firstName} {partner.lastName}
                    </h3>
                    <div className="flex items-center text-xs bg-black/20 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatLastSeen(partner.lastSeen)}
                    </div>
                </div>

                <div className="flex items-center text-primary-100 font-medium text-sm mb-4">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                    {partner.currentStreak} day streak
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onNudge(partner.id)}
                        className="py-2.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl font-bold transition-all text-sm touch-manipulation"
                    >
                        Nudge ⚡
                    </button>
                    <button
                        onClick={() => onStudyTogether(partner.id)}
                        className="py-2.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl font-bold transition-all text-sm touch-manipulation"
                    >
                        Study 📚
                    </button>
                    <button
                        onClick={() => onChallenge(partner.id)}
                        className="py-2.5 col-span-2 bg-white text-primary-600 hover:bg-white/90 active:scale-95 rounded-xl font-bold transition-all text-sm touch-manipulation"
                    >
                        Challenge ⚔️
                    </button>
                </div>
            </div>
        </div>
    );
});

PartnerCard.displayName = 'PartnerCard';
