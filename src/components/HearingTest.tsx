import React, { useState, useEffect, useRef } from "react";
import { Frequency, FREQUENCIES, EarChannel, AudiogramData } from "../types";
import { Play, Square, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Volume2 } from "lucide-react";

interface HearingTestProps {
  onSave: (data: AudiogramData) => void;
  onBack: () => void;
  initialData?: AudiogramData;
  calibrationMultiplier?: number;
}

export default function HearingTest({ onSave, onBack, initialData, calibrationMultiplier = 1.0 }: HearingTestProps) {
  // Setup hearing data structure
  const [testData, setTestData] = useState<AudiogramData>(
    initialData || {
      left: {},
      right: {},
    }
  );

  const [currentEar, setCurrentEar] = useState<EarChannel>("left");
  const [currentFreq, setCurrentFreq] = useState<Frequency>(250);
  const [sliderVal, setSliderVal] = useState<number>(30); // relative dB HL (0 - 80)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscNodeRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);

  // Stop sound on unmount or transition
  useEffect(() => {
    return () => {
      stopTone();
    };
  }, [currentEar, currentFreq]);

  // Handle browser audio context resumption and tone playback
  const playTone = () => {
    try {
      stopTone();

      // Create or resume AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // 1. Create Nodes
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // 2. Set Frequency
      osc.type = "sine";
      osc.frequency.setValueAtTime(currentFreq, ctx.currentTime);

      // 3. Set Panning (Left = -1, Right = 1)
      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(currentEar === "left" ? -1 : 1, ctx.currentTime);
      }

      // 4. Set Gain (Volume) safely
      // Convert relative dB HL (0 to 80) to gain multiplier.
      // We cap max relative gain at ~0.1 to avoid ear harm
      const maxSafeGain = 0.08;
      // standard formula for dB: gain = 10^((db - maxDb)/20)
      const relativeDb = sliderVal; 
      const gainValue = Math.pow(10, (relativeDb - 80) / 20) * maxSafeGain * calibrationMultiplier;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);

      // 5. Connect graph
      osc.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(ctx.destination);
        pannerNodeRef.current = panner;
      } else {
        gain.connect(ctx.destination);
      }

      // 6. Start
      osc.start();

      oscNodeRef.current = osc;
      gainNodeRef.current = gain;
      setIsPlaying(true);
    } catch (err) {
      console.error("Failed to play audio tone:", err);
    }
  };

  const stopTone = () => {
    try {
      if (oscNodeRef.current) {
        oscNodeRef.current.stop();
        oscNodeRef.current.disconnect();
        oscNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (pannerNodeRef.current) {
        pannerNodeRef.current.disconnect();
        pannerNodeRef.current = null;
      }
      setIsPlaying(false);
    } catch (e) {
      // already stopped
    }
  };

  // Update real-time volume change without restarting oscillator
  const handleVolumeChange = (newDb: number) => {
    setSliderVal(newDb);
    if (isPlaying && gainNodeRef.current && audioCtxRef.current) {
      const maxSafeGain = 0.08;
      const gainValue = Math.pow(10, (newDb - 80) / 20) * maxSafeGain * calibrationMultiplier;
      gainNodeRef.current.gain.setValueAtTime(gainValue, audioCtxRef.current.currentTime);
    }
  };

  const toggleTone = () => {
    if (isPlaying) {
      stopTone();
    } else {
      playTone();
    }
  };

  // Save current threshold and move to next
  const saveCurrentThreshold = () => {
    stopTone();
    const updated = {
      ...testData,
      [currentEar]: {
        ...testData[currentEar],
        [currentFreq]: sliderVal,
      },
    };
    setTestData(updated);

    // Find next step in test workflow
    // Order: Left (250 -> 8000) then Right (250 -> 8000)
    const currentFreqIndex = FREQUENCIES.indexOf(currentFreq);
    if (currentFreqIndex < FREQUENCIES.length - 1) {
      // Go to next frequency in same ear
      setCurrentFreq(FREQUENCIES[currentFreqIndex + 1]);
      // Pull previous test value if exists, else reset to median 30dB
      const nextFreq = FREQUENCIES[currentFreqIndex + 1];
      setSliderVal(updated[currentEar][nextFreq] !== undefined ? updated[currentEar][nextFreq] : 30);
    } else if (currentEar === "left") {
      // Done with left ear, transition to right ear
      alert("左耳各频段测试完成！现在开始进行【右耳】测试。请微调您的耳麦和姿态。");
      setCurrentEar("right");
      setCurrentFreq(250);
      setSliderVal(updated.right[250] !== undefined ? updated.right[250] : 30);
    } else {
      // Both ears complete!
      onSave(updated);
    }
  };

  const skipCurrentFrequency = () => {
    stopTone();
    // Default to a medium normal (e.g. 15dB) if skipped, or just let it remain unrecorded
    const currentFreqIndex = FREQUENCIES.indexOf(currentFreq);
    if (currentFreqIndex < FREQUENCIES.length - 1) {
      setCurrentFreq(FREQUENCIES[currentFreqIndex + 1]);
      const nextFreq = FREQUENCIES[currentFreqIndex + 1];
      setSliderVal(testData[currentEar][nextFreq] !== undefined ? testData[currentEar][nextFreq] : 30);
    } else if (currentEar === "left") {
      setCurrentEar("right");
      setCurrentFreq(250);
      setSliderVal(testData.right[250] !== undefined ? testData.right[250] : 30);
    } else {
      onSave(testData);
    }
  };

  // Switch ear manually
  const handleEarSwitch = (ear: EarChannel) => {
    stopTone();
    setCurrentEar(ear);
    setSliderVal(testData[ear][currentFreq] !== undefined ? testData[ear][currentFreq] : 30);
  };

  // Switch freq manually
  const handleFreqSwitch = (freq: Frequency) => {
    stopTone();
    setCurrentFreq(freq);
    setSliderVal(testData[currentEar][freq] !== undefined ? testData[currentEar][freq] : 30);
  };

  // Calculate progression percentage
  const totalSteps = FREQUENCIES.length * 2;
  const completedSteps = 
    Object.keys(testData.left).length + Object.keys(testData.right).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div id="hearing-test-interface" className="w-full max-w-4xl mx-auto bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-lg animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 relative">
        <button
          onClick={onBack}
          className="absolute left-6 top-6 text-white/80 hover:text-white transition flex items-center gap-1 text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回主页
        </button>
        <div className="text-center pt-4">
          <h2 className="text-2xl font-bold tracking-tight">纯音听阈测试 (气导)</h2>
          <p className="text-blue-100 text-sm mt-1 max-w-xl mx-auto">
            检测您的耳朵在 250Hz - 8000Hz 关键频段内的最小声音感知门槛。
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 bg-blue-900/40 rounded-full h-2.5 w-full relative overflow-hidden border border-white/10">
          <div
            className="bg-emerald-400 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-blue-200">
          <span>整体测试进度: {progressPercent}%</span>
          <span>已测试: {completedSteps} / {totalSteps} 项频段</span>
        </div>
      </div>

      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Side: Instructions & Freq select */}
        <div className="md:col-span-5 space-y-6">
          {/* Quick Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs leading-relaxed shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1 text-amber-900">重要安全与环境要求：</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>必须戴上**立体声耳机**（分清L左侧和R右侧）。</li>
                <li>请身处**绝对安静的房间**（避开风扇、交通、人声噪声）。</li>
                <li>建议将电脑系统音量调节在 **50% 左右** 的适中位置。</li>
                <li>**严禁开到最大音量**，以免损伤听力。</li>
              </ul>
            </div>
          </div>

          {/* Test Workflow Selection */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                1. 选择测试耳
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEarSwitch("left")}
                  className={`py-2.5 px-4 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 border ${
                    currentEar === "left"
                      ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  左耳 (Left)
                </button>
                <button
                  onClick={() => handleEarSwitch("right")}
                  className={`py-2.5 px-4 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 border ${
                    currentEar === "right"
                      ? "bg-red-50 border-red-300 text-red-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  右耳 (Right)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                2. 选择测试频率
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {FREQUENCIES.map((freq) => {
                  const isTested = testData[currentEar][freq] !== undefined;
                  const isSelected = currentFreq === freq;

                  return (
                    <button
                      key={freq}
                      onClick={() => handleFreqSwitch(freq)}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold border transition flex flex-col items-center relative ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : isTested
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}</span>
                      {isTested && !isSelected && (
                        <span className="text-[10px] text-emerald-500 font-bold mt-0.5">
                          {testData[currentEar][freq]} dB
                        </span>
                      )}
                      {isTested && (
                        <CheckCircle2 className={`w-3.5 h-3.5 absolute -top-1 -right-1 ${
                          isSelected ? "text-emerald-400 fill-indigo-600" : "text-emerald-600 fill-emerald-50"
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Tone Generator */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
          {/* Main Display */}
          <div className="text-center space-y-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              currentEar === "left" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
            }`}>
              正在进行：{currentEar === "left" ? "左耳 L" : "右耳 R"} &bull; {currentFreq} Hz 测试
            </span>

            <div className="py-6 flex flex-col items-center">
              {/* Pulsing button block */}
              <button
                onClick={toggleTone}
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 focus:outline-none ${
                  isPlaying
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-inner"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-8 h-8 fill-white stroke-none" />
                    <span className="text-xs font-bold mt-1 tracking-wide">暂停测试音</span>
                  </>
                ) : (
                  <>
                    <Play className="w-9 h-9 fill-slate-700 stroke-none translate-x-0.5" />
                    <span className="text-xs font-bold mt-1 tracking-wide">播放测试音</span>
                  </>
                )}
              </button>
              <span className="text-slate-400 text-xs mt-3">
                {isPlaying ? "声音循环播放中，请专注聆听" : "点击按钮开始试听该音频"}
              </span>
            </div>
          </div>

          {/* Slider and Decibel Display */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4 my-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-500" />
                设置感知音量级 (Hearing Level):
              </span>
              <span className="text-2xl font-black text-indigo-700 font-mono">
                {sliderVal} <span className="text-sm font-medium text-slate-500">dB HL</span>
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={sliderVal}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0 dB (微弱)</span>
              <span>20 dB (WHO正常线)</span>
              <span>40 dB (中等偏静)</span>
              <span>60 dB (较响)</span>
              <span>80 dB (极响)</span>
            </div>

            {/* Instruction snippet */}
            <p className="text-xs text-slate-500 leading-normal border-t border-slate-200 pt-3">
              👉 **测试方法：** 播放测试音，把滑块拉到 0。然后**慢慢调大音量**，直到你耳朵 **刚好看见/听到“嘀、嘀”或纯音的一瞬间**（听阈临界点），这时即可停止。请勿使用过大的音量！
            </p>
          </div>

          {/* Core action button toolbar */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={skipCurrentFrequency}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition"
            >
              跳过此频段
            </button>
            <button
              onClick={saveCurrentThreshold}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
            >
              <span>保存当前听力阈值</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Table Overview Footer */}
      <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-wrap justify-between items-center gap-4 text-xs">
        <div className="flex gap-4">
          <div>
            <span className="text-slate-400">左耳已测: </span>
            <span className="font-bold text-slate-700">
              {Object.keys(testData.left).length} / {FREQUENCIES.length}
            </span>
          </div>
          <div>
            <span className="text-slate-400">右耳已测: </span>
            <span className="font-bold text-slate-700">
              {Object.keys(testData.right).length} / {FREQUENCIES.length}
            </span>
          </div>
        </div>

        {completedSteps > 0 && (
          <button
            onClick={() => {
              if (confirm("确定要直接使用当前已保存的听力数据生成听力图并跳转吗？部分未测频段在报告中将不显示。")) {
                onSave(testData);
              }
            }}
            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
          >
            直接跳过后续，保存并查看当前结果 &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
