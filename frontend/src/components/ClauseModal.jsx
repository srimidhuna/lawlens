import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, ArrowLeft, X } from 'lucide-react';

const ClauseModal = ({ clause, onClose }) => {
    const riskType = clause?.risk_level?.toUpperCase();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!clause) return null;

    const config = {
        HIGH: {
            label: 'HIGH RISK', icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            accent: 'border-l-rose-500'
        },
        MEDIUM: {
            label: 'UNUSUAL', icon: <HelpCircle className="w-6 h-6 text-amber-500" />,
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            accent: 'border-l-amber-500'
        },
        LOW: {
            label: 'SAFE', icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            accent: 'border-l-emerald-500'
        }
    };

    const c = config[riskType] || config.LOW;

    const scoreBadge = (clause.risk_score >= 7) ? 'bg-rose-50 text-rose-700 border-rose-200'
        : (clause.risk_score >= 4) ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return (
        <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`modal-card border-l-4 ${c.accent}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-3 pr-8">
                    {c.icon}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 leading-snug">
                            {clause.clause_text}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${c.badge}`}>
                                {c.label}
                            </span>
                            {clause.risk_score !== undefined && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${scoreBadge}`}>
                                    Score: {clause.risk_score}/10
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 my-5" />

                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Clause Analysis
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{clause.reason}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Detailed Explanation
                        </h4>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            {clause.detailed_explanation || clause.simple_explanation}
                        </p>
                    </div>
                    {clause.rule_override && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 italic">{clause.rule_override}</div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClauseModal;
