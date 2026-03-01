import React, { useState, useEffect } from 'react';
import {
    Cloud,
    Save,
    Play,
    Square,
    RotateCcw,
    RefreshCw,
    Plus,
    Search,
    AlertCircle,
    CheckCircle2,
    Shield,
    Activity,
    ExternalLink,
    Terminal
} from 'lucide-react';

const Cloudflared = () => {
    const [status, setStatus] = useState({ active: false, version: 'Loading...' });
    const [config, setConfig] = useState('');
    const [tunnels, setTunnels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [newDns, setNewDns] = useState({ tunnel: '', hostname: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('nexus_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statusRes, configRes, tunnelsRes] = await Promise.all([
                fetch('/api/cloudflared/status', { headers }),
                fetch('/api/cloudflared/config', { headers }),
                fetch('/api/cloudflared/tunnels', { headers })
            ]);

            if (statusRes.ok) setStatus(await statusRes.json());
            if (configRes.ok) {
                const data = await configRes.json();
                setConfig(data.config);
            }
            if (tunnelsRes.ok) setTunnels(await tunnelsRes.json());
        } catch (err) {
            console.error('Failed to fetch cloudflared data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleServiceAction = async (action) => {
        setActionLoading(action);
        try {
            const res = await fetch(`/api/cloudflared/service/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) fetchData();
        } catch (err) {
            alert('Action failed: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/cloudflared/config', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });
            if (res.ok) alert('Configuration saved');
            else alert('Failed to save configuration');
        } catch (err) {
            alert('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddDns = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/cloudflared/dns', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newDns)
            });
            if (res.ok) {
                alert('DNS route added');
                setNewDns({ tunnel: '', hostname: '' });
            } else {
                alert('Failed to add DNS route');
            }
        } catch (err) {
            alert('Error adding DNS: ' + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-blue-600/20 text-blue-400">
                            <Cloud className="w-8 h-8" />
                        </div>
                        Cloudflared Manager
                    </h2>
                    <p className="text-gray-400 mt-1 ml-11">Manage tunnels, DNS routing and edge configuration.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-3 glass rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl glass border ${status.active ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                        <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${status.active ? 'text-green-400' : 'text-red-400'}`}>
                            {status.active ? 'Running' : 'Stopped'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Actions & Editor */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Controls */}
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="text-sm font-bold text-gray-400 mb-6 tracking-wider uppercase flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" /> Service Controls
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                onClick={() => handleServiceAction('start')}
                                disabled={status.active || actionLoading}
                                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-green-500/20 hover:border-green-500/30 text-gray-300 hover:text-green-400 transition-all font-bold disabled:opacity-30"
                            >
                                <Play className="w-5 h-5" /> Start
                            </button>
                            <button
                                onClick={() => handleServiceAction('stop')}
                                disabled={!status.active || actionLoading}
                                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/20 hover:border-red-500/30 text-gray-300 hover:text-red-400 transition-all font-bold disabled:opacity-30"
                            >
                                <Square className="w-5 h-5" /> Stop
                            </button>
                            <button
                                onClick={() => handleServiceAction('restart')}
                                disabled={actionLoading}
                                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-gray-300 hover:text-blue-400 transition-all font-bold disabled:opacity-30"
                            >
                                <RotateCcw className={`w-5 h-5 ${actionLoading === 'restart' ? 'animate-spin' : ''}`} /> Restart
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="glass p-6 rounded-3xl relative">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-orange-400" /> config.yml
                            </h4>
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                SAVE CHANGES
                            </button>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0d1117]">
                            <textarea
                                value={config}
                                onChange={(e) => setConfig(e.target.value)}
                                spellCheck="false"
                                className="w-full h-[400px] p-6 bg-transparent text-gray-300 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none leading-relaxed"
                                placeholder="# Cloudflared configuration YAML..."
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Tunnels & DNS */}
                <div className="space-y-6">
                    {/* Status Info */}
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="text-sm font-bold text-gray-400 mb-6 tracking-wider uppercase flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" /> Version Info
                        </h4>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-[10px] text-gray-500 block mb-1 font-bold tracking-widest uppercase">Binary Version</span>
                            <span className="text-sm font-mono text-blue-400 font-bold">{status.version}</span>
                        </div>
                        <button
                            onClick={async () => {
                                alert('Running update command...');
                                await fetch('/api/cloudflared/update', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
                                });
                            }}
                            className="w-full mt-4 py-3 rounded-2xl border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" /> CHECK FOR UPDATES
                        </button>
                    </div>

                    {/* Active Tunnels */}
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="text-sm font-bold text-gray-400 mb-6 tracking-wider uppercase flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400" /> Active Tunnels
                        </h4>
                        <div className="space-y-3">
                            {tunnels.length > 0 ? tunnels.map((t) => (
                                <div key={t.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">{t.name}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                                            <span className="text-[9px] font-bold text-green-400 uppercase tracking-tighter">Connected</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono block">{t.id}</span>
                                </div>
                            )) : (
                                <div className="py-8 text-center bg-white/5 rounded-2xl">
                                    <p className="text-xs text-gray-600 italic">No tunnels found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DNS Routing Form */}
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="text-sm font-bold text-gray-400 mb-6 tracking-wider uppercase flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-400" /> Route DNS
                        </h4>
                        <form onSubmit={handleAddDns} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Tunnel ID / Name</label>
                                <input
                                    type="text"
                                    value={newDns.tunnel}
                                    onChange={(e) => setNewDns({ ...newDns, tunnel: e.target.value })}
                                    placeholder="tunnel-id"
                                    className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-xs focus:ring-1 focus:ring-blue-500/30 outline-none text-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Public Hostname</label>
                                <input
                                    type="text"
                                    value={newDns.hostname}
                                    onChange={(e) => setNewDns({ ...newDns, hostname: e.target.value })}
                                    placeholder="app.example.com"
                                    className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-xs focus:ring-1 focus:ring-blue-500/30 outline-none text-white transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-3 h-3" /> ADD DNS ROUTE
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Cloudflared;
