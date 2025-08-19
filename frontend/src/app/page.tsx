"use client";

import React, { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      case 5: return 'bg-red-100 text-red-700 border-red-300 animate-pulse';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Phân tích thất bại");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 sm:p-12 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <main className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Phân tích an toàn hình ảnh</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tải lên hình ảnh để đánh giá các mức độ: adult, spoof, medical, violence, racy (Google Cloud Vision SafeSearch).</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 border rounded-lg p-5 bg-white dark:bg-gray-900 shadow-sm"
        >
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || loading}
              className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang phân tích..." : "Phân tích"}
            </button>
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); setResult(null); setError(null); }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-medium"
              >Xóa file</button>
            )}
          </div>
        </form>

        {error && <div className="text-red-600 text-sm border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 rounded">Lỗi: {error}</div>}

        {result && (
          <section className="border rounded-lg p-5 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h2 className="font-semibold text-lg">Kết quả</h2>
            {result.safe_search ? (
              <div className="space-y-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1 pr-2">Thuộc tính</th>
                      <th className="py-1 pr-2">Mức</th>
                      <th className="py-1 pr-2">Giải thích</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.safe_search).map(([key, value]) => (
                      <tr key={key} className="border-b last:border-none">
                        <td className="py-1 pr-2 font-medium capitalize">{key}</td>
                        <td className="py-1 pr-2">
                          <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${badgeClass(value as number)}`}>
                            {String(value)}
                          </span>
                        </td>
                        <td className="py-1 pr-2 italic">
                          {likelihoodLabel[value as number] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.db_id && (
                  <p className="text-xs text-gray-500">Đã lưu vào CSDL với ID: {result.db_id}</p>
                )}
                {(result.safe_search.violence >= 4 || result.safe_search.racy >= 4 || result.safe_search.adult >= 4) && (
                  <div className="p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
                    Cảnh báo: Hình ảnh có dấu hiệu vi phạm chuẩn cộng đồng. Vui lòng xem xét lại.
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-blue-600">Xem JSON gốc</summary>
                  <pre className="text-[10px] overflow-x-auto mt-2 bg-black/10 dark:bg-white/10 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Không có dữ liệu phân tích hợp lệ.</div>
            )}
          </section>
        )}

        <div>
          <a
            href="/history"
            className="text-blue-600 hover:underline text-sm font-medium"
          >Xem lịch sử →</a>
        </div>
      </main>
      <footer className="mt-12 text-center text-xs text-gray-500">© 2025 Vision Demo</footer>
    </div>
  );
}
