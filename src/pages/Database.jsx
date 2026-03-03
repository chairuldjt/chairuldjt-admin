import React, { useState, useEffect } from 'react';
import {
    Database as DbIcon,
    Table,
    Play,
    Terminal,
    Search,
    Info,
    ChevronRight,
    Loader2,
    AlertCircle,
    LayoutGrid,
    RefreshCw,
    XCircle,
    CheckCircle2,
    Trash2,
    Edit3,
    Plus,
    Save,
    X,
    MoreVertical,
    Database as DbIcon2
} from 'lucide-react';

const Database = () => {
    // Basic state
    const [databases, setDatabases] = useState([]);
    const [selectedDb, setSelectedDb] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [tableInfo, setTableInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('data'); // 'data' or 'schema' or 'query'

    // Query state
    const [sqlQuery, setSqlQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [queryLoading, setQueryLoading] = useState(false);

    // CRUD state
    const [editRow, setEditRow] = useState(null); // { original: row, data: modified_row }
    const [isAddMode, setIsAddMode] = useState(false);
    const [newRowData, setNewRowData] = useState({});
    const [actionLoading, setActionLoading] = useState(false);

    // Schema Management state
    const [showCreateModal, setShowCreateModal] = useState(null); // 'database' or 'table'
    const [createName, setCreateName] = useState('');

    useEffect(() => {
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            const res = await fetch('/api/database/list', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) setDatabases(await res.json());
        } catch (err) { console.error('Failed to fetch databases'); }
        finally { setLoading(false); }
    };

    const fetchTables = async (db) => {
        setSelectedDb(db);
        setSelectedTable(null);
        setTableData([]);
        setTables([]);
        try {
            const res = await fetch(`/api/database/tables/${db}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
            });
            if (res.ok) setTables(await res.json());
        } catch (err) { console.error('Failed to fetch tables'); }
    };

    const fetchTableContent = async (table) => {
        setSelectedTable(table);
        setViewMode('data');
        setLoading(true);
        setEditRow(null);
        setIsAddMode(false);
        try {
            const [dataRes, infoRes] = await Promise.all([
                fetch(`/api/database/table-data/${selectedDb}/${table}?limit=100`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
                }),
                fetch(`/api/database/table-info/${selectedDb}/${table}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
                })
            ]);
            if (dataRes.ok) setTableData(await dataRes.json());
            if (infoRes.ok) {
                const info = await infoRes.json();
                setTableInfo(info);
                // Initialize new row data template
                const template = {};
                info.forEach(col => {
                    template[col.Field] = col.Default === null ? '' : col.Default;
                });
                setNewRowData(template);
            }
        } catch (err) { console.error('Failed to fetch table content'); }
        finally { setLoading(false); }
    };

    const runQuery = async () => {
        if (!sqlQuery.trim()) return;
        setQueryLoading(true);
        setQueryResult(null);
        try {
            const res = await fetch('/api/database/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({ sql: sqlQuery, db: selectedDb })
            });
            const data = await res.json();
            if (res.ok) {
                setQueryResult({ success: true, data });
                setViewMode('query');
            } else {
                setQueryResult({ success: false, error: data.error });
            }
        } catch (err) {
            setQueryResult({ success: false, error: err.message });
        } finally {
            setQueryLoading(false);
        }
    };

    // --- CRUD ACTIONS ---

    const getRowPK = (row) => {
        // Find PK from tableInfo
        const pkCol = tableInfo.find(c => c.Key === 'PRI')?.Field;
        if (pkCol) return { [pkCol]: row[pkCol] };
        // Fallback: use all columns as identifier (less safe)
        return row;
    };

    const deleteRow = async (row) => {
        if (!confirm('Are you sure you want to delete this row?')) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/database/row/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({ db: selectedDb, table: selectedTable, where: getRowPK(row) })
            });
            if (res.ok) fetchTableContent(selectedTable);
            else alert('Failed to delete row');
        } catch (err) { alert(err.message); }
        finally { setActionLoading(false); }
    };

    const saveEdit = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/database/row/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({
                    db: selectedDb,
                    table: selectedTable,
                    data: editRow.data,
                    where: getRowPK(editRow.original)
                })
            });
            if (res.ok) {
                setEditRow(null);
                fetchTableContent(selectedTable);
            } else alert('Failed to update row');
        } catch (err) { alert(err.message); }
        finally { setActionLoading(false); }
    };

    const insertRow = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/database/row/insert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({ db: selectedDb, table: selectedTable, data: newRowData })
            });
            if (res.ok) {
                setIsAddMode(false);
                fetchTableContent(selectedTable);
            } else alert('Failed to insert row');
        } catch (err) { alert(err.message); }
        finally { setActionLoading(false); }
    };

    const handleCreateManage = async () => {
        if (!createName.trim()) return;
        let sql = '';
        if (showCreateModal === 'database') sql = `CREATE DATABASE \`${createName}\``;
        else if (showCreateModal === 'table') sql = `CREATE TABLE \`${selectedDb}\`.\`${createName}\` (id INT AUTO_INCREMENT PRIMARY KEY)`;

        setQueryLoading(true);
        try {
            const res = await fetch('/api/database/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({ sql })
            });
            if (res.ok) {
                setShowCreateModal(null);
                setCreateName('');
                fetchDatabases();
                if (selectedDb) fetchTables(selectedDb);
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) { alert(err.message); }
        finally { setQueryLoading(false); }
    };

    const dropTable = async (table) => {
        if (!confirm(`CAUTION: Are you sure you want to DROP TABLE \`${table}\`? This action cannot be undone.`)) return;
        try {
            const res = await fetch('/api/database/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
                },
                body: JSON.stringify({ sql: `DROP TABLE \`${selectedDb}\`.\`${table}\`` })
            });
            if (res.ok) fetchTables(selectedDb);
        } catch (err) { alert(err.message); }
    };

    const renderDataGrid = (data) => {
        if (!data || data.length === 0) return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-600">
                <p className="italic">No rows found.</p>
                <button
                    onClick={() => setIsAddMode(true)}
                    className="mt-4 text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add first row
                </button>
            </div>
        );
        const columns = Object.keys(data[0]);
        const pkCol = tableInfo.find(c => c.Key === 'PRI')?.Field;

        return (
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-3 w-16 text-[10px] font-bold text-gray-500 uppercase">Actions</th>
                            {columns.map(col => (
                                <th key={col} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                                    <div className="flex items-center gap-1">
                                        {col} {pkCol === col && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded">PK</span>}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => setEditRow({ original: row, data: { ...row } })}
                                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/10"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => deleteRow(row)}
                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                                {columns.map(col => (
                                    <td key={col} className="px-4 py-3 text-gray-300 font-medium max-w-xs truncate">
                                        {row[col] === null ? <span className="text-gray-600 italic">NULL</span> : String(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading && databases.length === 0) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 font-sans">
            {/* Sidebar Explorer */}
            <aside className="w-full lg:w-72 space-y-4 shrink-0">
                <div className="glass p-5 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <DbIcon className="w-4 h-4 text-blue-400" /> Explorer
                        </h3>
                        <button
                            onClick={() => setShowCreateModal('database')}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {databases.map(db => (
                            <div key={db} className="space-y-1">
                                <button
                                    onClick={() => fetchTables(db)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedDb === db ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                >
                                    <DbIcon className="w-3.5 h-3.5" />
                                    <span className="truncate">{db}</span>
                                    {selectedDb === db && <ChevronRight className="ml-auto w-3 h-3" />}
                                </button>

                                {selectedDb === db && (
                                    <div className="pl-4 space-y-1 mt-1 border-l border-white/5 ml-4">
                                        <div className="flex items-center justify-between px-3 py-1">
                                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Tables</span>
                                            <button onClick={() => setShowCreateModal('table')} className="text-gray-600 hover:text-white transition-colors">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {tables.length > 0 ? tables.map(table => (
                                            <div key={table} className="group relative">
                                                <button
                                                    onClick={() => fetchTableContent(table)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${selectedTable === table ? 'text-blue-400 bg-blue-500/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                                >
                                                    <Table className="inline-block w-3 h-3 mr-2 opacity-50" />
                                                    {table}
                                                </button>
                                                <button
                                                    onClick={() => dropTable(table)}
                                                    className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-700 hover:text-red-500 transition-all"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        )) : (
                                            <p className="text-[10px] text-gray-700 italic px-3 py-1">No tables</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 space-y-6">
                {/* SQL Editor Card */}
                <div className="glass p-6 rounded-[2rem]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-purple-400" />
                            <h3 className="font-bold text-white text-lg">SQL Query Editor</h3>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
                            {selectedDb ? `Active DB: ${selectedDb}` : 'No DB selected'}
                        </span>
                    </div>
                    <textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT * FROM users LIMIT 10;"
                        className="w-full h-32 bg-black/30 border border-white/5 rounded-2xl p-4 font-mono text-sm text-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none shadow-inner"
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={runQuery}
                            disabled={queryLoading || !sqlQuery.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                        >
                            {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Run Query
                        </button>
                    </div>
                </div>

                {/* Data View Area */}
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
                    <div className="px-8 py-5 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex bg-white/5 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('data')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'data' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Data Browse
                                </button>
                                <button
                                    onClick={() => setViewMode('schema')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'schema' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Structure
                                </button>
                                <button
                                    onClick={() => setViewMode('query')}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'query' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Query Result
                                </button>
                            </div>
                            {selectedTable && viewMode !== 'query' && (
                                <h4 className="text-sm font-bold text-white flex items-center gap-3">
                                    <Table className="w-4 h-4 text-blue-400" /> {selectedTable}
                                    <button
                                        onClick={() => setIsAddMode(true)}
                                        className="ml-2 p-1 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
                                        title="Add New Row"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </h4>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => selectedTable ? fetchTableContent(selectedTable) : fetchDatabases()} className="p-2 text-gray-500 hover:text-white transition-colors" title="Refresh">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-[400px] max-h-[600px] overflow-auto custom-scrollbar">
                        {viewMode === 'data' && (
                            selectedTable ? renderDataGrid(tableData) : (
                                <div className="flex flex-col items-center justify-center p-20 text-gray-600 opacity-50">
                                    <LayoutGrid className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Select a table to browse data</p>
                                </div>
                            )
                        )}

                        {viewMode === 'schema' && (
                            selectedTable ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Field</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Type</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Null</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Key</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Default</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Extra</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {tableInfo.map(col => (
                                                <tr key={col.Field} className="hover:bg-white/[0.01]">
                                                    <td className="px-6 py-4 font-bold text-white">{col.Field}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-blue-400">{col.Type}</td>
                                                    <td className="px-6 py-4 text-xs text-gray-400">{col.Null}</td>
                                                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${col.Key === 'PRI' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{col.Key || '-'}</span></td>
                                                    <td className="px-6 py-4 text-xs text-gray-400">{col.Default === null ? 'NULL' : col.Default}</td>
                                                    <td className="px-6 py-4 text-xs text-gray-600 italic">{col.Extra}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 text-gray-600 opacity-50">
                                    <Info className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Select a table to view schema</p>
                                </div>
                            )
                        )}

                        {viewMode === 'query' && (
                            queryResult ? (
                                queryResult.success ? (
                                    Array.isArray(queryResult.data) ? renderDataGrid(queryResult.data) : (
                                        <div className="p-12 flex items-center gap-6 bg-green-500/5 m-8 rounded-3xl border border-green-500/10">
                                            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-white">Query successful</p>
                                                <p className="text-sm text-green-400/70 mt-1 font-mono">{JSON.stringify(queryResult.data)}</p>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="p-12 flex items-center gap-6 bg-red-500/5 m-8 rounded-3xl border border-red-500/10">
                                        <div className="w-12 h-12 rounded-2xl bg-red-400/20 flex items-center justify-center">
                                            <XCircle className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-lg text-white">SQL Execution Error</p>
                                            <p className="text-sm text-red-300 font-mono mt-2 break-words bg-black/20 p-4 rounded-xl">{queryResult.error}</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 text-gray-600 opacity-50">
                                    <Terminal className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Run a query to see results</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </main>

            {/* Modal: Edit / Add Row */}
            {(editRow || isAddMode) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setEditRow(null); setIsAddMode(false); }} />
                    <div className="relative w-full max-w-2xl bg-gray-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    {isAddMode ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{isAddMode ? 'Add New Record' : 'Edit Record'}</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedDb}.{selectedTable}</p>
                                </div>
                            </div>
                            <button onClick={() => { setEditRow(null); setIsAddMode(false); }} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[60vh] space-y-4 custom-scrollbar">
                            {tableInfo.map(col => (
                                <div key={col.Field} className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        {col.Field}
                                        {col.Key === 'PRI' && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded-sm">PK</span>}
                                        <span className="opacity-40 text-[9px] lowercase font-normal">({col.Type})</span>
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isAddMode && col.Key === 'PRI'}
                                        value={isAddMode ? (newRowData[col.Field] || '') : (editRow.data[col.Field] || '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (isAddMode) setNewRowData(prev => ({ ...prev, [col.Field]: val }));
                                            else setEditRow(prev => ({ ...prev, data: { ...prev.data, [col.Field]: val } }));
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:opacity-30"
                                        placeholder={`Enter ${col.Field}...`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex gap-3 justify-end">
                            <button
                                onClick={() => { setEditRow(null); setIsAddMode(false); }}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={isAddMode ? insertRow : saveEdit}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isAddMode ? 'Insert Record' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Create DB/Table */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(null)} />
                    <div className="relative w-full max-w-sm bg-gray-900 rounded-[2rem] border border-white/10 shadow-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                <Plus className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-white text-lg">Create {showCreateModal === 'database' ? 'Database' : 'Table'}</h3>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                autoFocus
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder={`Enter ${showCreateModal} name...`}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                            />
                            <button
                                onClick={handleCreateManage}
                                disabled={queryLoading || !createName.trim()}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-600/20"
                            >
                                Create New {showCreateModal}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Database;
