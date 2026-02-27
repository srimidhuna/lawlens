import React, { useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const RiskCard = ({ clause }) => {
    const [expanded, setExpanded] = useState(false);
    const riskType = clause.risk_level?.toUpperCase();

    const getIcon = () => {
        if (riskType === 'HIGH') return <AlertCircle className="w-4 h-4 text-red-500 mr-2 shrink-0 mt-0.5" />;
        if (riskType === 'MEDIUM') return <HelpCircle className="w-4 h-4 text-yellow-500 mr-2 shrink-0 mt-0.5" />;
        return <CheckCircle className="w-4 h-4 text-green-500 mr-2 shrink-0 mt-0.5" />;
    };

    const getBadgeStyle = () => {
        if (riskType === 'HIGH') return 'bg-red-100 text-red-800';
        if (riskType === 'MEDIUM') return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    return (
        <div className={`p-4 rounded-lg border border-gray-100 transition-colors ${riskType === 'HIGH' ? 'bg-[#FFF9F9]' : 'bg-white hover:bg-gray-50'}`}>
            <div className="flex justify-between items-start">
                <div className="flex">
                    {getIcon()}
                    <div>
                        <h4 className="font-semibold text-gray-900">{clause.clause_text}</h4>
                        <p className="text-sm text-gray-600 mt-1 pr-4 leading-relaxed tracking-wide">
                            {clause.simple_explanation || clause.reason}
                        </p>
                    </div>
                </div>
                <div className={`px-2.5 py-0.5 rounded text-xs font-bold whitespace-nowrap shrink-0 ${getBadgeStyle()}`}>
                    {riskType === 'HIGH' ? 'High Risky' : riskType}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between pl-6 gap-3">
                <button className="flex items-center text-xs font-medium bg-white text-gray-700 py-1.5 px-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                    <svg className="w-3.5 h-3.5 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    Suggest Edit
                </button>

                <div className="flex items-center gap-2">
                    <button className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded transition-colors">
                        Learn More
                    </button>
                    <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pl-6 pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Developer Reason (Backend)</h5>
                    <p className="text-sm text-gray-800 italic">{clause.reason}</p>
                </div>
            )}
        </div>
    );
};

export default RiskCard;
