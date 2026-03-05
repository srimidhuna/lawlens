import React from 'react';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

const RiskCard = ({ clause, onClick }) => {
    const riskType = clause.risk_level?.toUpperCase();

    const config = {
        HIGH: {
            icon: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />,
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            card: 'hover:border-rose-200 bg-white',
            label: 'High Risk'
        },
        MEDIUM: {
            icon: <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            card: 'hover:border-amber-200 bg-white',
            label: 'Unusual'
        },
        LOW: {
            icon: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            card: 'hover:border-emerald-200 bg-white',
            label: 'Safe'
        }
    };

    const c = config[riskType] || config.LOW;

    const scoreBadge = clause.risk_score >= 7 ? 'bg-rose-50 text-rose-700 border-rose-200'
        : clause.risk_score >= 4 ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return (
        <div
            onClick={() => onClick && onClick(clause)}
            className={`p-4 rounded-xl border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${c.card}`}
        >
            <div className="flex justify-between items-start gap-3">
                <div className="flex gap-2.5 min-w-0">
                    {c.icon}
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm">{clause.clause_text}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                            {clause.simple_explanation || clause.reason}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${c.badge}`}>
                        {c.label}
                    </span>
                    {clause.risk_score !== undefined && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${scoreBadge}`}>
                            {clause.risk_score}/10
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-2.5 pl-6">
                <span className="text-[11px] text-indigo-400 font-medium">Click to view details →</span>
            </div>
        </div>
    );
};

export default RiskCard;
