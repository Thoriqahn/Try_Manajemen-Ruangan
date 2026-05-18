import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Copy, Trash2, Plus, Activity, TrendingUp, Check, RefreshCw } from "lucide-react";
import { tokenService } from "../../services/index";

export function ApiMonitoring() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [revokeModal, setRevokeModal] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newTokenForm, setNewTokenForm] = useState({ name: "", access: "read" as "read" | "read-write" });
  const [generatedToken, setGeneratedToken] = useState<{ client_id: string; secret: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tokenService.list();
      setTokens(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    if (!newTokenForm.name) return;
    setGenerating(true);
    try {
      const data = await tokenService.generate(newTokenForm.name, newTokenForm.access);
      setGeneratedToken({ client_id: data.client_id, secret: data.secret });
      load();
    } catch (e: any) { alert(e.message || "Gagal generate token"); }
    setGenerating(false);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(true);
    try {
      await tokenService.revoke(id);
      setTokens(prev => prev.map(t => t.id === id ? { ...t, status: "revoked" } : t));
    } catch (e: any) { alert(e.message || "Gagal mencabut token"); }
    setRevoking(false);
    setRevokeModal(null);
  };

  // Static analytics data (monitoring only)
  const rpmData = [12, 18, 25, 32, 28, 45, 62, 58, 42, 38, 55, 70, 65, 48, 35, 28, 20, 15, 12, 18, 25, 30, 22, 16];
  const maxRpm = Math.max(...rpmData);
  const httpStatus = [
    { code: "200 OK", count: 11842, pct: 95, color: "bg-green-500" },
    { code: "401 Unauthorized", count: 356, pct: 3, color: "bg-yellow-500" },
    { code: "404 Not Found", count: 120, pct: 1, color: "bg-orange-500" },
    { code: "500 Server Error", count: 42, pct: 0.3, color: "bg-red-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-800" style={{ fontWeight: 700 }}>Integrasi & API</h2>
        <p className="text-sm text-gray-500">Kelola kredensial akses dan pantau performa trafik API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Activity size={18} className="text-blue-500" /><h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Request Per Menit (RPM)</h3></div>
            <span className="text-xs text-gray-400">24 jam terakhir</span>
          </div>
          <div className="flex items-end gap-1 h-28">
            {rpmData.map((val, i) => (
              <div key={i} className="flex-1 group relative">
                <div className="w-full bg-blue-400 rounded-t-sm hover:bg-blue-500 transition-colors" style={{ height: `${(val / maxRpm) * 100}%`, minHeight: "2px" }} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">{val} req</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2"><span>00:00</span><span>12:00</span><span>23:00</span></div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
            <div><div className="text-xs text-gray-400">Peak RPM</div><div className="text-lg text-gray-800" style={{ fontWeight: 700 }}>{maxRpm}</div></div>
            <div><div className="text-xs text-gray-400">Avg RPM</div><div className="text-lg text-gray-800" style={{ fontWeight: 700 }}>{Math.round(rpmData.reduce((a, b) => a + b, 0) / rpmData.length)}</div></div>
            <div><div className="text-xs text-gray-400">Total Req (24h)</div><div className="text-lg text-gray-800" style={{ fontWeight: 700 }}>12,360</div></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-green-500" /><h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Distribusi HTTP Status</h3></div>
          <div className="space-y-3">
            {httpStatus.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{s.code}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{s.count.toLocaleString()}</span><span className="text-sm" style={{ fontWeight: 600 }}>{s.pct}%</span></div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2"><Key size={18} className="text-purple-500" /><h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Manajemen API Token</h3></div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={() => { setGenerateModal(true); setGeneratedToken(null); setNewTokenForm({ name: "", access: "read" }); }}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144] transition-all">
              <Plus size={14} /> Generate Token
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tokens.length === 0 && <div className="px-5 py-12 text-center text-sm text-gray-400">Belum ada token API</div>}
            {tokens.map(token => (
              <div key={token.id} className={`flex items-start justify-between p-5 ${token.status === "revoked" ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${token.status === "active" ? "bg-purple-100" : "bg-gray-100"}`}>
                    <Key size={16} className={token.status === "active" ? "text-purple-600" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{token.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${token.access_level === "read-write" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                        {token.access_level === "read-write" ? "Read-Write" : "Read-Only"}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${token.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`} style={{ fontWeight: 500 }}>
                        {token.status === "active" ? "Aktif" : "Dicabut"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{token.client_id}</code>
                      <button onClick={() => handleCopy(token.client_id, `cid-${token.id}`)} className="text-gray-400 hover:text-blue-500">
                        {copied === `cid-${token.id}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Dibuat: {token.created_at ? new Date(token.created_at).toLocaleDateString("id-ID") : "–"}</div>
                  </div>
                </div>
                {token.status === "active" && (
                  <button onClick={() => setRevokeModal(token.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 text-xs rounded-lg hover:bg-red-50 ml-3 flex-shrink-0">
                    <Trash2 size={12} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {generateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100"><h3 className="text-gray-800" style={{ fontWeight: 700 }}>Generate API Token Baru</h3></div>
            <div className="p-6 space-y-4">
              {!generatedToken ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Nama Aplikasi <span className="text-red-500">*</span></label>
                    <input type="text" value={newTokenForm.name} onChange={e => setNewTokenForm({ ...newTokenForm, name: e.target.value })} placeholder="Contoh: IKNOW Application" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Hak Akses <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ value: "read", label: "Read-Only", desc: "Hanya baca data jadwal" }, { value: "read-write", label: "Read-Write", desc: "Baca + buat booking via API" }].map(opt => (
                        <label key={opt.value} className={`p-3 rounded-lg border cursor-pointer transition-all ${newTokenForm.access === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                          <input type="radio" value={opt.value} checked={newTokenForm.access === opt.value} onChange={e => setNewTokenForm({ ...newTokenForm, access: e.target.value as any })} className="sr-only" />
                          <div className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{opt.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <Check size={24} className="text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700" style={{ fontWeight: 600 }}>Token Berhasil Digenerate!</p>
                    <p className="text-xs text-green-600 mt-1">Salin Secret Key sekarang. Tidak akan ditampilkan lagi.</p>
                  </div>
                  {[{ label: "Client ID", value: generatedToken.client_id }, { label: "Secret Key", value: generatedToken.secret }].map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>{label}</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <code className="flex-1 text-xs text-gray-700 font-mono truncate">{value}</code>
                        <button onClick={() => handleCopy(value, label)} className="text-gray-400 hover:text-blue-500 flex-shrink-0">
                          {copied === label ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setGenerateModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">{generatedToken ? "Tutup" : "Batal"}</button>
              {!generatedToken && (
                <button onClick={handleGenerate} disabled={!newTokenForm.name || generating}
                  className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                  {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</> : "Generate"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {revokeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-gray-800 mb-2" style={{ fontWeight: 700 }}>Cabut Token Akses?</h3>
            <p className="text-sm text-gray-500 mb-6">Aplikasi yang menggunakan token ini akan kehilangan akses secara instan.</p>
            <div className="flex gap-3">
              <button onClick={() => setRevokeModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Batal</button>
              <button onClick={() => handleRevoke(revokeModal!)} disabled={revoking}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {revoking ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</> : "Cabut Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
