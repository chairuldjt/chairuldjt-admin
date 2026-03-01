/**
 * Terminal Session Manager (Singleton)
 * 
 * Manages a persistent xterm + WebSocket session that survives React
 * component unmounts (page navigation). The terminal is only destroyed
 * on explicit logout via destroy().
 */

let instance = null;

class TerminalManager {
    constructor() {
        this.xterm = null;
        this.ws = null;
        this.fitAddon = null;
        this.webLinksAddon = null;
        this.currentContainer = null;
        this.connected = false;
        this.initialized = false;
        this._resizeHandler = null;
        this._onConnectedChange = null;

        // Stability properties
        this._heartbeatInterval = null;
        this._reconnectTimeout = null;
        this._reconnectAttempts = 0;
        this._shouldReconnect = true; // Flag to stop auto-reconnect on logout/error
    }

    async attach(containerEl, onConnectedChange) {
        this._onConnectedChange = onConnectedChange;
        this._shouldReconnect = true;

        if (!this.initialized) {
            await this._init(containerEl);
        } else {
            this._attachToContainer(containerEl);
            // If disconnected, try to reconnect automatically when UI is focused
            if (!this.connected) this._connectWebSocket();
        }

        if (this._onConnectedChange) {
            this._onConnectedChange(this.connected);
        }
    }

    async _init(containerEl) {
        try {
            const { Terminal } = await import('xterm');
            const { FitAddon } = await import('@xterm/addon-fit');
            const { WebLinksAddon } = await import('@xterm/addon-web-links');
            await import('xterm/css/xterm.css');

            this.xterm = new Terminal({
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

            this.fitAddon = new FitAddon();
            this.webLinksAddon = new WebLinksAddon();
            this.xterm.loadAddon(this.fitAddon);
            this.xterm.loadAddon(this.webLinksAddon);

            this.xterm.open(containerEl);
            this.currentContainer = containerEl;
            this.fitAddon.fit();

            this._connectWebSocket();

            this.xterm.onData(data => {
                this._send({ type: 'data', data });
            });

            this.xterm.onResize(({ cols, rows }) => {
                this._send({ type: 'resize', cols, rows });
            });

            this._resizeHandler = () => {
                if (this.fitAddon && this.currentContainer) {
                    this.fitAddon.fit();
                }
            };
            window.addEventListener('resize', this._resizeHandler);

            this.initialized = true;
        } catch (err) {
            console.error('TerminalManager: init failed', err);
            throw err;
        }
    }

    _send(payload) {
        if (this.ws && this.ws.readyState === 1) {
            if (typeof payload === 'string') this.ws.send(payload);
            else this.ws.send(JSON.stringify(payload));
        }
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this._heartbeatInterval = setInterval(() => {
            this._send({ type: 'ping' });
        }, 30000); // 30 seconds
    }

    _stopHeartbeat() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }

    _connectWebSocket() {
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
        }

        const token = localStorage.getItem('nexus_token');
        if (!token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.ws = new WebSocket(`${wsProtocol}//${host}/ws/terminal?token=${token}`);

        this.ws.onopen = () => {
            console.log('TerminalManager: Connected');
            this.connected = true;
            this._reconnectAttempts = 0;
            this._startHeartbeat();

            if (this._onConnectedChange) this._onConnectedChange(true);

            if (this.xterm) {
                this.xterm.focus();
                this._send({ type: 'resize', cols: this.xterm.cols, rows: this.xterm.rows });
            }
        };

        this.ws.onmessage = (e) => {
            if (this.xterm) this.xterm.write(e.data);
        };

        this.ws.onerror = (err) => {
            console.error('TerminalManager: WebSocket error', err);
        };

        this.ws.onclose = (e) => {
            this.connected = false;
            this._stopHeartbeat();
            if (this._onConnectedChange) this._onConnectedChange(false);

            if (this.xterm) {
                this.xterm.write('\r\n\x1b[33m[Connection lost. Reconnecting...]\x1b[0m\r\n');
            }

            if (this._shouldReconnect) {
                this._attemptReconnect();
            }
        };
    }

    _attemptReconnect() {
        if (this._reconnectTimeout) clearTimeout(this._reconnectTimeout);

        // Exponential backoff: 2s, 4s, 8s, up to 30s
        const delay = Math.min(Math.pow(2, this._reconnectAttempts) * 1000, 30000);
        this._reconnectAttempts++;

        console.log(`TerminalManager: Reconnecting in ${delay}ms... (Attempt ${this._reconnectAttempts})`);

        this._reconnectTimeout = setTimeout(() => {
            this._connectWebSocket();
        }, delay);
    }

    _attachToContainer(containerEl) {
        if (this.currentContainer === containerEl) {
            if (this.fitAddon) this.fitAddon.fit();
            return;
        }

        if (this.xterm && this.xterm.element) {
            const termEl = this.xterm.element.parentElement || this.xterm.element;
            containerEl.appendChild(termEl);
        }
        this.currentContainer = containerEl;

        requestAnimationFrame(() => {
            if (this.fitAddon) this.fitAddon.fit();
            if (this.xterm) this.xterm.focus();
        });
    }

    detach() {
        this.currentContainer = null;
        this._onConnectedChange = null;
    }

    reconnect() {
        this._reconnectAttempts = 0;
        this._shouldReconnect = true;
        this._connectWebSocket();
    }

    destroy() {
        this._shouldReconnect = false;
        this._stopHeartbeat();
        if (this._reconnectTimeout) clearTimeout(this._reconnectTimeout);

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }

        if (this.xterm) {
            this.xterm.dispose();
            this.xterm = null;
        }

        this.fitAddon = null;
        this.webLinksAddon = null;
        this.currentContainer = null;
        this.connected = false;
        this.initialized = false;
        this._onConnectedChange = null;
        instance = null;
    }

    get isConnected() {
        return this.connected;
    }

    get hasError() {
        return this.initialized && !this.connected && (!this.ws || this.ws.readyState === WebSocket.CLOSED);
    }
}

/**
 * Get the singleton TerminalManager instance.
 */
export function getTerminalManager() {
    if (!instance) {
        instance = new TerminalManager();
    }
    return instance;
}

export default getTerminalManager;
