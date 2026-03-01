import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldX, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';

const Security = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchSecurity(); }, []);

    const fetchSecurity = async () => {
        try {
            const res = await fetch('/api/security', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) { console.error('Failed to fetch security'); }
        finally { setLoading(false); }
    };

    const logIcon = (type) => {
        if (type === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
        if (type === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
        return <Info className="w-3.5 h-3.5 text-gray-500 shrink-0" />;
    };

    const logColor = (type) => {
        if (type === 'success') return 'border-l-green-500';
        if (type === 'failed') return 'border-l-red-500';
        return 'border-l-gray-700';
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Security Center</h2>
                <p className="text-gray-400">Monitor SSH access and firewall rules.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SSH Auth Logs */}
                <div className="lg:col-span-2 glass p-8 rounded-[2rem]">
                    <h3 className="text-lg font-bold text-white mb-6">SSH Authentication Log</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {data?.authLogs?.length > 0 ? data.authLogs.map((log, i) => (
                            <div key={i} className={`flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border-l-2 ${logColor(log.type)}`}>
                                {logIcon(log.type)}
                                <span className="text-[11px] text-gray-400 font-mono leading-relaxed break-all">{log.raw}</span>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-gray-500">
                                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="text-sm">No SSH logs available. Ensure the server has journald logging enabled.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Firewall */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl">
                        <div className="flex items-center gap-3 mb-4">
                            {data?.firewall?.active
                                ? <ShieldCheck className="w-8 h-8 text-green-400" />
                                : <ShieldX className="w-8 h-8 text-red-400" />
                            }
                            <div>
                                <h3 className="text-sm font-bold text-white">UFW Firewall</h3>
                                <p className={`text-xs font-bold ${data?.firewall?.active ? 'text-green-400' : 'text-red-400'}`}>
                                    {data?.firewall?.active ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {data?.firewall?.rules?.length > 0 && (
                        <div className="glass p-6 rounded-3xl">
                            <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Firewall Rules</h4>
                            <div className="space-y-2">
                                {data.firewall.rules.map((rule, i) => (
                                    <div key={i} className="text-[11px] font-mono text-gray-400 p-2 bg-white/[0.03] rounded-lg">
                                        {rule}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass p-6 rounded-3xl border-l-4 border-blue-500">
                        <h4 className="text-sm font-bold text-white mb-2">Security Tips</h4>
                        <ul className="space-y-2 text-[11px] text-gray-400">
                            <li>• Use key-based SSH login</li>
                            <li>• Enable UFW and allow only SSH</li>
                            <li>• Install fail2ban for brute-force protection</li>
                            <li>• Keep your system regularly updated</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Security;
