import { useState, useEffect } from "react";
import { Video, Shield, Plus, Trash2, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import { zoomService, ZoomConfig, ZoomAccount } from "../../services/zoomService";
import { toast } from "sonner";

export function ZoomManagement() {
  // Config state
  const [config, setConfig] = useState<ZoomConfig>({ client_id: "", client_secret: "", account_id: "" });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [connectionMsg, setConnectionMsg] = useState("");

  // Accounts state
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await zoomService.getConfig();
        if (res.data) setConfig(res.data);
      } catch (err) {
        console.error("Failed to load Zoom config:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await zoomService.listAccounts();
        setAccounts(res.data || []);
      } catch (err) {
        console.error("Failed to load Zoom accounts:", err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, []);

  const handleSaveConfig = async () => {
    if (!config.client_id || !config.client_secret || !config.account_id) {
      toast.error("Semua field konfigurasi wajib diisi");
      return;
    }
    setConfigSaving(true);
    try {
      const res = await zoomService.saveConfig(config);
      if (res.success) {
        toast.success("Konfigurasi Zoom berhasil disimpan");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan konfigurasi");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setConnectionMsg("");
    try {
      const res = await zoomService.testConnection();
      if (res.success) {
        setConnectionStatus("success");
        setConnectionMsg(res.message || `Terhubung ke ${res.data?.user_email || "Zoom"}`);
        toast.success("Koneksi berhasil!");
      } else {
        setConnectionStatus("error");
        setConnectionMsg(res.message || "Koneksi gagal");
        toast.error("Koneksi gagal");
      }
    } catch (err: any) {
      setConnectionStatus("error");
      setConnectionMsg(err.message || "Gagal menghubungi Zoom API");
      toast.error(err.message || "Gagal menghubungi Zoom API");
    }
  };

  const handleAddAccount = async () => {
    if (!addEmail) {
      toast.error("Email Zoom wajib diisi");
      return;
    }
    setAddLoading(true);
    try {
      const res = await zoomService.addAccount(addEmail, addLabel || undefined);
      if (res.success) {
        // Re-fetch accounts
        const accts = await zoomService.listAccounts();
        setAccounts(accts.data || []);
        setAddEmail("");
        setAddLabel("");
        toast.success(`Akun ${addEmail} berhasil ditambahkan`);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah akun");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    setRemovingId(id);
    try {
      await zoomService.removeAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success("Akun berhasil dihapus dari pool");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus akun");
    } finally {
      setRemovingId(null);
    }
  };

  const handleVerifyAccount = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await zoomService.verifyAccount(id);
      if (res.success) {
        setAccounts(prev =>
          prev.map(a => a.id === id ? { ...a, license_type: res.data?.license_type || "Verified", is_active: true } : a)
        );
        toast.success(`Lisensi terverifikasi: ${res.data?.license_type || "OK"}`);
      } else {
        toast.error(res.message || "Verifikasi gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memverifikasi akun");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-gray-800 flex items-center gap-2" style={{ fontWeight: 700 }}>
          <Video size={22} className="text-blue-600" />
          Integrasi Zoom Premium
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi Server-to-Server OAuth dan kelola pool akun Zoom untuk rapat online & hybrid.
        </p>
      </div>

      {/* OAuth Config Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.95rem" }}>Konfigurasi OAuth (Server-to-Server)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Masukkan kredensial dari Zoom Marketplace App Anda</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {configLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-10 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Account ID</label>
                <input
                  type="text" value={config.account_id}
                  onChange={e => setConfig({ ...config, account_id: e.target.value })}
                  placeholder="Masukkan Zoom Account ID"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Client ID</label>
                <input
                  type="text" value={config.client_id}
                  onChange={e => setConfig({ ...config, client_id: e.target.value })}
                  placeholder="Masukkan Zoom Client ID"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"} value={config.client_secret}
                    onChange={e => setConfig({ ...config, client_secret: e.target.value })}
                    placeholder="Masukkan Zoom Client Secret"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50 font-mono"
                  />
                  <button onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Connection status */}
              {connectionStatus !== "idle" && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs ${
                  connectionStatus === "testing" ? "bg-blue-50 border border-blue-200 text-blue-700" :
                  connectionStatus === "success" ? "bg-green-50 border border-green-200 text-green-700" :
                  "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  {connectionStatus === "testing" && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  {connectionStatus === "success" && <Wifi size={14} />}
                  {connectionStatus === "error" && <WifiOff size={14} />}
                  <span style={{ fontWeight: 500 }}>{connectionMsg || "Menguji koneksi..."}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSaveConfig} disabled={configSaving}
                  className="px-4 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#0F2144] disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {configSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "Simpan Konfigurasi"}
                </button>
                <button onClick={handleTestConnection} disabled={connectionStatus === "testing" || !config.client_id}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {connectionStatus === "testing" ? <><RefreshCw size={14} className="animate-spin" />Menguji...</> : <><Wifi size={14} />Tes Koneksi</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Pool Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Video size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.95rem" }}>Pool Akun Zoom</h3>
              <p className="text-xs text-gray-400 mt-0.5">Kelola akun Zoom berlisensi untuk penjadwalan otomatis rapat</p>
            </div>
          </div>
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
            {accounts.filter(a => a.is_active).length} Aktif
          </span>
        </div>

        {/* Add account form */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Email Zoom</label>
              <input
                type="email" value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Label (opsional)</label>
              <input
                type="text" value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="Contoh: Zoom Utama"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white"
              />
            </div>
            <button onClick={handleAddAccount} disabled={addLoading || !addEmail}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex-shrink-0">
              {addLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
              Tambah
            </button>
          </div>
        </div>

        {/* Account list */}
        <div className="divide-y divide-gray-100">
          {accountsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-5 flex items-center gap-4">
                <div className="animate-pulse w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse h-4 w-48 bg-gray-200 rounded" />
                  <div className="animate-pulse h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
            ))
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Video size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm" style={{ fontWeight: 500 }}>Belum ada akun Zoom</p>
              <p className="text-xs text-gray-400 mt-1">Tambahkan akun berlisensi untuk mulai menjadwalkan rapat otomatis.</p>
            </div>
          ) : (
            accounts.map(account => (
              <div key={account.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${account.is_active ? "bg-indigo-500" : "bg-gray-400"}`} style={{ fontWeight: 700 }}>
                  {account.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>{account.email}</span>
                    {account.label && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{account.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {account.license_type ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> {account.license_type}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> Belum diverifikasi
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${account.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {account.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleVerifyAccount(account.id)} disabled={verifyingId === account.id}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Verifikasi Lisensi">
                    {verifyingId === account.id ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                  </button>
                  <button onClick={() => handleRemoveAccount(account.id)} disabled={removingId === account.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Hapus dari Pool">
                    {removingId === account.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-sm text-blue-800 mb-1" style={{ fontWeight: 600 }}>💡 Cara Kerja</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
          <li>Saat user membuat booking dengan tipe <strong>Online</strong> atau <strong>Hybrid</strong>, sistem akan otomatis membuat Zoom Meeting menggunakan akun yang tersedia.</li>
          <li>Akun Zoom diambil dari pool secara <strong>round-robin</strong> — akun yang paling sedikit digunakan di jam tersebut akan diprioritaskan.</li>
          <li>Pastikan setiap akun memiliki lisensi <strong>Licensed</strong> atau <strong>Pro</strong> agar tidak terbatas 40 menit.</li>
          <li>Jika semua akun penuh, booking tetap dibuat tetapi link Zoom tidak akan dibuat otomatis.</li>
        </ul>
      </div>
    </div>
  );
}
