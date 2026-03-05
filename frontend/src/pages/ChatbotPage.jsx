import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Scale, Sparkles, BookOpen, FileQuestion, Gavel, Mic, MicOff } from 'lucide-react';

const ChatbotPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await handleVoiceSubmit(audioBlob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleVoiceSubmit = async (audioBlob) => {
        setIsTranscribing(true);

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        try {
            const response = await axios.post('http://localhost:8000/voice-query', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const transcribedText = response.data.text;
            if (transcribedText && transcribedText.trim()) {
                setInput(transcribedText);
                handleSend(transcribedText);
            } else {
                alert("Could not transcribe audio. Please try again.");
            }
        } catch (err) {
            console.error("Error submitting voice query:", err);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Sorry, I encountered an error while processing your voice query.'
            }]);
        } finally {
            setIsTranscribing(false);
            inputRef.current?.focus();
        }
    };

    const handleSend = async (overrideText) => {
        const question = (overrideText || input).trim();
        if (!question || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: question }]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:8000/chat', { question });
            setMessages(prev => [...prev, { role: 'bot', text: response.data.answer }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Sorry, I encountered an error while processing your question. Please try again.'
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const quickQuestions = [
        { icon: <Gavel className="w-4 h-4" />, text: "What is IPC Section 420?", label: "IPC Sections" },
        { icon: <FileQuestion className="w-4 h-4" />, text: "What is a non-compete clause?", label: "Contract Terms" },
        { icon: <BookOpen className="w-4 h-4" />, text: "Explain breach of contract in India", label: "Legal Concepts" },
        { icon: <Scale className="w-4 h-4" />, text: "What are tenant rights in India?", label: "Rights & Laws" },
    ];

    const hasMessages = messages.length > 0;

    return (
        <div className="w-full max-w-4xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col">
            {/* Chat Container */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border-2 border-indigo-200 shadow-sm bg-white">

                {/* Chat Header Bar */}
                <div className="shrink-0 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Scale className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    Legal Assistant
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                </h1>
                                <p className="text-[11px] text-gray-500">Powered by AI • Indian Legal Knowledge</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-[11px] text-emerald-600 font-medium">Online</span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto chatbot-scroll" style={{ background: 'linear-gradient(180deg, #f8f9fc 0%, #f0f2f5 100%)' }}>
                    {!hasMessages ? (
                        /* Welcome Screen */
                        <div className="h-full flex flex-col items-center justify-center px-6 py-8">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-5">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-1">How can I help you today?</h2>
                            <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
                                Ask me about Indian legal terms, IPC sections, contract laws, or any legal doubts.
                            </p>

                            {/* Quick Questions Grid */}
                            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                                {quickQuestions.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(q.text)}
                                        className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200/80 bg-white hover:bg-indigo-50/50 hover:border-indigo-200 transition-all duration-200 text-left hover:shadow-md"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                            {q.icon}
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">{q.label}</span>
                                            <p className="text-sm text-gray-700 mt-0.5 leading-snug">{q.text}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <div className="p-5 space-y-5">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20'
                                        : 'bg-white border border-gray-200 shadow-sm'
                                        }`}>
                                        {msg.role === 'user'
                                            ? <User className="w-3.5 h-3.5 text-white" />
                                            : <Bot className="w-3.5 h-3.5 text-indigo-500" />
                                        }
                                    </div>

                                    {/* Bubble */}
                                    <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed chat-bubble-appear ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-indigo-500/15'
                                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                                        }`}>
                                        {msg.text.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < msg.text.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Typing */}
                            {loading && (
                                <div className="flex items-end gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                                        <Bot className="w-3.5 h-3.5 text-indigo-500" />
                                    </div>
                                    <div className="bg-white px-4 py-3.5 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                        <div className="flex gap-1.5">
                                            <span className="typing-dot w-2 h-2 bg-indigo-300 rounded-full" style={{ animationDelay: '0ms' }}></span>
                                            <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full" style={{ animationDelay: '150ms' }}></span>
                                            <span className="typing-dot w-2 h-2 bg-indigo-500 rounded-full" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Ask about legal terms, IPC sections, or contract laws..."}
                                className={`w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-indigo-200 rounded-xl text-sm ${isRecording ? 'text-rose-500 font-medium placeholder-rose-400 border-rose-300' : 'text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all`}
                                disabled={loading || isRecording || isTranscribing}
                            />
                        </div>

                        <button
                            onClick={toggleRecording}
                            disabled={loading || isTranscribing}
                            className={`p-3 rounded-xl transition-all duration-200 ${isRecording
                                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 animate-pulse'
                                    : loading || isTranscribing
                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                            title={isRecording ? "Stop recording" : "Start voice input"}
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={() => handleSend()}
                            disabled={loading || isRecording || isTranscribing || !input.trim()}
                            className={`p-3 rounded-xl transition-all duration-200 ${loading || !input.trim()
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        AI-powered responses are for educational purposes only — not legal advice.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatbotPage;
