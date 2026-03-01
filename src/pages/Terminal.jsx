import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TermIcon, Loader2, RefreshCw } from 'lucide-react';

const TerminalPage = () => {
    const termRef = useRef(null);
    const xtermRef = useRef(null);
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let resizeHandler;

        const initTerminal = async () => {
            try {
                const { Terminal } = await import('xterm');
                const { FitAddon } = await import('@xterm/addon-fit');
                const { WebLinksAddon } = await import('@xterm/addon-web-links');
                await import('xterm/css/xterm.css');

                if (!isMounted) return;

                const term = new Terminal({
                    cursorBlink: true,
                    fontSize: 14,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                    theme: {
                        background: '#0a0c10',
                        foreground: '#e5e7eb',
                        cursor: '#3b82f6',
                        selectionBackground: '#3b82f640',
                        black: '#000000', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
                        blue: '#3b82f6', magenta: '#a855f7', cyan: '#06b6d4', white: '#f3f4f6',
                    },
                    allowTransparency: true,
                });

                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);
                term.loadAddon(new WebLinksAddon());

                term.open(termRef.current);
                fitAddon.fit();
                term.focus();
                xtermRef.current = term;

                const token = localStorage.getItem('nexus_token');
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(`${protocol}//${window.location.host}/ws/terminal?token=${token}`);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isMounted) return;
                    setConnected(true);
                    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
                };

                ws.onmessage = (e) => {
                    if (isMounted) term.write(e.data);
                };

                ws.onclose = () => {
                    if (isMounted) {
                        setConnected(false);
                        term.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
                    }
                };

                ws.onerror = () => {
                    if (isMounted) setError(true);
                };

                term.onData(data => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'data', data }));
                    }
                });

                term.onResize(({ cols, rows }) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                    }
                });

                resizeHandler = () => fitAddon.fit();
                window.addEventListener('resize', resizeHandler);

            } catch (err) {
                console.error('Terminal init error:', err);
                if (isMounted) setError(true);
            }
        };

        initTerminal();

        return () => {
            isMounted = false;
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            if (xtermRef.current) xtermRef.current.dispose();
        };
    }, []);

    const handleReconnect = () => {
        window.location.reload();
    };

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Web Terminal</h2>
                    <p className="text-gray-400">Direct shell access to your server (clears on navigation).</p>
                </div>
                <div className="flex items-center gap-4">
                    {error && (
                        <button
                            onClick={handleReconnect}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
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

            {error ? (
                <div className="glass p-8 rounded-[2rem] flex flex-col items-center justify-center h-96 text-center">
                    <TermIcon className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-red-400 text-sm font-medium mb-2">Connection failed</p>
                    <p className="text-gray-500 text-xs mb-6">Make sure the backend is running and you have proper permissions.</p>
                    <button
                        onClick={handleReconnect}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            ) : (
                <div className="glass rounded-[2rem] overflow-hidden p-2 h-full relative group">
                    <div ref={termRef} className="h-full w-full" />
                    {!connected && (
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
