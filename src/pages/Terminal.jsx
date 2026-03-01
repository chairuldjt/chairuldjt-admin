import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TermIcon, Loader2 } from 'lucide-react';

const TerminalPage = () => {
    const termRef = useRef(null);
    const wsRef = useRef(null);
    const xtermRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let xterm;
        let fitAddon;

        const initTerminal = async () => {
            try {
                const { Terminal } = await import('xterm');
                const { FitAddon } = await import('@xterm/addon-fit');
                const { WebLinksAddon } = await import('@xterm/addon-web-links');

                // Import xterm CSS
                await import('xterm/css/xterm.css');

                xterm = new Terminal({
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

                fitAddon = new FitAddon();
                xterm.loadAddon(fitAddon);
                xterm.loadAddon(new WebLinksAddon());

                xterm.open(termRef.current);
                fitAddon.fit();

                xtermRef.current = xterm;

                // Connect WebSocket
                const token = localStorage.getItem('nexus_token');
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/terminal?token=${token}`);
                wsRef.current = ws;

                ws.onopen = () => {
                    setConnected(true);
                    xterm.focus();
                    // Send initial resize
                    ws.send(JSON.stringify({ type: 'resize', cols: xterm.cols, rows: xterm.rows }));
                };

                ws.onmessage = (e) => {
                    xterm.write(e.data);
                };

                ws.onerror = () => {
                    setError('WebSocket connection failed. Ensure the server is running on Linux.');
                };

                ws.onclose = () => {
                    setConnected(false);
                    xterm.write('\r\n\x1b[31m[Connection closed]\x1b[0m\r\n');
                };

                xterm.onData(data => {
                    if (ws.readyState === 1) ws.send(data);
                });

                xterm.onResize(({ cols, rows }) => {
                    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                });

                // Handle window resize
                const handleResize = () => fitAddon.fit();
                window.addEventListener('resize', handleResize);

                return () => {
                    window.removeEventListener('resize', handleResize);
                };
            } catch (err) {
                setError('Failed to initialize terminal: ' + err.message);
            }
        };

        initTerminal();

        return () => {
            wsRef.current?.close();
            xtermRef.current?.dispose();
        };
    }, []);

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Web Terminal</h2>
                    <p className="text-gray-400">Direct shell access to your server.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-xs font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {error ? (
                <div className="glass p-8 rounded-[2rem] flex flex-col items-center justify-center h-96 text-center">
                    <TermIcon className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-red-400 text-sm font-medium mb-2">{error}</p>
                    <p className="text-gray-500 text-xs">The web terminal requires the backend to run on a Linux server with /bin/bash.</p>
                </div>
            ) : (
                <div className="glass rounded-[2rem] overflow-hidden p-2 h-full">
                    <div ref={termRef} className="h-full w-full" />
                </div>
            )}
        </div>
    );
};

export default TerminalPage;
