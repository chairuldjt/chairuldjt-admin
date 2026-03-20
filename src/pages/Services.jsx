import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Search, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchServices(); }, []);

    const fetchServices = async () => {
        try {
            const data = await api.get('/api/services');
            setServices(data);
        } catch (err) { console.error('Failed to fetch services'); }
        finally { setLoading(false); }
    };

    const handleAction = async (name, action) => {
        setActionLoading(`${name}-${action}`);
        try {
            await api.post(`/api/services/${name}/${action}`);
            setTimeout(fetchServices, 1500);
        } catch (err) { console.error('Action failed'); }
        finally { setTimeout(() => setActionLoading(null), 1500); }
    };

    const filtered = services.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
    );

    const statusIcon = (status) => {
        if (status === 'active') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    };

    const statusColor = (status) => {
        if (status === 'active') return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (status === 'failed') return 'text-red-400 bg-red-500/10 border-red-500/20';
        return 'text-gray-400 bg-white/5 border-white/5';
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Service Manager</h2>
                    <p className="text-gray-400">Manage systemd services on your server. <span className="text-blue-400 font-bold">{services.length}</span> services found.</p>
                </div>
                <button onClick={fetchServices} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search services..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
            </div>

            <div className="glass rounded-[2rem] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <div className="col-span-5">Service</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Sub-State</div>
                    <div className="col-span-3 text-right">Actions</div>
                </div>
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {filtered.map((s) => (
                        <div key={s.name} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">
                            <div className="col-span-5 flex flex-col">
                                <span className="text-sm font-bold text-white truncate">{s.name}</span>
                                <span className="text-[11px] text-gray-500 truncate">{s.description}</span>
                            </div>
                            <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColor(s.status)}`}>
                                    {statusIcon(s.status)} {s.status}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs text-gray-500 font-mono">{s.sub}</span>
                            </div>
                            <div className="col-span-3 flex gap-2 justify-end">
                                {s.status !== 'active' && (
                                    <button onClick={() => handleAction(s.name, 'start')} disabled={!!actionLoading}
                                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20" title="Start">
                                        {actionLoading === `${s.name}-start` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                {s.status === 'active' && (
                                    <button onClick={() => handleAction(s.name, 'stop')} disabled={!!actionLoading}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20" title="Stop">
                                        {actionLoading === `${s.name}-stop` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                <button onClick={() => handleAction(s.name, 'restart')} disabled={!!actionLoading}
                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20" title="Restart">
                                    {actionLoading === `${s.name}-restart` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Services;
