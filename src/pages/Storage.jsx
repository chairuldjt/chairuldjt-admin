import React, { useState, useEffect } from 'react';
import { HardDrive, Database, ArrowUpDown, Loader2 } from 'lucide-react';

const Storage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStorage(); }, []);

    const fetchStorage = async () => {
        try {
            const res = await fetch('/api/storage', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) { console.error('Failed to fetch storage'); }
        finally { setLoading(false); }
    };

    const getBarColor = (percent) => {
        const p = parseFloat(percent);
        if (p >= 90) return 'bg-red-500';
        if (p >= 70) return 'bg-orange-500';
        return 'bg-blue-500';
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Storage Overview</h2>
                <p className="text-gray-400">All mounted filesystems and disk I/O statistics.</p>
            </div>

            {/* Disk I/O */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
                            <ArrowUpDown className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Disk Read</h3>
                            <p className="text-[10px] text-gray-500">Current read speed</p>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{data?.io?.read || '0'} <span className="text-sm text-gray-500">MB/s</span></h2>
                </div>
                <div className="glass p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                            <ArrowUpDown className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Disk Write</h3>
                            <p className="text-[10px] text-gray-500">Current write speed</p>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{data?.io?.write || '0'} <span className="text-sm text-gray-500">MB/s</span></h2>
                </div>
            </div>

            {/* Filesystems */}
            <div className="glass p-8 rounded-[2rem]">
                <h3 className="text-lg font-bold text-white mb-6">Mounted Filesystems</h3>
                <div className="space-y-6">
                    {data?.filesystems?.map((fs, i) => (
                        <div key={i} className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <HardDrive className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{fs.mount}</h4>
                                        <p className="text-[10px] text-gray-500 font-mono">{fs.fs} ({fs.type})</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-white">{fs.used} GB</span>
                                    <span className="text-xs text-gray-500"> / {fs.size} GB</span>
                                </div>
                            </div>
                            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(fs.percent)}`} style={{ width: `${fs.percent}%` }} />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                                <span>{fs.available} GB free</span>
                                <span className={`font-bold ${parseFloat(fs.percent) >= 90 ? 'text-red-400' : 'text-gray-400'}`}>{fs.percent}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Storage;
