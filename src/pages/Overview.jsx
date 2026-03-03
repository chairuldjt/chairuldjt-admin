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
    XCircle,
    Thermometer,
    Globe,
    Wifi,
    Terminal as TermIcon,
    AlertCircle,
    Info
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
    const [sortBy, setSortBy] = useState('cpu');

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

    const getTempColor = (temp) => {
        if (temp === null || temp === undefined) return 'text-gray-500';
        if (temp < 50) return 'text-green-400';
        if (temp < 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    if (loading && !stats) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-10 font-sans">
            {/* Header section with hostname/distro info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">System Overview</h2>
                    <p className="text-gray-400 text-sm md:text-base max-w-lg">
                        Monitoring <span className="text-blue-400 font-bold">{stats?.hostname || 'Node'}</span>
                        {stats?.distro && <span className="text-gray-500 text-xs ml-2"> — {stats.distro}</span>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="glass px-4 md:px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-bold text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        UPTIME: {formatUptime(stats?.uptime || 0)}
                    </div>
                    <button onClick={fetchStats}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="CPU Usage" value={stats?.cpu || '0'} unit="%" icon={Cpu} color="bg-blue-500" />
                <StatCard title="Memory" value={stats?.mem?.used || '0'} unit={`/ ${stats?.mem?.total} GB`} icon={Database} color="bg-purple-500" />
                <StatCard title="Disk Usage" value={stats?.disk?.percent || '0'} unit="%" icon={HardDrive} color="bg-emerald-500" />
                <StatCard title="Load Average" value={stats?.loadAvg?.min1 || '0'} unit="1 min" icon={Network} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph Card */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="glass p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem]">
                        <div className="mb-6 md:mb-10">
                            <h3 className="text-lg md:text-xl font-bold text-white">Live Resource Monitor</h3>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">CPU vs Memory (updates every 5s)</p>
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

                    {/* Detailed System Status (Webmin Style Expansion) */}
                    <div className="glass p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-t-2 border-blue-500/20">
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <Info className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg md:text-xl font-bold text-white">System Status Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-sm">
                            <DetailRow label="System hostname" value={stats?.hostname || '-'} />
                            <DetailRow label="Operating system" value={stats?.distro || '-'} />
                            <DetailRow label="Kernel and CPU" value={stats?.kernel || '-'} />
                            <DetailRow label="Processor Info" value={stats?.processor || '-'} />
                            <DetailRow label="IP Address" value={`${stats?.ip || '-'} (${stats?.netInterface || '-'})`} icon={Globe} />
                            <DetailRow label="MAC Address" value={stats?.mac || '-'} icon={Wifi} />
                            <DetailRow label="Running processes" value={stats?.processes || '0'} />
                            <DetailRow label="System uptime" value={formatUptime(stats?.uptime || 0)} />
                            <DetailRow label="Real memory" value={`${stats?.mem?.used} GB used / ${stats?.mem?.total} GB total`} />
                            <DetailRow label="Local disk space" value={`${stats?.disk?.used} GB used / ${(stats?.disk?.total - stats?.disk?.used).toFixed(1)} GB free / ${stats?.disk?.total} GB total`} />

                            <div className="col-span-1 md:col-span-2 py-4 mt-2 border-t border-white/5">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <span className="text-gray-500 font-bold min-w-[150px]">CPU temperatures</span>
                                    <div className="flex flex-wrap gap-2">
                                        <div className={`px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2`}>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Main:</span>
                                            <span className={`font-mono text-xs font-bold ${getTempColor(stats?.cpuTemp?.main)}`}>
                                                {stats?.cpuTemp?.main ? `${stats.cpuTemp.main}°C` : 'N/A'}
                                            </span>
                                        </div>
                                        {stats?.cpuTemp?.cores?.map((temp, i) => (
                                            <div key={i} className={`px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2`}>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Core {i + 1}:</span>
                                                <span className={`font-mono text-xs font-bold ${getTempColor(temp)}`}>
                                                    {temp}°C
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 py-4 border-t border-white/5">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <span className="text-gray-500 font-bold min-w-[150px]">CPU load averages</span>
                                    <div className="flex gap-4 font-mono text-xs text-blue-400 font-medium bg-blue-500/5 px-4 py-2 rounded-xl border border-blue-500/10 w-fit">
                                        <span>{stats?.loadAvg?.min1} (1 min)</span>
                                        <span className="text-gray-700">|</span>
                                        <span>{stats?.loadAvg?.min5} (5 min)</span>
                                        <span className="text-gray-700">|</span>
                                        <span>{stats?.loadAvg?.min15} (15 min)</span>
                                    </div>
                                </div>
                            </div>

                            {stats?.updates && stats.updates.total > 0 && (
                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl ${stats.updates.security > 0 ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'}`}>
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold">{stats.updates.total} package updates available</p>
                                            {stats.updates.security > 0 && <p className="text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-80">{stats.updates.security} security updates included</p>}
                                        </div>
                                        <button className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold decoration-none transition-all">Update Now</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Services/Processes Card */}
                    <div className="glass p-6 rounded-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Resource Usage
                            </h4>
                            <div className="flex bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => setSortBy('cpu')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${sortBy === 'cpu' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    CPU
                                </button>
                                <button
                                    onClick={() => setSortBy('mem')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${sortBy === 'mem' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    RAM
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {stats?.topProcesses ? [...stats.topProcesses]
                                .sort((a, b) => b[sortBy] - a[sortBy])
                                .slice(0, 8)
                                .map((p, idx) => (
                                    <div key={`${p.name}-${idx}`} className="flex items-center justify-between group p-2 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate pr-2">{p.name}</span>
                                            <span className="text-[9px] text-gray-600 font-medium uppercase tracking-tighter">{p.user} • {p.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-bold ${parseFloat(p.cpu) > 50 ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {p.cpu}% <span className="text-[8px] opacity-50">CPU</span>
                                                </span>
                                                <span className={`text-[10px] font-bold ${parseFloat(p.mem) > 50 ? 'text-red-400' : 'text-purple-400'}`}>
                                                    {p.mem}% <span className="text-[8px] opacity-50">RAM</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                <p className="text-xs text-gray-600 italic">No usage data...</p>
                            )}
                        </div>
                    </div>

                    {/* Quick Access Card */}
                    <div className="glass p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-transparent">
                        <div className="flex items-center gap-3 mb-6">
                            <TermIcon className="w-5 h-5 text-blue-400" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton label="Terminal" icon={TermIcon} color="bg-blue-500" />
                            <ActionButton label="Storage" icon={HardDrive} color="bg-emerald-500" />
                            <ActionButton label="Security" icon={Network} color="bg-red-500" />
                            <ActionButton label="Settings" icon={TrendingUp} color="bg-purple-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const StatCard = ({ title, value, unit, icon: Icon, color }) => (
    <div className="glass p-6 rounded-3xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${color}`} />
        <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-2xl ${color.replace('bg-', 'bg-')}/10 border border-white/5 shadow-sm`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">{title}</span>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                <span className="text-xs font-semibold text-gray-600">{unit}</span>
            </div>
        </div>
    </div>
);

const DetailRow = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-white/5 last:border-0 md:border-0 md:py-2">
        <div className="flex items-center gap-2 min-w-[140px]">
            {Icon && <Icon className="w-3 h-3 text-gray-600" />}
            <span className="text-gray-500 font-bold text-xs md:text-sm tracking-tight">{label}</span>
        </div>
        <span className="text-white font-medium text-xs md:text-sm md:text-right break-all">{value}</span>
    </div>
);

const ActionButton = ({ label, icon: Icon, color }) => (
    <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
        <Icon className={`w-5 h-5 mb-2 transition-transform group-hover:scale-110 ${color.replace('bg-', 'text-')}`} />
        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">{label}</span>
    </button>
);

export default Overview;

