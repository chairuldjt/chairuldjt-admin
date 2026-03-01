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
        this._onConnectedChange = null; // callback for React state sync
    }

    /**
     * Initialize terminal + WebSocket if not already done.
     * Attach to the given container element.
     */
    async attach(containerEl, onConnectedChange) {
        this._onConnectedChange = onConnectedChange;

        if (!this.initialized) {
            await this._init(containerEl);
        } else {
            // Re-attach existing terminal to new container
            this._attachToContainer(containerEl);
        }

        // Notify React of current state
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
                if (this.ws && this.ws.readyState === 1) this.ws.send(data);
            });

            this.xterm.onResize(({ cols, rows }) => {
                if (this.ws && this.ws.readyState === 1) {
                    this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                }
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

    _connectWebSocket() {
        const token = localStorage.getItem('nexus_token');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/terminal?token=${token}`);

        this.ws.onopen = () => {
            this.connected = true;
            if (this._onConnectedChange) this._onConnectedChange(true);
            if (this.xterm) {
                this.xterm.focus();
                this.ws.send(JSON.stringify({ type: 'resize', cols: this.xterm.cols, rows: this.xterm.rows }));
            }
        };

        this.ws.onmessage = (e) => {
            if (this.xterm) this.xterm.write(e.data);
        };

        this.ws.onerror = () => {
            console.error('TerminalManager: WebSocket error');
        };

        this.ws.onclose = () => {
            this.connected = false;
            if (this._onConnectedChange) this._onConnectedChange(false);
            if (this.xterm) {
                this.xterm.write('\r\n\x1b[31m[Connection closed]\x1b[0m\r\n');
            }
        };
    }

    /**
     * Re-attach the terminal DOM to a new container without destroying the session.
     */
    _attachToContainer(containerEl) {
        if (this.currentContainer === containerEl) {
            // Already attached, just re-fit
            if (this.fitAddon) this.fitAddon.fit();
            return;
        }

        // Move the terminal DOM element to the new container
        if (this.xterm && this.xterm.element) {
            const termEl = this.xterm.element.parentElement || this.xterm.element;
            containerEl.appendChild(termEl);
        }
        this.currentContainer = containerEl;

        // Re-fit after DOM move
        requestAnimationFrame(() => {
            if (this.fitAddon) this.fitAddon.fit();
            if (this.xterm) this.xterm.focus();
        });
    }

    /**
     * Detach from current container (called on component unmount).
     * Does NOT destroy the session — keeps xterm + WS alive.
     */
    detach() {
        this.currentContainer = null;
        this._onConnectedChange = null;
    }

    /**
     * Reconnect a closed WebSocket (user clicks reconnect).
     */
    reconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._connectWebSocket();
    }

    /**
     * Fully destroy the terminal session. Called on logout.
     */
    destroy() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }

        if (this.ws) {
            this.ws.onclose = null; // prevent reconnect loop
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

        // Clear the singleton so a fresh one is created on next login
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
