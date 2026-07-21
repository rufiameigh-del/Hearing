import React, { useEffect } from "react";
import { AudiogramData, TinnitusData, PatientInfo, getWHOSeverity, FREQUENCIES } from "../types";
import { calculateTHIGrade } from "../data/thiQuestions";
import AudiogramChart from "./AudiogramChart";
import MarkdownRenderer from "./MarkdownRenderer";
import { Printer, X, ShieldAlert, Award, FileSpreadsheet } from "lucide-react";

interface PrintReportViewProps {
  patient: PatientInfo;
  audiogram: AudiogramData;
  tinnitus: TinnitusData;
  thiAnswers: { [key: number]: number };
  thiScore: number;
  aiReport: string;
  onClose: () => void;
}

export default function PrintReportView({
  patient,
  audiogram,
  tinnitus,
  thiAnswers,
  thiScore,
  aiReport,
  onClose,
}: PrintReportViewProps) {
  // Auto open printer window
  const handlePrint = () => {
    window.print();
  };

  // Calculate PTA (Pure Tone Average for 500, 1000, 2000, 4000 Hz)
  const calculatePTA = (earData: { [key: number]: number }) => {
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

  const leftPTA = calculatePTA(audiogram.left);
  const rightPTA = calculatePTA(audiogram.right);

  const leftWHO = leftPTA !== null ? getWHOSeverity(leftPTA) : null;
  const rightWHO = rightPTA !== null ? getWHOSeverity(rightPTA) : null;

  const thiResult = calculateTHIGrade(thiScore);

  const testDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div id="print-report-container" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto flex justify-center p-0 sm:p-4 print:p-0 print:bg-white print:relative">
      
      {/* Printable page layout */}
      <div className="w-full max-w-[850px] bg-white flex flex-col shadow-2xl relative min-h-screen my-0 sm:my-4 rounded-none sm:rounded-2xl overflow-hidden print:shadow-none print:my-0 print:rounded-none">
        
        {/* Floating Action Header Bar - HIDDEN during printing */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-800 text-sm">
              医学级 PDF / 打印报告预览 (A4 页面适配)
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-md"
            >
              <Printer className="w-4 h-4" /> 确认打印 / 保存PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition flex items-center gap-1"
            >
              <X className="w-4 h-4" /> 关闭预览
            </button>
          </div>
        </div>

        {/* Printable clinical report canvas */}
        <div className="p-8 md:p-12 flex-1 bg-white print:p-4 print:m-0 space-y-6 text-slate-800 font-sans text-xs">
          
          {/* Diagnostic Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center relative">
            <div className="absolute top-0 right-0 border border-slate-300 px-2 py-1 text-[10px] text-slate-400 rounded">
              自助筛查测试 ID: {Math.random().toString(36).substring(2, 8).toUpperCase()}
            </div>
            <h1 className="text-2xl font-black tracking-widest text-slate-950 uppercase">
              自助式听力与耳鸣临床筛查报告
            </h1>
            <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-wider">
              TINNITUS & AUDIOMETRY CLINICAL SCREENING REPORT
            </p>
            <div className="w-16 h-1 bg-slate-900 mx-auto mt-2"></div>
          </div>

          {/* Patient profile details info */}
          <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-400 font-semibold block">受试者姓名:</span>
              <span className="font-extrabold text-slate-800">{patient.name || "匿名测试者"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">测试年龄:</span>
              <span className="font-extrabold text-slate-800">{patient.age ? `${patient.age} 岁` : "未填写"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">生理性别:</span>
              <span className="font-extrabold text-slate-800">{patient.gender || "未填写"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">评估日期:</span>
              <span className="font-bold text-slate-800">{testDate}</span>
            </div>
          </div>

          {/* Section 1: Hearing thresholds & audiogram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-1 mb-2 uppercase tracking-wide flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                1. 左右耳气导纯音听力图 (Audiogram)
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal mb-3">
                本听力图横轴代表测试声音频率（Hz），纵轴代表听力电平（dB HL，向下代表听力损失越重）。
              </p>
              <div className="border border-slate-100 rounded-xl p-1 bg-white print:border-0 print:p-0">
                <AudiogramChart leftData={audiogram.left} rightData={audiogram.right} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-1 uppercase tracking-wide flex items-center gap-1">
                <Award className="w-4 h-4 text-emerald-600" />
                2. 世界卫生组织 (WHO) 听力损失评估
              </h3>

              {/* Left ear evaluate card */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-blue-700 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    左耳 (Left Ear)
                  </span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                    PTA: {leftPTA !== null ? `${leftPTA} dB HL` : "未测试"}
                  </span>
                </div>
                {leftWHO ? (
                  <>
                    <div className="font-extrabold text-slate-800 text-xs">
                      WHO分级：{leftWHO.grade}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal text-justify">
                      {leftWHO.description}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">未录入足够的测试频段</p>
                )}
              </div>

              {/* Right ear evaluate card */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-red-600 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    右耳 (Right Ear)
                  </span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                    PTA: {rightPTA !== null ? `${rightPTA} dB HL` : "未测试"}
                  </span>
                </div>
                {rightWHO ? (
                  <>
                    <div className="font-extrabold text-slate-800 text-xs">
                      WHO分级：{rightWHO.grade}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal text-justify">
                      {rightWHO.description}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">未录入足够的测试频段</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tinnitus evaluation */}
          <div className="pt-2">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-1 mb-3 uppercase tracking-wide flex items-center gap-1">
              🔔 3. 耳鸣拟合与 THI 残疾严重度评估
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-4 print:bg-white print:border-slate-300">
              {/* Pitch match details */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-700 text-[11px]">【耳鸣声学拟合参数】</h4>
                {tinnitus.earSide !== "none" ? (
                  <ul className="space-y-1 text-slate-600 font-mono">
                    <li>&bull; 耳鸣方向：{tinnitus.earSide === "left" ? "左耳" : tinnitus.earSide === "right" ? "右耳" : "双耳/头鸣"}</li>
                    <li>&bull; 匹配频率：{tinnitus.matchedFrequency} Hz (赫兹)</li>
                    <li>&bull; 匹配响度：{tinnitus.matchedLoudness}% (相对响度)</li>
                    <li>&bull; 波形波色：{tinnitus.soundType === "sine" ? "高频正弦纯音" : tinnitus.soundType === "narrow" ? "窄带高频噪声" : tinnitus.soundType === "white" ? "全频段白噪声" : "粉红环境噪声"}</li>
                  </ul>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">患者无耳鸣，或未进行耳鸣拟合测试。</p>
                )}
              </div>

              {/* THI questionnaire details */}
              <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 md:pl-6 pt-3 md:pt-0">
                <h4 className="font-extrabold text-slate-700 text-[11px]">【THI 残疾量表评估】</h4>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-white rounded p-1 text-center min-w-[50px] shrink-0 font-mono">
                    <span className="text-[8px] block opacity-80 uppercase leading-none">THI Score</span>
                    <span className="text-lg font-black leading-none">{thiScore}</span>
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-xs">严重度分级：{thiResult.severity}</div>
                    <p className="text-[10px] text-slate-500 leading-normal text-justify mt-0.5">{thiResult.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Gemini AI report and rehabilitation plans */}
          {aiReport && (
            <div className="pt-2 border-t border-slate-200">
              <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
                🧠 4. 临床听力学家与 AI 智能综合辅导康复报告
              </h3>
              <div className="bg-white border border-slate-100 rounded-xl p-4 text-slate-700 leading-relaxed text-justify space-y-1 print:border-0 print:p-0">
                <MarkdownRenderer content={aiReport} />
              </div>
            </div>
          )}

          {/* Section 4: Print instructions and disclaimer */}
          <div className="pt-6 border-t border-slate-300 flex flex-col md:flex-row justify-between items-start gap-4 text-[9px] text-slate-400 leading-normal">
            <div className="space-y-1 max-w-xl text-justify">
              <p className="font-bold text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" /> 医学免责声明与重要提醒：
              </p>
              <p>
                1. 本报告为用户使用家用耳机进行的在线自助筛选评估结果。受环境背景噪声、耳机频响衰减曲线、用户系统输出电平以及操作熟悉度影响，测试结果无法等同于医院标准的纯音听力电图计测量结果。
              </p>
              <p>
                2. **急诊医学警示：** 如果您是在 72 小时内出现突然听力下降（突聋）、伴有面瘫、剧烈眩晕呕吐、耳朵流脓、单侧耳鸣进行性加重或随心跳节律搏动等，这可能提示发生了严重的急性内耳、听神经或脑血管病变，请立刻挂【耳鼻喉科急诊】！
              </p>
            </div>
            
            {/* Clinical signature lines */}
            <div className="shrink-0 w-full md:w-56 space-y-4 pt-4 border-t md:border-t-0 md:pt-0">
              <div className="border-b border-slate-400 pb-1">
                <span className="text-slate-400">受测者签字: </span>
                <span className="font-bold text-slate-800 ml-2">_____________________</span>
              </div>
              <div className="border-b border-slate-400 pb-1">
                <span className="text-slate-400">核对医师签字: </span>
                <span className="font-bold text-slate-800 ml-2">_____________________</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
