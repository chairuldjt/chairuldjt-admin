import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Server,
    Settings,
    Terminal,
    ShieldCheck,
    HardDrive,
    Cpu,
    Zap,
    Bell,
    Search,
    ChevronRight,
    Menu,
    X,
    Info,
    AlertTriangle,
    CheckCircle2,
    Check
} from 'lucide-react';

const menuItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/' },
    { label: 'Services', icon: Server, path: '/services' },
    { label: 'Users', icon: Users, path: '/users' },
    { label: 'Storage', icon: HardDrive, path: '/storage' },
    { label: 'Security', icon: ShieldCheck, path: '/security' },
    { label: 'Terminal', icon: Terminal, path: '/terminal' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
      ${active
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent'
            }`}
    >
        <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="font-medium text-sm">{label}</span>
        {active && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        )}
    </button>
);

const notifIcon = (type) => {
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
    if (type === 'success') return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
    if (type === 'error') return <X className="w-4 h-4 text-red-400 shrink-0" />;
    return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
};

const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const Shell = ({ children, onLogout, activeTab }) => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notifRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch { /* ignore */ }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNav = (item) => {
        navigate(item.path);
    };

    return (
        <div className="flex min-h-screen bg-[#0a0c10] text-gray-100 font-sans">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 transition-all duration-300 ease-in-out transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-[#0d1117]/80 backdrop-blur-xl border-r border-white/5`}
            >
                <div className="p-8 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Zap className="w-6 h-6 text-white fill-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white">Chairuldjt<span className="text-blue-500">Admin</span></h1>
                    </div>

                    <nav className="space-y-2 flex-grow">
                        {menuItems.map((item) => (
                            <SidebarItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                active={activeTab === item.label}
                                onClick={() => handleNav(item)}
                            />
                        ))}
                    </nav>

                    <div className="mt-auto px-2">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/10 to-transparent border border-blue-500/10 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Cpu className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">System Load</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full w-[42%] shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                                <span>System Load</span>
                                <span className="text-blue-400 font-bold">Stable</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2 border-t border-white/5 group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/10 flex items-center justify-center text-[10px] font-bold uppercase">
                                    {JSON.parse(localStorage.getItem('nexus_user'))?.username?.substring(0, 2) || 'AD'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white leading-none mb-1">
                                        {JSON.parse(localStorage.getItem('nexus_user'))?.username || 'Admin'}
                                    </span>
                                    <span className="text-[10px] text-gray-500">Administrator</span>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pl-72' : 'pl-0'}`}>
                {/* Header */}
                <header className="sticky top-0 z-40 h-20 border-b border-white/5 bg-[#0a0c11]/60 backdrop-blur-md px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Home</span>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white font-medium">{activeTab}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search commands..."
                                className="bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 w-64 transition-all"
                            />
                        </div>

                        <div className="h-8 w-px bg-white/5" />

                        {/* Notification Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
                                className="relative p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[9px] font-bold text-white border-2 border-[#0a0c11]">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {notifOpen && (
                                <div className="absolute right-0 top-full mt-3 w-96 glass rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                        <h4 className="text-sm font-bold text-white">Notifications</h4>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                                        {notifications.length > 0 ? notifications.map((n) => (
                                            <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${n.read ? 'opacity-50' : 'bg-white/[0.02]'}`}>
                                                {notifIcon(n.type)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
                                                    <span className="text-[10px] text-gray-600 mt-1 block">{timeAgo(n.time)}</span>
                                                </div>
                                                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                                            </div>
                                        )) : (
                                            <div className="px-5 py-8 text-center text-gray-600 text-xs">
                                                No notifications yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Shell;
