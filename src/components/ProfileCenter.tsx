import React, { useState } from "react";
import { User, UserPlus, Users, Lock, Plus, Trash2, Printer, TrendingDown, FolderHeart, Clock, ArrowRight, LogOut, Eye, ShieldAlert } from "lucide-react";
import { UserAccount, PatientProfile, TestRecord } from "../types";

interface ProfileCenterProps {
  currentAccount: UserAccount | null;
  accounts: UserAccount[];
  onLogin: (username: string, passcode: string) => void;
  onRegister: (username: string, passcode: string) => void;
  onLogout: () => void;
  onCreateProfile: (name: string, age: string, gender: string) => void;
  onSwitchProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onLoadRecord: (record: TestRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onPrintRecord: (record: TestRecord) => void;
}

export default function ProfileCenter({
  currentAccount,
  onLogin,
  onRegister,
  onLogout,
  onCreateProfile,
  onSwitchProfile,
  onDeleteProfile,
  onLoadRecord,
  onDeleteRecord,
  onPrintRecord,
}: ProfileCenterProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passcodeInput, setPasscodeInput] = useState<string>("");

  // Create profile form states
  const [showAddProfileForm, setShowAddProfileForm] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileAge, setProfileAge] = useState<string>("");
  const [profileGender, setProfileGender] = useState<string>("male");

  // Handle local Auth Submission
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passcodeInput.trim()) {
      alert("请完整填写用户名和密码");
      return;
    }
    if (passcodeInput.length < 4) {
      alert("密码/PIN码至少需要4位");
      return;
    }
    if (authMode === "login") {
      onLogin(usernameInput.trim(), passcodeInput);
    } else {
      onRegister(usernameInput.trim(), passcodeInput);
    }
    // Clean input
    setUsernameInput("");
    setPasscodeInput("");
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileAge.trim()) {
      alert("请完整填写成员姓名与年龄");
      return;
    }
    onCreateProfile(profileName.trim(), profileAge, profileGender);
    setProfileName("");
    setProfileAge("");
    setProfileGender("male");
    setShowAddProfileForm(false);
  };

  const activeProfile = currentAccount?.profiles.find(p => p.id === currentAccount.activeProfileId) || null;

  // Render SVG Trend chart for hearing history
  const renderTrendChart = (history: TestRecord[]) => {
    // Filter out only records with valid hearing test data (PTA exists)
    const validRecords = history
      .filter((r) => r.ptaLeft !== null || r.ptaRight !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (validRecords.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          目前尚未记录到听阈PTA指标，无法生成趋势走向。
        </div>
      );
    }

    // Audiogram chart reversed Y axis: 0 dB is at top, 100 dB is at bottom
    // We map 0 - 100 dB to SVG Y coordinates: Y = (db / 100) * 80 + 10 (giving margin)
    // Map dates to X coordinates
    const mapY = (db: number) => {
      const clamped = Math.max(0, Math.min(100, db));
      return (clamped / 100) * 65 + 15; // 15 to 80 range
    };

    const getX = (index: number, total: number) => {
      if (total <= 1) return 50; // Center if only 1 point
      return 15 + (index / (total - 1)) * 70; // 15 to 85 range
    };

    const formatDateShort = (isoString: string) => {
      const d = new Date(isoString);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    return (
      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl shadow-inner space-y-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex justify-between">
          <span>听觉纯音平均阀值(PTA)历史监测走势</span>
          <span className="text-slate-400">Y轴倒置: 越靠上听力越好 &darr;</span>
        </span>

        <div className="h-44 w-full relative">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            {[0, 20, 40, 60, 80, 100].map((db) => {
              const y = mapY(db);
              return (
                <g key={db}>
                  <line x1="10" y1={y} x2="90" y2={y} stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1 3" />
                  <text x="5" y={y + 1} fill="#94a3b8" fontSize="2.5" textAnchor="right">{db}dB</text>
                </g>
              );
            })}

            {/* Vertical grid lines and date labels */}
            {validRecords.map((r, idx) => {
              const x = getX(idx, validRecords.length);
              return (
                <g key={r.id}>
                  <line x1={x} y1="15" x2={x} y2="80" stroke="#e2e8f0" strokeWidth="0.3" />
                  <text x={x} y="85" fill="#94a3b8" fontSize="2.5" textAnchor="middle" transform={`rotate(15, ${x}, 85)`}>
                    {formatDateShort(r.date)}
                  </text>
                </g>
              );
            })}

            {/* Plot LEFT Ear (Blue Circle Line) */}
            {validRecords.length > 1 && (
              <path
                d={validRecords.map((r, idx) => {
                  const x = getX(idx, validRecords.length);
                  const y = mapY(r.ptaLeft || 10); // fallback
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.2"
              />
            )}
            {validRecords.map((r, idx) => {
              if (r.ptaLeft === null) return null;
              const x = getX(idx, validRecords.length);
              const y = mapY(r.ptaLeft);
              return (
                <circle key={`l-${r.id}`} cx={x} cy={y} r="1.6" fill="#ffffff" stroke="#3b82f6" strokeWidth="0.8" />
              );
            })}

            {/* Plot RIGHT Ear (Red Cross Line) */}
            {validRecords.length > 1 && (
              <path
                d={validRecords.map((r, idx) => {
                  const x = getX(idx, validRecords.length);
                  const y = mapY(r.ptaRight || 10);
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.2"
              />
            )}
            {validRecords.map((r, idx) => {
              if (r.ptaRight === null) return null;
              const x = getX(idx, validRecords.length);
              const y = mapY(r.ptaRight);
              return (
                <g key={`r-${r.id}`}>
                  <line x1={x - 1} y1={y - 1} x2={x + 1} y2={y + 1} stroke="#ef4444" strokeWidth="0.8" />
                  <line x1={x + 1} y1={y - 1} x2={x - 1} y2={y + 1} stroke="#ef4444" strokeWidth="0.8" />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-center items-center gap-6 text-[9px] text-slate-400 border-t border-slate-100 pt-1.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-blue-500 bg-white"></span>
            左耳 L (PTA走势)
          </span>
          <span className="flex items-center gap-1">
            <span className="text-red-500 font-extrabold text-[10px]">&times;</span>
            右耳 R (PTA走势)
          </span>
        </div>
      </div>
    );
  };

  // --- Auth screen layout ---
  if (!currentAccount) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-fade-in" id="profile-auth-gate">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
            <Lock className="w-6 h-6 text-indigo-100" />
          </div>
          <h3 className="font-extrabold text-base">建立您的听力健康数字档案</h3>
          <p className="text-xs text-indigo-200 mt-1">
            创建本地加密账户，安全保存您和家人每次的检测结果，监控听觉健康走向。
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="p-6 md:p-8 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">受试者用户名 / 主账户名</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="例如：张先生"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">4 位数字安全 PIN 密码</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                maxLength={6}
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入4-6位数字PIN码"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest font-black"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md hover:shadow-lg"
          >
            {authMode === "login" ? "登录本地电子病历档案" : "创建新账户且初始化"}
          </button>

          <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              className="text-indigo-600 hover:underline font-bold"
            >
              {authMode === "login" ? "还没有账户？点击注册" : "已有主账户？前往登录"}
            </button>
            <span className="text-[10px] text-slate-400">数据安全本地硬隔离</span>
          </div>
        </form>
      </div>
    );
  }

  // --- Active Account Dashboard layout ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in" id="profile-center-dashboard">
      
      {/* Left Column: Account info and family member switching */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Account Info Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                {currentAccount.username.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 leading-none">{currentAccount.username}</h4>
                <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">主账户ID: #{currentAccount.id.substring(0,6)}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Switcher Section */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              👪 绑定家庭成员档案 (多群组管理)
            </span>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {currentAccount.profiles.map((p) => {
                const isActive = p.id === currentAccount.activeProfileId;
                return (
                  <div
                    key={p.id}
                    className={`flex justify-between items-center px-3 py-2 rounded-xl border text-xs transition ${
                      isActive
                        ? "bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm"
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSwitchProfile(p.id)}
                      className="flex-1 text-left font-bold flex items-center gap-1.5"
                    >
                      <User className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{p.name} ({p.gender === "male" ? "男" : "女"}&bull;{p.age}岁)</span>
                    </button>
                    {currentAccount.profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`确定要彻底删除家庭成员 [${p.name}] 的档案及其名下的所有历史测试记录吗？此操作无法撤销。`)) {
                            onDeleteProfile(p.id);
                          }
                        }}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-white transition"
                        title="删除此成员"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Create family profile button trigger */}
            {!showAddProfileForm ? (
              <button
                type="button"
                onClick={() => setShowAddProfileForm(true)}
                className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition text-[11px] font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 添加家庭成员听力档案
              </button>
            ) : (
              <form onSubmit={handleCreateProfileSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 block">新家庭成员登记：</span>
                
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="姓名，如：小张 / 母亲"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    required
                    value={profileAge}
                    onChange={(e) => setProfileAge(e.target.value)}
                    placeholder="年龄 (岁)"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                  />
                  <select
                    value={profileGender}
                    onChange={(e) => setProfileGender(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold"
                  >
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddProfileForm(false)}
                    className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-150 rounded-lg text-[10px] font-bold"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-sm"
                  >
                    确认创建并激活
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Safety tips box */}
        <div className="bg-amber-50/50 border border-amber-100 text-amber-900 p-4 rounded-2xl text-[11px] leading-relaxed flex gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong>本地硬隔离提示：</strong>本系统的档案完全隔离保存在您的本地浏览器缓存（LocalStorage）中。清除浏览器Cookie和应用数据会导致档案遗失，建议定期通过“打印纸质报告”保存硬拷贝。
          </p>
        </div>
      </div>

      {/* Right Column: Historical diagnostics records and health trend curves */}
      <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Section Title */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-indigo-600" />
            <span>【{activeProfile?.name}】听力历史档案库</span>
          </h3>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
            已记录: {activeProfile?.testHistory.length || 0} 次筛查
          </span>
        </div>

        {/* 1. Plot Trend graph */}
        {activeProfile && renderTrendChart(activeProfile.testHistory)}

        {/* 2. Historical Records list */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 block">
            📋 历史体检诊断记录 (Past Test Reports):
          </span>

          {(!activeProfile || activeProfile.testHistory.length === 0) ? (
            <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 text-slate-400">
              <Clock className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300 animate-pulse" />
              <p className="text-xs">该受试者目前暂无测试记录，完成『纯音测听』或『耳鸣匹配』后可保存结果。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProfile.testHistory
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => {
                  const dateStr = new Date(record.date).toLocaleString();
                  const showPTA = record.ptaLeft !== null || record.ptaRight !== null;

                  return (
                    <div
                      key={record.id}
                      className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {record.type === "hearing" ? "听力自测" : record.type === "tinnitus" ? "耳鸣匹配" : "综合测试"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{dateStr}</span>
                        </div>
                        
                        <div className="text-xs text-slate-500 leading-normal flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          {showPTA && (
                            <>
                              {record.ptaLeft !== null && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  左耳平均: <strong className="font-mono text-slate-800 font-bold">{record.ptaLeft} dB HL</strong>
                                </span>
                              )}
                              {record.ptaRight !== null && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  右耳平均: <strong className="font-mono text-slate-800 font-bold">{record.ptaRight} dB HL</strong>
                                </span>
                              )}
                            </>
                          )}
                          {record.tinnitus.earSide !== "none" && (
                            <span>耳鸣匹配: <strong className="font-mono text-slate-800 font-bold">{record.tinnitus.matchedFrequency} Hz &bull; {record.tinnitus.matchedLoudness}%</strong></span>
                          )}
                          {record.thiScore !== undefined && record.thiScore > 0 && (
                            <span>THI得分: <strong className="font-mono text-slate-800 font-bold">{record.thiScore}/100</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Record actions buttons */}
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => onLoadRecord(record)}
                          className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          title="将此结果重载入主诊断工作台，查看详细数据曲线或让AI重新诊断"
                        >
                          <Eye className="w-3 h-3" />
                          <span>载入工作台</span>
                        </button>
                        <button
                          onClick={() => onPrintRecord(record)}
                          className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          title="打印此历史记录"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>打印报告</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("确定要删除这笔历史自检档案记录吗？")) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="删除记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
