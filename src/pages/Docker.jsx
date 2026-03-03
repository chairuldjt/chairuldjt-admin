import React, { useState, useEffect } from 'react';
import {
    Box,
    Play,
    Square,
    RefreshCw,
    Trash2,
    Terminal,
    Database,
    Activity,
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    Info,
    Layers,
    Clock,
    HardDrive
} from 'lucide-react';

const Docker = () => {
    const [containers, setContainers] = useState([]);
    const [images, setImages] = useState([]);
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('containers');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLogs, setSelectedLogs] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('nexus_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [cRes, iRes, nRes] = await Promise.all([
                fetch('/api/docker/containers', { headers }),
                fetch('/api/docker/images', { headers }),
                fetch('/api/docker/info', { headers })
            ]);

            if (cRes.ok) setContainers(await cRes.json());
            if (iRes.ok) setImages(await iRes.json());
            if (nRes.ok) setInfo(await nRes.json());
        } catch (err) {
            console.error('Failed to fetch Docker data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        setActionLoading(`${id}-${action}`);
        try {
            const res = await fetch(`/api/docker/containers/${id}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert(`Failed to perform action: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const viewLogs = async (id) => {
        try {
            const res = await fetch(`/api/docker/containers/${id}/logs`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) {
                const logs = await res.text();
                setSelectedLogs({ id, logs });
                setShowLogsModal(true);
            }
        } catch (err) {
            alert('Failed to fetch logs');
        }
    };

    const getStatusColor = (status) => {
        if (status.toLowerCase().includes('up')) return 'text-green-400 bg-green-400/10 border-green-400/20';
        if (status.toLowerCase().includes('exited')) return 'text-red-400 bg-red-400/10 border-red-400/20';
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    };

    const formatSize = (bytes) => {
        const mb = bytes / (1024 * 1024);
        if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
        return `${mb.toFixed(2)} MB`;
    };

    const filteredContainers = containers.filter(c =>
        c.Names[0].toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.Image.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredImages = images.filter(img =>
        (img.RepoTags?.[0] || 'none').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !info) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Docker Management</h2>
                    <p className="text-gray-400 max-w-lg">
                        Manage your containers, images, and monitor Docker runtime.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="glass px-5 py-2.5 rounded-xl flex items-center gap-3">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Containers</span>
                            <span className="text-sm font-bold text-white">{info?.ContainersRunning} / {info?.Containers}</span>
                        </div>
                    </div>
                    <div className="glass px-5 py-2.5 rounded-xl flex items-center gap-3">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Images</span>
                            <span className="text-sm font-bold text-white">{info?.Images}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex bg-white/5 rounded-2xl p-1 w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('containers')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'containers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Containers
                    </button>
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'images' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Images
                    </button>
                </div>

                <div className="relative group w-full sm:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>
            </div>

            {activeTab === 'containers' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredContainers.map(container => (
                        <div key={container.Id} className="glass p-6 rounded-[2rem] border-t-2 border-blue-500/10 group hover:border-blue-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20`}>
                                        <Box className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white truncate">{container.Names[0].replace('/', '')}</h3>
                                        <p className="text-[10px] text-gray-500 font-mono truncate">{container.Image}</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(container.Status)}`}>
                                    {container.State}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-3 h-3 text-gray-600" />
                                        <span className="text-[9px] text-gray-600 font-bold uppercase">Status</span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-300">{container.Status}</p>
                                </div>
                                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Terminal className="w-3 h-3 text-gray-600" />
                                        <span className="text-[9px] text-gray-600 font-bold uppercase">ID</span>
                                    </div>
                                    <p className="text-xs font-mono text-gray-300">{container.Id.substring(0, 12)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {container.State !== 'running' ? (
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(container.Id, 'start')}
                                        className="flex-1 p-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === `${container.Id}-start` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        <span className="text-xs font-bold uppercase">Start</span>
                                    </button>
                                ) : (
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(container.Id, 'stop')}
                                        className="flex-1 p-2.5 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === `${container.Id}-stop` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                                        <span className="text-xs font-bold uppercase">Stop</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => handleAction(container.Id, 'restart')}
                                    className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                                    title="Restart"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => viewLogs(container.Id)}
                                    className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 border border-white/10 transition-all"
                                    title="View Logs"
                                >
                                    <Terminal className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { if (confirm('Delete container?')) handleAction(container.Id, 'remove'); }}
                                    className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-all"
                                    title="Remove"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass overflow-hidden rounded-[2rem] border border-white/5">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Image Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Size</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredImages.map(img => (
                                <tr key={img.Id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                <Layers className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <span className="text-sm font-bold text-white">{img.RepoTags?.[0] || '<none>'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{img.Id.substring(7, 19)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300 font-medium">{formatSize(img.Size)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(img.Created * 1000).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowLogsModal(false)} />
                    <div className="relative w-full max-w-4xl max-h-[80vh] bg-[#0d1117] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Terminal className="w-5 h-5 text-blue-400" />
                                <h3 className="font-bold text-white">Container Logs</h3>
                            </div>
                            <button onClick={() => setShowLogsModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-black/30 font-mono text-[11px] leading-relaxed text-blue-100 whitespace-pre-wrap">
                            {selectedLogs?.logs || 'No logs available.'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Docker;
