/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AudiogramData, TinnitusData, PatientInfo, FREQUENCIES, getWHOSeverity, UserAccount, PatientProfile, TestRecord, CalibrationSettings } from "./types";
import { calculateTHIGrade } from "./data/thiQuestions";
import HearingTest from "./components/HearingTest";
import TinnitusTest from "./components/TinnitusTest";
import AudiogramChart from "./components/AudiogramChart";
import PrintReportView from "./components/PrintReportView";
import MarkdownRenderer from "./components/MarkdownRenderer";
import WhoLibrary from "./components/WhoLibrary";
import ProfileCenter from "./components/ProfileCenter";
import SoundCalibration from "./components/SoundCalibration";
import { 
  Heart, 
  Activity, 
  Sparkles, 
  User, 
  Printer, 
  TrendingDown, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  ClipboardList,
  VolumeX,
  Stethoscope,
  Info,
  Sliders,
  ShieldAlert,
  Save,
  SlidersHorizontal
} from "lucide-react";

export default function App() {
  // Navigation / screen routing: "home" | "hearing" | "tinnitus"
  const [screen, setScreen] = useState<"home" | "hearing" | "tinnitus">("home");

  // Home screen visual tabs: "diagnostics" | "profiles" | "who"
  const [homeTab, setHomeTab] = useState<"diagnostics" | "profiles" | "who">("diagnostics");

  // Local Storage Account states
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const raw = localStorage.getItem("tinnitus_audiometry_accounts");
    return raw ? JSON.parse(raw) : [];
  });

  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() => {
    const raw = localStorage.getItem("tinnitus_audiometry_current_account");
    return raw ? JSON.parse(raw) : null;
  });

  // Sound Calibration state
  const [calibration, setCalibration] = useState<CalibrationSettings>(() => {
    const raw = localStorage.getItem("tinnitus_audiometry_calibration");
    return raw ? JSON.parse(raw) : {
      deviceName: "未校准默认音频设备",
      deviceType: "in-ear",
      multiplier: 1.0,
      calibratedAt: ""
    };
  });

  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Patient demographic profile
  const [patient, setPatient] = useState<PatientInfo>(() => {
    // If an account is active on load, use its active profile
    const rawAccount = localStorage.getItem("tinnitus_audiometry_current_account");
    if (rawAccount) {
      const parsed: UserAccount = JSON.parse(rawAccount);
      const activeProf = parsed.profiles.find(p => p.id === parsed.activeProfileId);
      if (activeProf) {
        return { name: activeProf.name, age: activeProf.age, gender: activeProf.gender };
      }
    }
    return { name: "", age: "", gender: "male" };
  });

  // Initialize calibration based on active profile on mount
  useEffect(() => {
    if (currentAccount) {
      const activeProf = currentAccount.profiles.find(p => p.id === currentAccount.activeProfileId);
      if (activeProf && activeProf.calibration) {
        setCalibration(activeProf.calibration);
      }
    }
  }, []);

  // Master states
  const [audiogram, setAudiogram] = useState<AudiogramData>({
    left: {},
    right: {},
  });

  const [tinnitus, setTinnitus] = useState<TinnitusData>({
    earSide: "none",
    matchedFrequency: 4000,
    matchedLoudness: 20,
    soundType: "sine",
  });

  const [thiAnswers, setThiAnswers] = useState<{ [key: number]: number }>({});
  const [thiScore, setThiScore] = useState<number>(0);

  // AI Counselor state
  const [aiReport, setAiReport] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiLoadingStep, setAiLoadingStep] = useState<string>("");

  // Print view state
  const [showPrintReport, setShowPrintReport] = useState<boolean>(false);

  // Auto-fill some demo values if the user wants to play immediately
  const handleAutoFillDemo = () => {
    setPatient({
      name: "华佗同款张先生",
      age: "45",
      gender: "male",
    });
    setAudiogram({
      left: { 250: 15, 500: 20, 1000: 25, 2000: 35, 4000: 45, 6000: 55, 8000: 60 },
      right: { 250: 10, 500: 15, 1000: 20, 2000: 25, 4000: 30, 6000: 35, 8000: 40 },
    });
    setTinnitus({
      earSide: "left",
      matchedFrequency: 6000,
      matchedLoudness: 35,
      soundType: "narrow",
    });
    // Set some sample THI answers to make score non-zero
    const demoAnswers: { [key: number]: number } = {};
    for (let i = 1; i <= 25; i++) {
      if (i % 3 === 0) demoAnswers[i] = 4;
      else if (i % 5 === 0) demoAnswers[i] = 2;
      else demoAnswers[i] = 0;
    }
    setThiAnswers(demoAnswers);
    const score = Object.values(demoAnswers).reduce((sum, s) => sum + s, 0);
    setThiScore(score);
    setAiReport("");
  };

  // Safe reset helper
  const handleResetData = () => {
    if (confirm("确定要重置所有测试结果、听力图与患者信息吗？数据无法恢复。")) {
      setAudiogram({ left: {}, right: {} });
      setTinnitus({ earSide: "none", matchedFrequency: 4000, matchedLoudness: 20, soundType: "sine" });
      setThiAnswers({});
      setThiScore(0);
      setPatient({ name: "", age: "", gender: "male" });
      setAiReport("");
      setScreen("home");
    }
  };

  // --- Account & Profile Management Handlers ---
  const handleRegister = (username: string, passcode: string) => {
    if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
      alert("该用户名已被占用，请输入另一个名字。");
      return;
    }
    const defaultProfile: PatientProfile = {
      id: "prof_" + Math.random().toString(36).substring(2, 11),
      name: username,
      age: "30",
      gender: "male",
      createdAt: new Date().toISOString(),
      testHistory: [],
    };
    const newAccount: UserAccount = {
      id: "acc_" + Math.random().toString(36).substring(2, 11),
      username,
      passcode,
      createdAt: new Date().toISOString(),
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
    };
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    setCurrentAccount(newAccount);
    setPatient({ name: defaultProfile.name, age: defaultProfile.age, gender: defaultProfile.gender });
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updated));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(newAccount));
    alert("本地听力健康账户创建成功，并已自动登入！");
  };

  const handleLogin = (username: string, passcode: string) => {
    const acc = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase() && a.passcode === passcode);
    if (!acc) {
      alert("密码不正确或用户名不存在，请重新输入。");
      return;
    }
    setCurrentAccount(acc);
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(acc));
    const activeProf = acc.profiles.find((p) => p.id === acc.activeProfileId);
    if (activeProf) {
      setPatient({ name: activeProf.name, age: activeProf.age, gender: activeProf.gender });
      if (activeProf.calibration) {
        setCalibration(activeProf.calibration);
      } else {
        setCalibration({
          deviceName: "未校准默认音频设备",
          deviceType: "in-ear",
          multiplier: 1.0,
          calibratedAt: ""
        });
      }
    }
    alert("登录成功！");
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    setPatient({ name: "", age: "", gender: "male" });
    setCalibration({
      deviceName: "未校准默认音频设备",
      deviceType: "in-ear",
      multiplier: 1.0,
      calibratedAt: ""
    });
    localStorage.removeItem("tinnitus_audiometry_current_account");
  };

  const handleCreateProfile = (name: string, age: string, gender: string) => {
    if (!currentAccount) return;
    const newProfile: PatientProfile = {
      id: "prof_" + Math.random().toString(36).substring(2, 11),
      name,
      age,
      gender,
      createdAt: new Date().toISOString(),
      testHistory: [],
    };
    const updatedProfiles = [...currentAccount.profiles, newProfile];
    const updatedAccount = { ...currentAccount, profiles: updatedProfiles, activeProfileId: newProfile.id };
    setCurrentAccount(updatedAccount);
    setPatient({ name, age, gender });
    setCalibration({
      deviceName: "未校准默认音频设备",
      deviceType: "in-ear",
      multiplier: 1.0,
      calibratedAt: ""
    });
    const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
    setAccounts(updatedAccounts);
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
    alert(`成功添加家庭成员档案【${name}】！`);
  };

  const handleSwitchProfile = (profileId: string) => {
    if (!currentAccount) return;
    const prof = currentAccount.profiles.find((p) => p.id === profileId);
    if (!prof) return;
    const updatedAccount = { ...currentAccount, activeProfileId: profileId };
    setCurrentAccount(updatedAccount);
    setPatient({ name: prof.name, age: prof.age, gender: prof.gender });
    if (prof.calibration) {
      setCalibration(prof.calibration);
    } else {
      setCalibration({
        deviceName: "未校准默认音频设备",
        deviceType: "in-ear",
        multiplier: 1.0,
        calibratedAt: ""
      });
    }
    const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
    setAccounts(updatedAccounts);
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!currentAccount) return;
    const updatedProfiles = currentAccount.profiles.filter((p) => p.id !== profileId);
    let nextActiveId = currentAccount.activeProfileId;
    if (nextActiveId === profileId && updatedProfiles.length > 0) {
      nextActiveId = updatedProfiles[0].id;
    }
    const updatedAccount = { ...currentAccount, profiles: updatedProfiles, activeProfileId: nextActiveId };
    setCurrentAccount(updatedAccount);
    const prof = updatedProfiles.find((p) => p.id === nextActiveId);
    if (prof) {
      setPatient({ name: prof.name, age: prof.age, gender: prof.gender });
      if (prof.calibration) {
        setCalibration(prof.calibration);
      } else {
        setCalibration({
          deviceName: "未校准默认音频设备",
          deviceType: "in-ear",
          multiplier: 1.0,
          calibratedAt: ""
        });
      }
    }
    const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
    setAccounts(updatedAccounts);
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
  };

  const handleLoadRecord = (record: TestRecord) => {
    setAudiogram(record.audiogram);
    setTinnitus(record.tinnitus);
    setThiAnswers(record.thiAnswers || {});
    setThiScore(record.thiScore || 0);
    setAiReport(record.aiReport || "");
    setHomeTab("diagnostics");
    alert("已将该份历史测试数据重新载入到您当前的工作台中！您可以上下拖动听力曲线或重新获取 AI 会诊报告。");
  };

  const handlePrintRecord = (record: TestRecord) => {
    setAudiogram(record.audiogram);
    setTinnitus(record.tinnitus);
    setThiAnswers(record.thiAnswers || {});
    setThiScore(record.thiScore || 0);
    setAiReport(record.aiReport || "");
    setShowPrintReport(true);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!currentAccount) return;
    const updatedProfiles = currentAccount.profiles.map((p) => {
      if (p.id === currentAccount.activeProfileId) {
        return {
          ...p,
          testHistory: p.testHistory.filter((r) => r.id !== recordId),
        };
      }
      return p;
    });
    const updatedAccount = { ...currentAccount, profiles: updatedProfiles };
    setCurrentAccount(updatedAccount);
    const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
    setAccounts(updatedAccounts);
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
  };

  const handleCalibrationComplete = (settings: CalibrationSettings) => {
    setCalibration(settings);
    localStorage.setItem("tinnitus_audiometry_calibration", JSON.stringify(settings));
    setIsCalibrating(false);

    if (currentAccount) {
      const updatedProfiles = currentAccount.profiles.map((p) => {
        if (p.id === currentAccount.activeProfileId) {
          return {
            ...p,
            calibration: settings,
          };
        }
        return p;
      });
      const updatedAccount = { ...currentAccount, profiles: updatedProfiles };
      setCurrentAccount(updatedAccount);
      const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
      setAccounts(updatedAccounts);
      localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
      localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
    }
    alert(`校准数据已应用到耳鼻喉声电测听模块！校准系数: ${settings.multiplier.toFixed(2)}x`);
  };

  const saveCurrentResultToHistory = () => {
    if (!currentAccount) {
      alert("请前往“成员与历史中心”注册或登录主账户，以便保存本次诊断记录。");
      setHomeTab("profiles");
      return;
    }

    const ptaL = getPTA(audiogram.left);
    const ptaR = getPTA(audiogram.right);

    const newRecord: TestRecord = {
      id: "rec_" + Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      type: (Object.keys(audiogram.left).length > 0 || Object.keys(audiogram.right).length > 0) && tinnitus.earSide !== "none"
        ? "both"
        : tinnitus.earSide !== "none"
        ? "tinnitus"
        : "hearing",
      audiogram,
      tinnitus,
      thiAnswers,
      thiScore,
      aiReport,
      ptaLeft: ptaL,
      ptaRight: ptaR,
    };

    const activeProf = currentAccount.profiles.find((p) => p.id === currentAccount.activeProfileId);
    if (!activeProf) return;

    const updatedProfiles = currentAccount.profiles.map((p) => {
      if (p.id === currentAccount.activeProfileId) {
        return {
          ...p,
          testHistory: [...p.testHistory, newRecord],
        };
      }
      return p;
    });

    const updatedAccount = { ...currentAccount, profiles: updatedProfiles };
    setCurrentAccount(updatedAccount);
    const updatedAccounts = accounts.map((a) => (a.id === currentAccount.id ? updatedAccount : a));
    setAccounts(updatedAccounts);
    localStorage.setItem("tinnitus_audiometry_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("tinnitus_audiometry_current_account", JSON.stringify(updatedAccount));
    alert(`已将本次测试结果安全归档到家庭成员【${activeProf.name}】的名下！`);
  };

  // Calculate PTA (Pure Tone Average for 500, 1000, 2000, 4000 Hz)
  const getPTA = (earData: { [key: number]: number }) => {
    const freqs = [500, 1000, 2000, 4000];
    let sum = 0;
    let count = 0;
    freqs.forEach((f) => {
      if (typeof earData[f] === "number") {
        sum += earData[f];
        count++;
      }
    });
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
  };

  const leftPTA = getPTA(audiogram.left);
  const rightPTA = getPTA(audiogram.right);

  const leftWHO = leftPTA !== null ? getWHOSeverity(leftPTA) : null;
  const rightWHO = rightPTA !== null ? getWHOSeverity(rightPTA) : null;

  const thiResult = calculateTHIGrade(thiScore);

  // Trigger Gemini AI Report Compilation
  const generateAiReport = async () => {
    // Basic verification
    const hasHearingData = Object.keys(audiogram.left).length > 0 || Object.keys(audiogram.right).length > 0;
    const hasTinnitusData = tinnitus.earSide !== "none";

    if (!hasHearingData && !hasTinnitusData) {
      alert("请至少完成『听力测试』或『耳鸣匹配』中的一项，AI 才能帮您分析数据。");
      return;
    }

    setIsAiLoading(true);
    setAiLoadingStep("🔍 正在初始化患者电子听力指标数据库...");

    // Stagger loading messages for reassurance and realism
    const steps = [
      "🩺 正在调阅世界卫生组织 (WHO) 听力损失评估规范...",
      "⚡ 正在分析耳鸣物理频谱频率与听力受损波段相关度...",
      "📊 正在对比国际耳鸣残疾指数 (THI) 神经阻碍模型...",
      "🧠 正在启用 Gemini 3.5 AI 临床辅导模型拟定科学声疗方案...",
      "📝 正在输出个性化医学筛查报告与康复习惯指导..."
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setAiLoadingStep(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(stepInterval);
      }
    }, 1500);

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audiogram,
          tinnitus,
          thiAnswers,
          thiScore,
          name: patient.name,
          age: patient.age,
          gender: patient.gender === "male" ? "男" : patient.gender === "female" ? "女" : "不便透露",
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (res.ok) {
        setAiReport(data.report);
      } else {
        alert(data.error || "获取 AI 报告失败，请重试。");
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error(err);
      alert("网络连接超时或服务器异常，AI 报告获取失败。");
    } finally {
      setIsAiLoading(false);
    }
  };

  const hasAnyTestedData = 
    Object.keys(audiogram.left).length > 0 || 
    Object.keys(audiogram.right).length > 0 || 
    tinnitus.earSide !== "none";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Navbar Title Bar */}
      <header id="main-app-header" className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Stethoscope className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                耳鸣与听力测试系统
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-1">
                TINNITUS & AUDIOMETRY CLINICAL SUITE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAutoFillDemo}
              className="py-1.5 px-3 border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 text-xs font-bold rounded-lg transition"
            >
              🚀 导入演示数据
            </button>
            {hasAnyTestedData && (
              <button
                onClick={handleResetData}
                className="py-1.5 px-3 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-lg transition"
              >
                重置系统
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary Routing */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-8">
        {screen === "home" && (
          /* Landing Page Dashboard Grid */
          <div className="space-y-8 animate-fade-in print:hidden">
            
            {/* Clinical Navigation Sub-Header */}
            <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setHomeTab("diagnostics")}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    homeTab === "diagnostics"
                      ? "bg-white text-indigo-700 shadow-sm animate-fade-in"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>测听诊断大厅</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setHomeTab("profiles")}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    homeTab === "profiles"
                      ? "bg-white text-indigo-700 shadow-sm animate-fade-in"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>家庭成员与历史中心</span>
                  {currentAccount && (
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setHomeTab("who")}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    homeTab === "who"
                      ? "bg-white text-indigo-700 shadow-sm animate-fade-in"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>WHO 科普标准馆</span>
                </button>
              </div>

              {/* Sound Calibration status pill / action button */}
              <div className="flex items-center justify-between sm:justify-end gap-3 px-1 sm:px-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">校准状态</p>
                  <p className="text-xs font-extrabold text-slate-700 mt-0.5 truncate max-w-[120px]" title={calibration.deviceName}>
                    {calibration.deviceName} ({calibration.multiplier.toFixed(2)}x)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalibrating(true)}
                  className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-indigo-100 shadow-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>量级校准</span>
                </button>
              </div>
            </div>

            {homeTab === "profiles" && (
              <ProfileCenter
                currentAccount={currentAccount}
                accounts={accounts}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
                onCreateProfile={handleCreateProfile}
                onSwitchProfile={handleSwitchProfile}
                onDeleteProfile={handleDeleteProfile}
                onLoadRecord={handleLoadRecord}
                onDeleteRecord={handleDeleteRecord}
                onPrintRecord={handlePrintRecord}
              />
            )}

            {homeTab === "who" && (
              <WhoLibrary />
            )}

            {homeTab === "diagnostics" && (
              <>
                {/* Top row: Profile and launch test modules */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <User className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-extrabold text-slate-800 text-sm">
                          受试者档案登记
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        为了使评估报告和 AI 康复方案符合您的具体生理情况，请先录入基本属性：
                      </p>
                      
                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 block mb-1">受试者姓名/昵称</label>
                          <input
                            type="text"
                            value={patient.name}
                            onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                            placeholder="例如：张先生"
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">受测年龄 (岁)</label>
                            <input
                              type="number"
                              value={patient.age}
                              onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                              placeholder="例如：45"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">生理性别</label>
                            <div className="grid grid-cols-2 gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => setPatient({ ...patient, gender: "male" })}
                                className={`py-1 rounded-md text-[10px] font-bold transition ${
                                  patient.gender === "male"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                男
                              </button>
                              <button
                                type="button"
                                onClick={() => setPatient({ ...patient, gender: "female" })}
                                className={`py-1 rounded-md text-[10px] font-bold transition ${
                                  patient.gender === "female"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                女
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4 text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>登记信息将被保存在浏览器本地，并自动写入打印纸质报告中。</span>
                    </div>
                  </div>

                  {/* Launcher Bento Cards */}
                  <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* 1. Pure Tone Audiometry Launcher */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all duration-200 group">
                      <div className="space-y-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
                          <Activity className="w-5.5 h-5.5 stroke-[2.5]" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">
                          左右耳纯音听力测试
                        </h3>
                        <p className="text-xs text-slate-500 leading-normal">
                          测试 250Hz、500Hz、1000Hz、2000Hz、4000Hz、6000Hz、8000Hz 关键言语和高频频段听力损失程度。
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        {/* Tiny state indicator */}
                        <div className="bg-indigo-50/80 border border-indigo-100/40 rounded-lg p-2.5 text-[10px] text-indigo-800 flex justify-between items-center">
                          <span>已录入测试频段:</span>
                          <span className="font-mono font-bold">
                            L: {Object.keys(audiogram.left).length}/7 | R: {Object.keys(audiogram.right).length}/7
                          </span>
                        </div>

                        <button
                          onClick={() => setScreen("hearing")}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          开始纯音听阈测试 &rarr;
                        </button>
                      </div>
                    </div>

                    {/* 2. Tinnitus & THI Scale Launcher */}
                    <div className="bg-gradient-to-br from-teal-50 to-white p-6 rounded-2xl border border-teal-100 shadow-sm flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all duration-200 group">
                      <div className="space-y-3">
                        <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
                          <Heart className="w-5.5 h-5.5 stroke-[2.5]" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">
                          耳鸣匹配与残疾程度量表
                        </h3>
                        <p className="text-xs text-slate-500 leading-normal">
                          拟合耳鸣的纯音频率或环境响度阻碍，并进行 25 题国际标准的耳鸣残疾指数（THI）综合测定。
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        {/* Tiny state indicator */}
                        <div className="bg-teal-50/80 border border-teal-100/40 rounded-lg p-2.5 text-[10px] text-teal-800 flex justify-between items-center">
                          <span>耳鸣声拟合 & THI量表:</span>
                          <span className="font-mono font-bold">
                            {tinnitus.earSide !== "none" ? `${tinnitus.matchedFrequency}Hz 匹配` : "未测"} | 已答 {Object.keys(thiAnswers).length}/25题
                          </span>
                        </div>

                        <button
                          onClick={() => setScreen("tinnitus")}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          开展耳鸣评估 &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Results Dashboard (Only shows if they have tested anything) */}
                {hasAnyTestedData ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left: Audiogram visualization */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-indigo-600" />
                          当前纯音测听图 (Audiogram)
                        </h3>
                        {currentAccount && (
                          <button
                            onClick={saveCurrentResultToHistory}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition shadow-sm flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> 保存到我的档案史
                          </button>
                        )}
                      </div>

                      <AudiogramChart leftData={audiogram.left} rightData={audiogram.right} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Left ear status summary */}
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>左耳 L 听力水平
                            </span>
                            {leftPTA !== null && (
                              <span className="text-xs font-black text-indigo-600 font-mono">
                                PTA: {leftPTA} dB HL
                              </span>
                            )}
                          </div>
                          {leftWHO ? (
                            <div className={`p-2.5 rounded-lg border text-xs font-bold text-center ${leftWHO.color}`}>
                              {leftWHO.grade}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">请完整测试左耳各音频以计算等级</p>
                          )}
                        </div>

                        {/* Right ear status summary */}
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>右耳 R 听力水平
                            </span>
                            {rightPTA !== null && (
                              <span className="text-xs font-black text-indigo-600 font-mono">
                                PTA: {rightPTA} dB HL
                              </span>
                            )}
                          </div>
                          {rightWHO ? (
                            <div className={`p-2.5 rounded-lg border text-xs font-bold text-center ${rightWHO.color}`}>
                              {rightWHO.grade}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">请完整测试右耳各音频以计算等级</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: WHO standard guidelines & Tinnitus values card */}
                    <div className="lg:col-span-5 space-y-6">
                      {/* Tinnitus & THI assessment results */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                            <VolumeX className="w-5 h-5 text-teal-600" />
                            耳鸣及残疾阻碍评估现状
                          </h3>
                        </div>

                        {/* Tinnitus details */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-400 font-bold block">耳鸣定位:</span>
                            <span className="font-extrabold text-slate-700">
                              {tinnitus.earSide === "left" ? "左耳 L" : tinnitus.earSide === "right" ? "右耳 R" : tinnitus.earSide === "both" ? "双耳/头鸣" : "暂无/未评估"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">匹配音高:</span>
                            <span className="font-extrabold text-slate-700">
                              {tinnitus.earSide !== "none" ? `${tinnitus.matchedFrequency} Hz` : "未匹配"}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="text-slate-400 font-bold block">匹配相对响度:</span>
                            <span className="font-extrabold text-slate-700">
                              {tinnitus.earSide !== "none" ? `${tinnitus.matchedLoudness}%` : "未匹配"}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="text-slate-400 font-bold block">声波类型:</span>
                            <span className="font-extrabold text-slate-700">
                              {tinnitus.soundType === "sine" ? "高频纯音" : tinnitus.soundType === "narrow" ? "窄带噪音" : tinnitus.soundType === "white" ? "平坦白噪" : "粉红噪声"}
                            </span>
                          </div>
                        </div>

                        {/* THI details */}
                        <div className="border border-slate-200/80 rounded-xl p-4 flex items-center gap-4">
                          <div className="bg-slate-900 text-white rounded-lg p-2 text-center min-w-[60px] shrink-0 font-mono">
                            <span className="text-[9px] block opacity-75 uppercase leading-none">THI得分</span>
                            <span className="text-xl font-black leading-none">{thiScore}</span>
                            <span className="text-[9px] block opacity-70 mt-0.5">/ 100</span>
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs">
                              严重度：{thiResult.severity}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                              {thiResult.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* WHO Standards card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <BookOpen className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-extrabold text-slate-800 text-sm">
                            WHO 世界卫生组织康复建议
                          </h3>
                        </div>

                        <div className="text-[11px] leading-relaxed text-slate-600 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {leftWHO && (
                            <div className="border-l-4 border-blue-400 pl-3">
                              <strong className="text-slate-800 font-bold block mb-0.5">左耳建议:</strong>
                              <p>{leftWHO.recommendation}</p>
                            </div>
                          )}
                          {rightWHO && (
                            <div className="border-l-4 border-red-400 pl-3 pt-1">
                              <strong className="text-slate-800 font-bold block mb-0.5">右耳建议:</strong>
                              <p>{rightWHO.recommendation}</p>
                            </div>
                          )}
                          {!leftWHO && !rightWHO && (
                            <p className="text-slate-400 italic">请先完成左右耳纯音测听以提取对应的 WHO 科学康复干预方案。</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* No Data Welcome Card */
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                      <ClipboardList className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-slate-800 font-extrabold text-base">准备好了吗？点击下方或右上角导入数据开始</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        您可以点击右上角“🚀 导入演示数据”一键预测诊断效果，或者带上双声道立体声耳机，进入测试模块进行完全属于自己的精确听觉筛查。
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setScreen("hearing")}
                        className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                      >
                        开始我的听力测试
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoFillDemo}
                        className="py-2 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition"
                      >
                        导入一键演示
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Row: AI generated report section */}
                {hasAnyTestedData && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
                          <h3 className="text-base font-extrabold tracking-tight">
                            临床医生 & Gemini AI 深度智能会诊辅导报告
                          </h3>
                        </div>
                        <p className="text-xs text-indigo-200/80 max-w-xl">
                          通过临床级别的大语言模型，多维度结合您的听力图走势、高频衰减、耳鸣拟合波形以及 THI 量表，提供一份长达千字的深度病生理分析与声疗TRT自训练计划。
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={generateAiReport}
                          disabled={isAiLoading}
                          className="py-2.5 px-5 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-700 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-amber-900/10 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4 fill-current" />
                          {aiReport ? "重新生成 AI 会诊报告" : "一键生成 AI 智能会诊报告"}
                        </button>
                        {aiReport && (
                          <button
                            type="button"
                            onClick={() => setShowPrintReport(true)}
                            className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 border border-white/10"
                          >
                            <Printer className="w-4 h-4" /> 打印纸质报告 / 保存为 PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading state indicator */}
                    {isAiLoading && (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-center space-y-1">
                          <p className="text-xs font-bold text-amber-300 tracking-wide animate-pulse">
                            {aiLoadingStep}
                          </p>
                          <p className="text-[10px] text-indigo-300">
                            正在整理临床听阈及残疾阻碍数据进行云会诊，大约需要 10-15 秒...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Display compiled markdown report */}
                    {!isAiLoading && aiReport && (
                      <div className="bg-white text-slate-800 rounded-xl p-6 md:p-8 shadow-inner max-h-[600px] overflow-y-auto space-y-2 border border-slate-100">
                        <MarkdownRenderer content={aiReport} />
                        
                        <div className="border-t border-slate-100 pt-5 mt-6 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowPrintReport(true)}
                            className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                          >
                            <Printer className="w-4 h-4" /> 打印当前会诊报告 (PDF/纸质)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Instruction reminder if report empty */}
                    {!isAiLoading && !aiReport && (
                      <div className="py-6 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-4">
                        <Stethoscope className="w-10 h-10 text-indigo-400 stroke-[1.5] mb-2" />
                        <p className="text-xs text-indigo-200">
                          报告尚未生成。请完成上方耳功能测试，并点击「一键生成 AI 智能会诊报告」获取资深听力学专家的深度剖析。
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </>
            )}

            {/* Disclaimer disclaimer section */}
            <div className="bg-amber-50 border border-amber-150 rounded-xl p-4 flex gap-3 text-amber-900 text-[11px] leading-relaxed max-w-4xl mx-auto">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5 text-amber-950">医疗健康特别警示：</strong>
                本软件属于听觉辅助自查康复筛选小工具，非正式医疗器械，测试结果无法等同于医用隔音纯音电测听诊断。如果您突然发生单侧听力暴跌（72小时黄金窗突发性耳聋），或伴有剧烈眩晕流脓，请勿自行等待或声疗，必须立即前往正规医院耳鼻喉科急诊就医，以免延误病情。
              </div>
            </div>

            {/* Calibration Dialog Modal overlay */}
            {isCalibrating && (
              <SoundCalibration
                onCancel={() => setIsCalibrating(false)}
                onComplete={handleCalibrationComplete}
              />
            )}

          </div>
        )}

        {screen === "hearing" && (
          <HearingTest
            initialData={audiogram}
            calibrationMultiplier={calibration.multiplier}
            onBack={() => setScreen("home")}
            onSave={(data) => {
              setAudiogram(data);
              setScreen("home");
            }}
          />
        )}

        {screen === "tinnitus" && (
          <TinnitusTest
            initialTinnitus={tinnitus}
            initialAnswers={thiAnswers}
            onBack={() => setScreen("home")}
            onSave={(data, answers, score) => {
              setTinnitus(data);
              setThiAnswers(answers);
              setThiScore(score);
              setScreen("home");
            }}
          />
        )}
      </main>

      {/* Footer credits and information */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-[10px] text-slate-400 leading-normal print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-500">耳鸣与听力测试评估系统 &bull; 基于世界卫生组织（WHO）听力筛查规范制</p>
          <p>智能会诊意见由 Gemini Flash 神经医学临床模型提供 &bull; 本地数据完全离线安全存储</p>
          <p className="pt-2 text-slate-300">© 2026 Clinical Tinnitus & Audiometry Project. All rights reserved.</p>
        </div>
      </footer>

      {/* Full-screen paper printer dialog rendering */}
      {showPrintReport && (
        <PrintReportView
          patient={patient}
          audiogram={audiogram}
          tinnitus={tinnitus}
          thiAnswers={thiAnswers}
          thiScore={thiScore}
          aiReport={aiReport}
          onClose={() => setShowPrintReport(false)}
        />
      )}
    </div>
  );
}
