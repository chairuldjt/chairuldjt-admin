import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Search, Loader2 } from 'lucide-react';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showSystem, setShowSystem] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const data = await res.json();
            if (res.ok) setUsers(data);
        } catch (err) { console.error('Failed to fetch users'); }
        finally { setLoading(false); }
    };

    const filtered = users
        .filter(u => showSystem || u.uid >= 1000 || u.uid === 0)
        .filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">System Users</h2>
                    <p className="text-gray-400">Users defined in <span className="font-mono text-blue-400">/etc/passwd</span>. <span className="font-bold text-white">{users.length}</span> total.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={showSystem} onChange={(e) => setShowSystem(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/30" />
                    <span className="text-xs text-gray-400 font-medium">Show system users</span>
                </label>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((u) => (
                    <div key={u.username} className="glass p-5 rounded-2xl hover:border-white/10 transition-colors border border-transparent group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold uppercase ${u.uid === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                u.shell?.includes('nologin') || u.shell?.includes('false') ? 'bg-gray-700/50 text-gray-500 border border-white/5' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                {u.username.substring(0, 2)}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{u.username}</h4>
                                <p className="text-[10px] text-gray-500">UID: {u.uid} | GID: {u.gid}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-mono text-gray-500">
                            <div className="flex justify-between"><span className="text-gray-600">Home:</span> <span className="text-gray-400 truncate ml-2">{u.home}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Shell:</span>
                                <span className={`${u.shell?.includes('nologin') || u.shell?.includes('false') ? 'text-gray-600' : 'text-green-400'}`}>{u.shell}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UsersPage;
