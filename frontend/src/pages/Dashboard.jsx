import React, { useState } from 'react';
import axios from 'axios';
import { CloudUpload, AlertCircle, CheckCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import RiskCard from '../components/RiskCard';

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [role, setRole] = useState('tenant');
    const [jurisdiction, setJurisdiction] = useState('california');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Accordion State
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

    const handleAnalyze = async () => {
        if (!file) {
            setError('Please select a PDF file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('role', role);
        formData.append('jurisdiction', jurisdiction);

        try {
            const response = await axios.post('http://localhost:8000/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);

            // Auto open sections based on results found
            const hasHigh = response.data.clauses?.some(c => c.risk_level === 'HIGH' || c.risk_level === 'high');
            const hasMedium = response.data.clauses?.some(c => c.risk_level === 'MEDIUM' || c.risk_level === 'medium');

            setOpenSections({
                high: hasHigh,
                medium: !hasHigh && hasMedium, // open medium if no high
                low: !hasHigh && !hasMedium // open low if nothing else
            });

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'An error occurred while analyzing the contract.');
        } finally {
            setLoading(false);
        }
    };

    // Derived Data
    const clauses = result?.clauses || [];
    const highRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'HIGH');
    const mediumRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'MEDIUM');
    const lowRisk = clauses.filter(c => c.risk_level?.toUpperCase() === 'LOW');

    const getRiskColorText = (level) => {
        switch (level?.toUpperCase()) {
            case 'HIGH': return 'text-red-600';
            case 'MEDIUM': return 'text-yellow-600';
            case 'LOW': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
            {!result ? (
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-8 pt-8 pb-4">
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Upload Contract</h1>
                        <p className="text-gray-500 mt-1">Select a document and set your parameters to begin risk analysis.</p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Drag and Drop Zone */}
                        <div>
                            <label className="mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-blue-200 border-dashed rounded-xl bg-blue-50/50 hover:bg-blue-50 transition-colors relative cursor-pointer focus-within:outline-none">
                                <div className="space-y-2 text-center">
                                    <CloudUpload className="mx-auto h-16 w-16 text-blue-500" />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <span className="font-semibold text-blue-600 hover:text-blue-500">
                                            Drop PDF file here or click to upload
                                        </span>
                                        <input type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                                    </div>
                                    {file && <p className="text-sm font-semibold text-gray-800 mt-2">{file.name}</p>}
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700">Select User Role *</label>
                                <div className="relative">
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                                    >
                                        <option value="tenant">Tenant</option>
                                        <option value="employee">Employee</option>
                                        <option value="freelancer">Freelancer</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700">Governing Jurisdiction *</label>
                                <div className="relative">
                                    <select
                                        value={jurisdiction}
                                        onChange={e => setJurisdiction(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                                    >
                                        <option value="california">California</option>
                                        <option value="india">India</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-700 text-sm mt-2 p-4 bg-red-50 rounded-lg border border-red-200 font-medium">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                onClick={handleAnalyze}
                                disabled={loading || !file}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white transition-all
                                ${loading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6B8E6B] hover:bg-[#5A7A5A] active:scale-[0.99] hover:shadow-md'}`}
                            >
                                {loading ? 'Analyzing...' : 'Start Analysis'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Results Component */
                <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-bold text-gray-900">Contract Analysis Results</h2>
                        <button
                            onClick={() => setResult(null)}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Upload Another
                        </button>
                    </div>

                    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center text-green-700 font-semibold gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Analysis Complete
                            </div>
                            <button className="bg-[#6B8E6B] hover:bg-[#5A7A5A] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                                Export Risk Report
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-8 text-lg font-semibold">
                                <AlertCircle className={`w-6 h-6 ${getRiskColorText(result.overall_risk_score)}`} />
                                <span className="text-gray-700">Overall Risk Level: </span>
                                <span className={getRiskColorText(result.overall_risk_score)}>
                                    {result.overall_risk_score}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {/* High Risk Accordion */}
                                <div className="border border-red-100 rounded-xl overflow-hidden bg-white">
                                    <button
                                        onClick={() => toggleSection('high')}
                                        className="w-full px-6 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <h3 className="font-bold text-red-900">Dangerous Clauses ({highRisk.length})</h3>
                                        </div>
                                        {openSections.high ? <ChevronUp className="text-red-400" /> : <ChevronDown className="text-red-400" />}
                                    </button>

                                    {openSections.high && highRisk.length > 0 && (
                                        <div className="p-4 space-y-3 bg-red-50/30">
                                            {highRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} />)}
                                        </div>
                                    )}
                                    {openSections.high && highRisk.length === 0 && (
                                        <div className="p-6 text-center text-red-500 italic">No dangerous clauses found.</div>
                                    )}
                                </div>

                                {/* Medium Risk Accordion */}
                                <div className="border border-yellow-100 rounded-xl overflow-hidden bg-white">
                                    <button
                                        onClick={() => toggleSection('medium')}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-yellow-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <HelpCircle className="w-5 h-5 text-yellow-500" />
                                            <h3 className="font-bold text-gray-800">Unusual Clauses ({mediumRisk.length})</h3>
                                        </div>
                                        {openSections.medium ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                    </button>

                                    {openSections.medium && mediumRisk.length > 0 && (
                                        <div className="p-4 space-y-3 bg-gray-50/50">
                                            {mediumRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} />)}
                                        </div>
                                    )}
                                    {openSections.medium && mediumRisk.length === 0 && (
                                        <div className="p-6 text-center text-gray-500 italic border-t border-gray-100">No unusual clauses found.</div>
                                    )}
                                </div>

                                {/* Low Risk Accordion */}
                                <div className="border border-green-100 rounded-xl overflow-hidden bg-white">
                                    <button
                                        onClick={() => toggleSection('low')}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-green-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <h3 className="font-bold text-gray-800">Safe Clauses ({lowRisk.length})</h3>
                                        </div>
                                        {openSections.low ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                    </button>

                                    {openSections.low && lowRisk.length > 0 && (
                                        <div className="p-4 space-y-3 bg-gray-50/50">
                                            {lowRisk.map((clause, idx) => <RiskCard key={idx} clause={clause} />)}
                                        </div>
                                    )}
                                    {openSections.low && lowRisk.length === 0 && (
                                        <div className="p-6 text-center text-gray-500 italic border-t border-gray-100">No safe clauses checked.</div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
