import React, { useState, useEffect } from 'react';
import { Send, Save, Shield, Info, Loader2, CheckCircle2 } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        telegram_token: '',
        telegram_chat_id: '',
        alert_threshold: '90',
        alert_cooldown: '10'
    });
    const [monitorStatus, setMonitorStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSettings();
        fetchMonitorStatus();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSettings(prev => ({
                    ...prev,
                    telegram_token: data.telegram_token || '',
                    telegram_chat_id: data.telegram_chat_id || '',
                    alert_threshold: data.alert_threshold || '90',
                    alert_cooldown: data.alert_cooldown || '10'
                }));
            }
        } catch (err) { console.error('Failed to fetch settings'); }
        finally { setLoading(false); }
    };

    const fetchMonitorStatus = async () => {
        try {
            const res = await fetch('/api/monitor-status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const data = await res.json();
            if (res.ok) setMonitorStatus(data);
        } catch { /* ignore */ }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Settings saved and monitor restarted!' });
                setTimeout(fetchMonitorStatus, 2000);
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">System Settings</h2>
                <p className="text-gray-400">Configure your server monitoring and notification preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {/* Telegram Config */}
                    <div className="glass p-8 rounded-[2rem] space-y-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                <Send className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Telegram Notifications</h3>
                                <p className="text-xs text-gray-500">Get alerts for high resource usage and uptime.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Bot Token</label>
                                <input
                                    type="password"
                                    value={settings.telegram_token}
                                    onChange={(e) => setSettings({ ...settings, telegram_token: e.target.value })}
                                    placeholder="123456789:ABCDE..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Chat ID</label>
                                <input
                                    type="text"
                                    value={settings.telegram_chat_id}
                                    onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                    placeholder="987654321"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                />
                            </div>

                            {message.text && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in zoom-in duration-300 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Configuration
                            </button>
                        </form>
                    </div>

                    {/* Monitoring Rules — NOW EDITABLE */}
                    <div className="glass p-8 rounded-[2rem]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Monitoring Rules</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Usage Alert Threshold</span>
                                    <span className="text-xs text-gray-500">Notify when CPU/RAM exceeds this value</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number" min="50" max="100"
                                        value={settings.alert_threshold}
                                        onChange={(e) => setSettings({ ...settings, alert_threshold: e.target.value })}
                                        className="w-16 bg-purple-500/20 text-purple-400 text-center px-2 py-1.5 rounded-full text-xs font-bold border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Alert Cooldown</span>
                                    <span className="text-xs text-gray-500">Wait between consecutive alerts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number" min="1" max="60"
                                        value={settings.alert_cooldown}
                                        onChange={(e) => setSettings({ ...settings, alert_cooldown: e.target.value })}
                                        className="w-16 bg-gray-700 text-gray-300 text-center px-2 py-1.5 rounded-full text-xs font-bold border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                    <span className="text-xs text-gray-500">Min</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl border-l-4 border-blue-500">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                            <Info className="w-4 h-4 text-blue-400" />
                            How to setup?
                        </h4>
                        <ol className="space-y-3 text-xs text-gray-400 list-decimal pl-4 leading-relaxed">
                            <li>Message <a href="https://t.me/BotFather" target="_blank" className="text-blue-400">@BotFather</a> on Telegram.</li>
                            <li>Create a new bot and copy the <strong>API Token</strong>.</li>
                            <li>Message <a href="https://t.me/userinfobot" target="_blank" className="text-blue-400">@userinfobot</a> to get your <strong>Chat ID</strong>.</li>
                            <li>Save both here to start receiving alerts.</li>
                        </ol>
                    </div>

                    <div className="glass p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                        <h4 className="text-sm font-bold text-white mb-2">Monitor Status</h4>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${monitorStatus?.configured ? 'bg-green-500' : 'bg-orange-500'}`} />
                            <span className={`text-xs font-bold ${monitorStatus?.configured ? 'text-green-500' : 'text-orange-500'}`}>
                                {monitorStatus === null ? 'Checking...' : monitorStatus.configured ? 'Active & Running' : 'Incomplete Setup'}
                            </span>
                        </div>
                        {monitorStatus?.configured && (
                            <div className="mt-3 space-y-1 text-[10px] text-gray-500">
                                <p>Threshold: <span className="text-purple-400 font-bold">{monitorStatus.threshold}%</span></p>
                                <p>Cooldown: <span className="text-gray-300 font-bold">{monitorStatus.cooldown} min</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
