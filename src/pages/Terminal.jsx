import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TermIcon, Loader2, RefreshCw } from 'lucide-react';
import { getTerminalManager } from '../services/terminalManager';

const TerminalPage = () => {
    const termRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [manager, setManager] = useState(null);

    useEffect(() => {
        const terminalManager = getTerminalManager();
        setManager(terminalManager);

        const init = async () => {
            if (termRef.current) {
                await terminalManager.attach(termRef.current, (isConnected) => {
                    setConnected(isConnected);
                });
            }
        };

        init();

        return () => {
            terminalManager.detach();
        };
    }, []);

    const handleReconnect = () => {
        if (manager) manager.reconnect();
    };

    const hasError = manager?.hasError;

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Web Terminal</h2>
                    <p className="text-gray-400">Direct shell access to your server (session persists across menu navigation).</p>
                </div>
                <div className="flex items-center gap-4">
                    {!connected && (
                        <button
                            onClick={handleReconnect}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-xs font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            {hasError && !connected ? (
                <div className="glass p-8 rounded-[2rem] flex flex-col items-center justify-center h-96 text-center">
                    <TermIcon className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-red-400 text-sm font-medium mb-2">Connection failed or lost</p>
                    <p className="text-gray-500 text-xs mb-6">The web terminal requires the backend to run on a Linux server with /bin/bash.</p>
                    <button
                        onClick={handleReconnect}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Try Reconnect
                    </button>
                </div>
            ) : (
                <div className="glass rounded-[2rem] overflow-hidden p-2 h-full relative group">
                    <div ref={termRef} className="h-full w-full" />
                    {!connected && !hasError && (
                        <div className="absolute inset-0 bg-[#0a0c10]/50 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TerminalPage;

