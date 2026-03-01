import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Activity,
    Cpu,
    Database,
    HardDrive,
    Network,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const Overview = () => {
    const [stats, setStats] = useState(null);
    const [services, setServices] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        fetchServices();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/system-stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const data = await response.json();
            if (response.ok) {
                setStats(data);
                setHistory(prev => {
                    const newEntry = {
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        cpu: parseFloat(data.cpu),
                        mem: parseFloat(data.mem.percent)
                    };
                    return [...prev, newEntry].slice(-20);
                });
            }
        } catch (err) { console.error('Failed to fetch stats'); }
        finally { setLoading(false); }
    };

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const data = await res.json();
            if (res.ok) {
                // Show only running or failed services for the sidebar summary
                setServices(data.filter(s => s.status === 'active' || s.status === 'failed').slice(0, 6));
            }
        } catch { /* ignore */ }
    };

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    if (loading && !stats) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">System Overview</h2>
                    <p className="text-gray-400 max-w-lg">
                        Monitoring <span className="text-blue-400 font-bold">{stats?.hostname || 'Node'}</span>
                        {stats?.distro && <span className="text-gray-500"> — {stats.distro}</span>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="glass px-5 py-2.5 rounded-xl text-xs font-bold text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        UPTIME: {formatUptime(stats?.uptime || 0)}
                    </div>
                    <button onClick={fetchStats}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="CPU Usage" value={stats?.cpu || '0'} unit="%" icon={Cpu} color="bg-blue-500" />
                <StatCard title="Memory" value={stats?.mem?.used || '0'} unit={`/ ${stats?.mem?.total} GB`} icon={Database} color="bg-purple-500" />
                <StatCard title="Disk Usage" value={stats?.disk?.percent || '0'} unit="%" icon={HardDrive} color="bg-emerald-500" />
                <StatCard title="Load Average" value={stats?.loadAvg || '0'} unit="1 min" icon={Network} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass p-8 rounded-[2rem]">
                    <div className="mb-10">
                        <h3 className="text-xl font-bold text-white">Live Resource Monitor</h3>
                        <p className="text-sm text-gray-500 mt-1">CPU vs Memory (updates every 5s)</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px' }} />
                                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
                                <Area type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMem)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="text-sm font-bold text-gray-400 mb-4 tracking-wider uppercase">Active Services</h4>
                        <div className="space-y-4">
                            {services.length > 0 ? services.map((s) => (
                                <div key={s.name} className="flex items-center justify-between group cursor-pointer">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[160px]">{s.name}</span>
                                        <span className={`text-[10px] ${s.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                            {s.status === 'active' ? 'Running' : 'Failed'}
                                        </span>
                                    </div>
                                    {s.status === 'active'
                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        : <XCircle className="w-3.5 h-3.5 text-red-400" />
                                    }
                                </div>
                            )) : (
                                <p className="text-xs text-gray-600">Loading services...</p>
                            )}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-3xl border-l-4 border-blue-500">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <h4 className="text-sm font-bold text-white">System Info</h4>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-gray-400">
                            <p><span className="text-gray-600">Kernel:</span> {stats?.kernel || '-'}</p>
                            <p><span className="text-gray-600">Hostname:</span> {stats?.hostname || '-'}</p>
                            <p><span className="text-gray-600">Distro:</span> {stats?.distro || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, unit, icon: Icon, color }) => (
    <div className="glass p-6 rounded-3xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${color}`} />
        <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-2xl ${color.replace('bg-', 'bg-')}/10 border border-current opacity-80`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-400 mb-1">{title}</span>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                <span className="text-xs font-semibold text-gray-500">{unit}</span>
            </div>
        </div>
    </div>
);

export default Overview;
