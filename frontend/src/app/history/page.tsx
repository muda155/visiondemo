"use client";

import React, { useEffect, useState } from 'react';

// Tham số cấu hình
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AnalysisItem {
    id: number;
    filename: string;
    adult: number;
    spoof: number;
    medical: number;
    violence: number;
    racy: number;
    timestamp: string;
}

const likelihoodLabel: Record<number, string> = {
    0: 'Không xác định',
    1: 'Rất khó xảy ra',
    2: 'Không có khả năng',
    3: 'Có thể',
    4: 'Có khả năng',
    5: 'Rất có khả năng'
};

const badgeClass = (v: number) => {
    switch (v) {
        case 1: return 'bg-green-100 text-green-700 border-green-300';
        case 2: return 'bg-emerald-100 text-emerald-700 border-emerald-300';
        case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 4: return 'bg-orange-100 text-orange-700 border-orange-300';
        case 5: return 'bg-red-100 text-red-700 border-red-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
};

export default function HistoryPage() {
    const [items, setItems] = useState<AnalysisItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [adminUser, setAdminUser] = useState("");
    const [adminPass, setAdminPass] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${API_BASE}/history`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) {
                let text: any;
                try { text = await res.json(); } catch { text = {}; }
                throw new Error(text?.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setError('Hết thời gian kết nối tới backend (timeout)');
            } else if (e.message === 'Failed to fetch') {
                setError('Không kết nối được tới backend. Kiểm tra server FastAPI có chạy ở cổng 8000 và CORS.');
            } else {
                setError(e.message || 'Lỗi không xác định');
            }
        } finally {
            setLoading(false);
        }
    };

    const deleteItem = async (id: number) => {
        if (!adminUser || !adminPass) {
            setDeleteError('Nhập thông tin admin để xóa.');
            return;
        }
        if (!confirm(`Xóa bản ghi ${id}?`)) return;
        setDeletingId(id);
        setDeleteError(null);
        try {
            const auth = btoa(`${adminUser}:${adminPass}`);
            const res = await fetch(`${API_BASE}/analysis/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { const j = await res.json(); msg = j.detail || j.error || msg; } catch { }
                throw new Error(msg);
            }
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (e: any) {
            setDeleteError(e.message || 'Xóa thất bại');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    return (
        <main className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Lịch sử phân tích</h1>
                    <p className="text-xs text-gray-500">Hiển thị {items.length} bản ghi{items.length === 0 ? '' : ''}.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAttempt(a => a + 1)}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                        disabled={loading}
                    >{loading ? 'Đang tải...' : 'Tải lại'}</button>
                    <a href="/" className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm">← Quay lại</a>
                </div>
            </div>

            {error && (
                <div className="border border-red-300 bg-red-50 text-red-700 p-4 rounded text-sm space-y-2">
                    <div className="font-medium">Lỗi: {error}</div>
                    <ul className="list-disc list-inside text-xs text-red-600">
                        <li>Đảm bảo backend chạy: <code>uvicorn backend.main:app --reload</code></li>
                        <li>Kiểm tra CORS cho phép nguồn http://localhost:3000</li>
                        <li>Kiểm tra biến môi trường NEXT_PUBLIC_API_BASE_URL nếu dùng cổng khác</li>
                    </ul>
                </div>
            )}

            <div className="border rounded p-4 bg-white dark:bg-gray-900 space-y-3">
                <h2 className="text-sm font-semibold">Quyền quản trị</h2>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wide text-gray-500">Username</label>
                        <input value={adminUser} onChange={e => setAdminUser(e.target.value)} className="px-2 py-1 border rounded text-sm bg-transparent" placeholder="admin" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wide text-gray-500">Password</label>
                        <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="px-2 py-1 border rounded text-sm bg-transparent" placeholder="••••••" />
                    </div>
                    <div className="text-xs text-gray-500">Nhập để bật xóa bản ghi.</div>
                </div>
                {deleteError && <div className="text-xs text-red-600">{deleteError}</div>}
            </div>

            {!error && (
                <div className="overflow-x-auto rounded border bg-white dark:bg-gray-900">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-2 text-left">ID</th>
                                <th className="p-2 text-left">Tên file</th>
                                <th className="p-2 text-left">Adult</th>
                                <th className="p-2 text-left">Spoof</th>
                                <th className="p-2 text-left">Medical</th>
                                <th className="p-2 text-left">Violence</th>
                                <th className="p-2 text-left">Racy</th>
                                <th className="p-2 text-left">Thời gian</th>
                                <th className="p-2 text-left">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={8} className="p-4 text-center text-xs text-gray-500">Đang tải dữ liệu...</td></tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr><td colSpan={8} className="p-4 text-center text-xs text-gray-500">Chưa có bản ghi.</td></tr>
                            )}
                            {!loading && items.map(item => (
                                <tr key={item.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="p-2 font-mono text-xs">{item.id}</td>
                                    <td className="p-2 max-w-[160px] truncate" title={item.filename}>{item.filename}</td>
                                    {[item.adult, item.spoof, item.medical, item.violence, item.racy].map((v, i) => (
                                        <td key={i} className="p-2">
                                            <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${badgeClass(v)}`} title={likelihoodLabel[v]}> {v} </span>
                                        </td>
                                    ))}
                                    <td className="p-2 whitespace-nowrap text-xs">{new Date(item.timestamp).toLocaleString('vi-VN')}</td>
                                    <td className="p-2">
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            disabled={!adminUser || !adminPass || deletingId === item.id}
                                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40"
                                        >{deletingId === item.id ? 'Đang xóa...' : 'Xóa'}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
