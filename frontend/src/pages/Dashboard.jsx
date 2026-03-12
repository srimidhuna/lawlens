import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { CloudUpload, AlertCircle, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Shield, Download, FileText, Users, ClipboardList, CreditCard, XCircle, Activity, MessageSquare, Send } from 'lucide-react';
import RiskCard from '../components/RiskCard';
import ClauseModal from '../components/ClauseModal';

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [role, setRole] = useState('tenant');
    const [jurisdiction, setJurisdiction] = useState('india');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [selectedClause, setSelectedClause] = useState(null);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Chat with Contract state
    const [contractId, setContractId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatLoading]);

    const handleSendChat = async () => {
        const question = chatInput.trim();
        if (!question || !contractId || chatLoading) return;

        const userMsg = { role: 'user', content: question };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await axios.post('http://localhost:8000/contract-chat', {
                question,
                contract_id: contractId
            });
            setChatMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
        } catch (err) {
            console.error('Chat error:', err);
            setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, something went wrong. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const [openSections, setOpenSections] = useState({
        high: true,
        medium: true,
        low: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const fetchSummary = async (contractText) => {
        setSummaryLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/contract-summary', {
                contract_text: contractText
            });
            setSummary(res.data.summary);
        } catch (err) {
            console.error('Summary error:', err);
            setSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            setError('Please select a PDF file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setSummary(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('role', role);
        formData.append('jurisdiction', jurisdiction);

        try {
            const response = await axios.post('http://localhost:8000/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);

            // Store contract_id for chat
            if (response.data.contract_id) {
                setContractId(response.data.contract_id);
                setChatMessages([]);
            }

            // Fetch summary in background
            if (response.data.extracted_text) {
                fetchSummary(response.data.extracted_text);
            }

            const hasHigh = response.data.clauses?.some(c => c.risk_level === 'HIGH' || c.risk_level === 'high');
            const hasMedium = response.data.clauses?.some(c => c.risk_level === 'MEDIUM' || c.risk_level === 'medium');

            setOpenSections({
                high: hasHigh,
                medium: !hasHigh && hasMedium,
                low: !hasHigh && !hasMedium
            });

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'An error occurred while analyzing the contract.');
        } finally {
            setLoading(false);
        }
    };

    const clauses = result?.clauses || [];
    const highRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'HIGH');
    const mediumRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'MEDIUM');
    const lowRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'LOW');

    const getRiskColor = (level) => {
        switch (level?.toUpperCase()) {
            case 'HIGH': return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
            case 'MEDIUM': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
            case 'LOW': return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
            default: return { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
            {!result ? (
                <div className="bg-white shadow-sm rounded-2xl border-2 border-indigo-200 overflow-hidden">
                    {/* Upload Header */}
                    <div className="px-8 pt-8 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Upload Contract</h1>
                                <p className="text-sm text-gray-500">Select a document and set your parameters to begin risk analysis.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-7">
                        {/* Upload Zone */}
                        <label className="flex justify-center px-6 pt-10 pb-10 border-2 border-indigo-200 border-dashed rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/60 transition-all cursor-pointer group">
                            <div className="space-y-2 text-center">
                                <CloudUpload className="mx-auto h-14 w-14 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <span className="font-semibold text-indigo-600 hover:text-indigo-500">
                                        Drop PDF file here or click to upload
                                    </span>
                                    <input type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                                </div>
                                {file && <p className="text-sm font-semibold text-gray-800 mt-2 bg-white px-3 py-1 rounded-full border border-gray-200 inline-block">{file.name}</p>}
                            </div>
                        </label>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Select User Role *</label>
                                <div className="relative">
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 bg-gray-50 border-2 border-indigo-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
                                    >
                                        <option value="tenant">Tenant</option>
                                        <option value="employee">Employee</option>
                                        <option value="freelancer">Freelancer</option>
                                        <option value="land_owner">Land Owner</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Governing Jurisdiction *</label>
                                <div className="relative">
                                    <select
                                        value={jurisdiction}
                                        onChange={e => setJurisdiction(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 bg-gray-50 border-2 border-indigo-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
                                    >
                                        <option value="india">India</option>
                                        <option value="california">California (USA)</option>
                                        <option value="new_york">New York (USA)</option>
                                        <option value="texas">Texas (USA)</option>
                                        <option value="united_kingdom">United Kingdom</option>
                                        <option value="canada">Canada</option>
                                        <option value="australia">Australia</option>
                                        <option value="singapore">Singapore</option>
                                        <option value="uae">United Arab Emirates</option>
                                        <option value="germany">Germany</option>
                                        <option value="south_africa">South Africa</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-700 text-sm p-4 bg-rose-50 rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !file}
                            className={`w-full flex justify-center py-3.5 px-4 rounded-xl text-base font-bold text-white transition-all shadow-sm ${loading || !file
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] hover:shadow-lg hover:shadow-indigo-500/25'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : 'Start Analysis'}
                        </button>
                    </div>
                </div>
            ) : (
                /* Results */
                <div className="space-y-5">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
                        <button
                            onClick={() => { setResult(null); setContractId(null); setChatMessages([]); setChatInput(''); }}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                        >
                            ← Upload Another
                        </button>
                    </div>

                    {/* Contract Summary Card */}
                    <div className="bg-white shadow-sm rounded-2xl border-2 border-indigo-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                    <FileText className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">Contract Summary</h3>
                            </div>
                        </div>

                        {summaryLoading ? (
                            <div className="p-6 space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 animate-pulse">
                                        <div className="w-8 h-8 bg-gray-200 rounded-lg shrink-0"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : summary ? (
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { icon: <FileText className="w-4 h-4" />, label: 'Contract Type', value: summary.contract_type },
                                        { icon: <Users className="w-4 h-4" />, label: 'Parties Involved', value: summary.parties_involved },
                                        { icon: <ClipboardList className="w-4 h-4" />, label: 'Key Obligations', value: summary.key_obligations },
                                        { icon: <CreditCard className="w-4 h-4" />, label: 'Payment Terms', value: summary.payment_terms },
                                        { icon: <XCircle className="w-4 h-4" />, label: 'Termination', value: summary.termination_conditions },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                                {item.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
                                                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{item.value || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Overall Risk</span>
                                            <p className="mt-1">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold border ${summary.overall_risk?.toUpperCase() === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    summary.overall_risk?.toUpperCase() === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                    {summary.overall_risk || 'N/A'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-400 text-sm italic">
                                Summary could not be generated.
                            </div>
                        )}
                    </div>

                    <div className="bg-white shadow-sm rounded-2xl border-2 border-indigo-200 overflow-hidden">
                        {/* Result Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-green-50">
                            <div className="flex items-center text-emerald-700 font-semibold gap-2 text-sm">
                                <CheckCircle className="w-5 h-5" />
                                Analysis Complete — {clauses.length} clauses analyzed
                            </div>
                            <button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Export Report
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Overall Risk Summary */}
                            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-gray-50 border-2 border-indigo-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRiskColor(result.overall_risk_score).bg} ${getRiskColor(result.overall_risk_score).border} border`}>
                                        <AlertCircle className={`w-5 h-5 ${getRiskColor(result.overall_risk_score).text}`} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Risk</span>
                                        <p className={`text-lg font-bold ${getRiskColor(result.overall_risk_score).text}`}>
                                            {result.overall_risk_score}
                                        </p>
                                    </div>
                                </div>
                                {result.overall_risk_score_numeric !== undefined && (
                                    <div className={`flex flex-col items-center px-5 py-2 rounded-xl font-bold ${getRiskColor(result.overall_risk_score).bg} ${getRiskColor(result.overall_risk_score).border} border`}>
                                        <span className="text-xs font-medium opacity-60 uppercase tracking-wider">Score</span>
                                        <span className={`text-2xl ${getRiskColor(result.overall_risk_score).text}`}>{result.overall_risk_score_numeric}<span className="text-sm opacity-60">/10</span></span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* High Risk */}
                                <div className="border-2 border-rose-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('high')}
                                        className="w-full px-5 py-3.5 flex items-center justify-between bg-rose-50/50 hover:bg-rose-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                                            <h3 className="font-bold text-sm text-rose-900">High Risk Clauses ({highRisk.length})</h3>
                                        </div>
                                        {openSections.high ? <ChevronUp className="text-rose-300 w-5 h-5" /> : <ChevronDown className="text-rose-300 w-5 h-5" />}
                                    </button>
                                    {openSections.high && highRisk.length > 0 && (
                                        <div className="p-3 space-y-2 bg-rose-50/20">
                                            {highRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} onClick={setSelectedClause} />)}
                                        </div>
                                    )}
                                    {openSections.high && highRisk.length === 0 && (
                                        <div className="p-5 text-center text-rose-400 italic text-sm">No high risk clauses found.</div>
                                    )}
                                </div>

                                {/* Medium Risk */}
                                <div className="border-2 border-amber-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('medium')}
                                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <HelpCircle className="w-4.5 h-4.5 text-amber-500" />
                                            <h3 className="font-bold text-sm text-gray-800">Unusual Clauses ({mediumRisk.length})</h3>
                                        </div>
                                        {openSections.medium ? <ChevronUp className="text-gray-300 w-5 h-5" /> : <ChevronDown className="text-gray-300 w-5 h-5" />}
                                    </button>
                                    {openSections.medium && mediumRisk.length > 0 && (
                                        <div className="p-3 space-y-2">
                                            {mediumRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} onClick={setSelectedClause} />)}
                                        </div>
                                    )}
                                    {openSections.medium && mediumRisk.length === 0 && (
                                        <div className="p-5 text-center text-gray-400 italic text-sm border-t border-gray-100">No unusual clauses found.</div>
                                    )}
                                </div>

                                {/* Low Risk */}
                                <div className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('low')}
                                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                                            <h3 className="font-bold text-sm text-gray-800">Safe Clauses ({lowRisk.length})</h3>
                                        </div>
                                        {openSections.low ? <ChevronUp className="text-gray-300 w-5 h-5" /> : <ChevronDown className="text-gray-300 w-5 h-5" />}
                                    </button>
                                    {openSections.low && lowRisk.length > 0 && (
                                        <div className="p-3 space-y-2">
                                            {lowRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} onClick={setSelectedClause} />)}
                                        </div>
                                    )}
                                    {openSections.low && lowRisk.length === 0 && (
                                        <div className="p-5 text-center text-gray-400 italic text-sm border-t border-gray-100">No safe clauses found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat with Your Contract */}
                    {contractId && (
                        <div className="bg-white shadow-sm rounded-2xl border-2 border-indigo-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                        <MessageSquare className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Chat with Your Contract</h3>
                                        <p className="text-xs text-gray-500">Ask questions about clauses, payment terms, termination conditions, or responsibilities in this contract.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="p-4 h-80 overflow-y-auto chatbot-scroll bg-gray-50/50 space-y-3">
                                {chatMessages.length === 0 && !chatLoading && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
                                        <p className="text-sm font-medium">No messages yet</p>
                                        <p className="text-xs mt-1">Ask a question about your contract to get started</p>
                                    </div>
                                )}

                                {chatMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} chat-bubble-appear`}
                                    >
                                        <div
                                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-md'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {chatLoading && (
                                    <div className="flex justify-start chat-bubble-appear">
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" style={{ animationDelay: '200ms' }} />
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" style={{ animationDelay: '400ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                                        placeholder="Ask questions about this contract..."
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        disabled={chatLoading}
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        disabled={chatLoading || !chatInput.trim()}
                                        className={`p-2.5 rounded-xl transition-all ${chatLoading || !chatInput.trim()
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95'
                                            }`}
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedClause && (
                <ClauseModal clause={selectedClause} onClose={() => setSelectedClause(null)} />
            )}
        </div>
    );
};

export default Dashboard;
