import React, { useState, useEffect, useRef } from "react";
import { TinnitusData, TinnitusSoundType } from "../types";
import { thiQuestions, calculateTHIGrade, THIResult } from "../data/thiQuestions";
import { Play, Square, ArrowLeft, ArrowRight, Activity, HelpCircle, Heart, FileText, Check, AlertCircle } from "lucide-react";

interface TinnitusTestProps {
  onSave: (tinnitus: TinnitusData, thiAnswers: { [key: number]: number }, thiScore: number) => void;
  onBack: () => void;
  initialTinnitus?: TinnitusData;
  initialAnswers?: { [key: number]: number };
}

export default function TinnitusTest({ onSave, onBack, initialTinnitus, initialAnswers }: TinnitusTestProps) {
  // 1. Tinnitus audio state
  const [earSide, setEarSide] = useState<"left" | "right" | "both" | "none">(initialTinnitus?.earSide || "none");
  const [matchedFreq, setMatchedFreq] = useState<number>(initialTinnitus?.matchedFrequency || 4000);
  const [matchedLoud, setMatchedLoud] = useState<number>(initialTinnitus?.matchedLoudness || 20);
  const [soundType, setSoundType] = useState<TinnitusSoundType>(initialTinnitus?.soundType || "sine");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  // 2. THI Questionnaire state (questionId -> score [0 for No, 2 for Sometimes, 4 for Yes])
  const [thiAnswers, setThiAnswers] = useState<{ [key: number]: number }>(initialAnswers || {});
  const [activeTab, setActiveTab] = useState<"matching" | "thi">("matching");

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscNodeRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const noiseSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    return () => {
      stopTinnitusSynth();
    };
  }, [soundType, earSide, matchedFreq]);

  // Generate White or Pink Noise buffer
  const createNoiseBuffer = (ctx: AudioContext, type: "white" | "pink") => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else {
      // Pink noise algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = pink * 0.11; // scale back
      }
    }
    return buffer;
  };

  const playTinnitusSynth = () => {
    try {
      stopTinnitusSynth();

      if (earSide === "none") return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      // Safe volume mapping: 0-100 to gain scale
      const volumeMultiplier = 0.05; 
      const gainVal = (matchedLoud / 100) * volumeMultiplier;
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);

      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        let panVal = 0;
        if (earSide === "left") panVal = -1;
        if (earSide === "right") panVal = 1;
        panner.pan.setValueAtTime(panVal, ctx.currentTime);
      }

      if (soundType === "sine") {
        // Pure high frequency sine wave
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(matchedFreq, ctx.currentTime);
        
        osc.connect(gain);
        oscNodeRef.current = osc;
        osc.start();
      } else if (soundType === "white" || soundType === "pink") {
        // Continuous Noise
        const source = ctx.createBufferSource();
        source.buffer = createNoiseBuffer(ctx, soundType);
        source.loop = true;

        source.connect(gain);
        noiseSourceNodeRef.current = source;
        source.start();
      } else if (soundType === "narrow") {
        // Narrowband Noise: Filter White noise around frequency
        const source = ctx.createBufferSource();
        source.buffer = createNoiseBuffer(ctx, "white");
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(matchedFreq, ctx.currentTime);
        // Q factor controls bandwidth. High Q = narrower band
        filter.Q.setValueAtTime(4.0, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);

        noiseSourceNodeRef.current = source;
        filterNodeRef.current = filter;
        source.start();
      }

      // Connect final stage
      if (panner) {
        gain.connect(panner);
        panner.connect(ctx.destination);
        pannerNodeRef.current = panner;
      } else {
        gain.connect(ctx.destination);
      }

      gainNodeRef.current = gain;
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("Failed to play tinnitus matching sound:", err);
    }
  };

  const stopTinnitusSynth = () => {
    try {
      if (oscNodeRef.current) {
        oscNodeRef.current.stop();
        oscNodeRef.current.disconnect();
        oscNodeRef.current = null;
      }
      if (noiseSourceNodeRef.current) {
        noiseSourceNodeRef.current.stop();
        noiseSourceNodeRef.current.disconnect();
        noiseSourceNodeRef.current = null;
      }
      if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (pannerNodeRef.current) {
        pannerNodeRef.current.disconnect();
        pannerNodeRef.current = null;
      }
      setIsAudioPlaying(false);
    } catch (e) {
      // already stopped
    }
  };

  const handleLoudnessChange = (val: number) => {
    setMatchedLoud(val);
    if (isAudioPlaying && gainNodeRef.current && audioCtxRef.current) {
      const volumeMultiplier = 0.05;
      const gainVal = (val / 100) * volumeMultiplier;
      gainNodeRef.current.gain.setValueAtTime(gainVal, audioCtxRef.current.currentTime);
    }
  };

  const handleFrequencyChange = (val: number) => {
    setMatchedFreq(val);
    if (isAudioPlaying && audioCtxRef.current) {
      if (soundType === "sine" && oscNodeRef.current) {
        oscNodeRef.current.frequency.setValueAtTime(val, audioCtxRef.current.currentTime);
      } else if (soundType === "narrow" && filterNodeRef.current) {
        filterNodeRef.current.frequency.setValueAtTime(val, audioCtxRef.current.currentTime);
      }
    }
  };

  const toggleTinnitusAudio = () => {
    if (earSide === "none") {
      alert("请先选择您耳鸣的位置（左耳、右耳或双耳）才能播放模拟声音！");
      return;
    }
    if (isAudioPlaying) {
      stopTinnitusSynth();
    } else {
      playTinnitusSynth();
    }
  };

  // 3. Question answer handler
  const handleAnswerSelect = (qId: number, score: number) => {
    setThiAnswers({
      ...thiAnswers,
      [qId]: score,
    });
  };

  // Calculate current score
  const totalScore = (Object.values(thiAnswers) as number[]).reduce((sum, score) => sum + score, 0);
  const totalQuestionsAnswered = Object.keys(thiAnswers).length;
  const thResult: THIResult = calculateTHIGrade(totalScore);

  // Split THI questions into functional, emotional, catastrophic
  const functionalQuestions = thiQuestions.filter(q => q.category === "functional");
  const emotionalQuestions = thiQuestions.filter(q => q.category === "emotional");
  const catastrophicQuestions = thiQuestions.filter(q => q.category === "catastrophic");

  const [thiCategoryFilter, setThiCategoryFilter] = useState<"all" | "functional" | "emotional" | "catastrophic">("all");

  const getFilteredQuestions = () => {
    if (thiCategoryFilter === "all") return thiQuestions;
    return thiQuestions.filter(q => q.category === thiCategoryFilter);
  };

  const handleCompleteTest = () => {
    stopTinnitusSynth();
    if (earSide === "none") {
      alert("请选择耳鸣的位置。如果确实无耳鸣，可选择『双耳均无耳鸣』并在后方忽略耳鸣报告。");
      return;
    }
    if (totalQuestionsAnswered < 10) {
      if (!confirm(`您只回答了 ${totalQuestionsAnswered} / 25 道耳鸣残疾评估题（回答满10道题以上评估结果会更准确）。是否确定保存并进入报告界面？`)) {
        setActiveTab("thi");
        return;
      }
    }
    
    onSave(
      {
        earSide,
        matchedFrequency: matchedFreq,
        matchedLoudness: matchedLoud,
        soundType,
      },
      thiAnswers,
      totalScore
    );
  };

  return (
    <div id="tinnitus-test-suite" className="w-full max-w-4xl mx-auto bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-lg animate-fade-in">
      {/* Tab Switch Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white p-6 relative">
        <button
          onClick={onBack}
          className="absolute left-6 top-6 text-white/80 hover:text-white transition flex items-center gap-1 text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>

        <div className="text-center pt-4">
          <h2 className="text-2xl font-bold tracking-tight">耳鸣综合匹配与残疾程度评估</h2>
          <p className="text-teal-100 text-sm mt-1 max-w-xl mx-auto">
            通过声学模拟拟合耳鸣的物理特性，并利用国际临床通用的 THI 量表评定其对生活质量的综合负荷。
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-teal-900/40 p-1.5 rounded-xl border border-white/10 mt-6 max-w-md mx-auto">
          <button
            onClick={() => {
              stopTinnitusSynth();
              setActiveTab("matching");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
              activeTab === "matching"
                ? "bg-white text-teal-800 shadow-md"
                : "text-white hover:bg-white/10"
            }`}
          >
            <Activity className="w-4 h-4" /> 1. 耳鸣声学拟合匹配
          </button>
          <button
            onClick={() => {
              stopTinnitusSynth();
              setActiveTab("thi");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
              activeTab === "thi"
                ? "bg-white text-teal-800 shadow-md"
                : "text-white hover:bg-white/10"
            }`}
          >
            <FileText className="w-4 h-4" /> 2. THI 残疾严重度问卷
          </button>
        </div>
      </div>

      {activeTab === "matching" ? (
        /* Matching Panel */
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Instructions Column */}
          <div className="md:col-span-5 space-y-5">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-2 text-cyan-900 text-xs shadow-sm">
              <h4 className="font-bold text-cyan-950 flex items-center gap-1.5 text-sm">
                <HelpCircle className="w-4 h-4 text-cyan-600" />
                什么是耳鸣拟合测试？
              </h4>
              <p className="leading-relaxed">
                耳鸣往往是由于耳蜗损伤导致大脑听觉皮层产生了“虚无”的声音。
                通过调整本系统的发生器，让发出的声音在**音高（频率）**、**响度（大小）**和**波形材质**上，尽量接近你大脑里听到的耳鸣声。
              </p>
              <p className="leading-relaxed font-semibold">
                这样做可以帮助专家了解你的耳鸣频段，也有利于提供个性化的“声音掩蔽疗法（声疗）”康复音频。
              </p>
            </div>

            {/* Ear Side selection */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                一、请选择您的耳鸣方位
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { stopTinnitusSynth(); setEarSide("left"); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    earSide === "left"
                      ? "bg-teal-50 border-teal-300 text-teal-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  左耳 L
                </button>
                <button
                  onClick={() => { stopTinnitusSynth(); setEarSide("right"); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    earSide === "right"
                      ? "bg-teal-50 border-teal-300 text-teal-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  右耳 R
                </button>
                <button
                  onClick={() => { stopTinnitusSynth(); setEarSide("both"); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    earSide === "both"
                      ? "bg-teal-50 border-teal-300 text-teal-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  双耳/头鸣 Both
                </button>
                <button
                  onClick={() => { stopTinnitusSynth(); setEarSide("none"); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    earSide === "none"
                      ? "bg-slate-100 border-slate-300 text-slate-400"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  我没有耳鸣
                </button>
              </div>
            </div>

            {/* Sound Wave selection */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                二、选择最接近的耳鸣声音类型
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: "sine", label: "高频纯音 (嘀— 哨声/蝉鸣/电流音)", desc: "最常见的极高音调、单频率声音" },
                  { id: "narrow", label: "窄带高音噪声 (咝咝声/高频气流)", desc: "带有特定频段指向的空气滤过声" },
                  { id: "white", label: "白噪音 (电视机沙沙声/瀑布声)", desc: "全频段覆盖的平坦静态摩擦声" },
                  { id: "pink", label: "粉红噪音 (微风呼呼声/树叶沙沙声)", desc: "中低频相对温和舒缓的自然风流声" },
                ].map((wave) => (
                  <button
                    key={wave.id}
                    onClick={() => {
                      stopTinnitusSynth();
                      setSoundType(wave.id as TinnitusSoundType);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col ${
                      soundType === wave.id
                        ? "bg-teal-50 border-teal-300 text-teal-800"
                        : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-bold">{wave.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{wave.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Column */}
          <div className="md:col-span-7 flex flex-col justify-between bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-6">
              {/* Play Button */}
              <div className="text-center py-4">
                <button
                  onClick={toggleTinnitusAudio}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 ${
                    isAudioPlaying
                      ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse"
                      : "bg-teal-500 hover:bg-teal-600 text-white border-teal-200 shadow-[0_4px_10px_rgba(20,184,166,0.3)]"
                  }`}
                >
                  {isAudioPlaying ? (
                    <>
                      <Square className="w-7 h-7 fill-white stroke-none" />
                      <span className="text-xs font-bold mt-1 tracking-wide">关闭模拟音</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-8 h-8 fill-white stroke-none translate-x-0.5" />
                      <span className="text-xs font-bold mt-1 tracking-wide">播放模拟音</span>
                    </>
                  )}
                </button>
                <p className="text-slate-400 text-xs mt-3">
                  戴上耳机后，开启模拟音，边听边调节下方频率与响度，使之完美重合。
                </p>
              </div>

              {/* Freq matches */}
              {(soundType === "sine" || soundType === "narrow") && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">频率 (音调音高 Pitch):</span>
                    <span className="text-lg font-extrabold text-teal-700 font-mono">
                      {matchedFreq} <span className="text-xs text-slate-400">Hz</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="12000"
                    step="50"
                    value={matchedFreq}
                    onChange={(e) => handleFrequencyChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>100 Hz (极低嗡鸣)</span>
                    <span>1k Hz</span>
                    <span>4k Hz (普通耳鸣)</span>
                    <span>8k Hz</span>
                    <span>12k Hz (高频蝉鸣)</span>
                  </div>
                </div>
              )}

              {/* Loudness matches */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">模拟声音响度 (Loudness):</span>
                  <span className="text-lg font-extrabold text-teal-700 font-mono">
                    {matchedLoud} <span className="text-xs text-slate-400">%</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={matchedLoud}
                  onChange={(e) => handleLoudnessChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1% (刚好能听到)</span>
                  <span>20% (轻音)</span>
                  <span>50% (中度音)</span>
                  <span>80% (强音)</span>
                  <span>100% (极强音 - 慎用)</span>
                </div>
              </div>
            </div>

            {/* Bottom transition button */}
            <div className="mt-8 border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setActiveTab("thi")}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center gap-1.5"
              >
                <span>下一步：进行 THI 严重度量表评估</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* THI Questionnaire Panel */
        <div className="p-6 md:p-8">
          {/* Header Score Overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-slate-800 text-base">耳鸣残疾量表评估 (Tinnitus Handicap Inventory)</h3>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                THI 量表是医学界评估耳鸣对日常情绪、社交及躯体功能干扰的公认标准。包含25道是非判断题，分值越高代表心理及生活受扰严重度越大。
              </p>
            </div>

            {/* Score Ring Display */}
            <div className="flex items-center gap-4 shrink-0 bg-teal-50 px-5 py-4 rounded-xl border border-teal-100">
              <div className="text-center">
                <span className="text-[10px] text-teal-600 uppercase font-black block tracking-wider">THI 当前总分</span>
                <span className="text-3xl font-black text-teal-700 font-mono leading-none">{totalScore}</span>
                <span className="text-xs text-slate-400 block mt-1">/ 100 分</span>
              </div>
              <div className="h-10 w-[1px] bg-teal-200"></div>
              <div>
                <span className="text-[10px] text-slate-500 block">严重度等级：</span>
                <span className="text-sm font-extrabold text-teal-900 block">{thResult.severity}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 max-w-[130px] block truncate">{thResult.description}</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 mb-4 text-xs font-semibold">
            <button
              onClick={() => setThiCategoryFilter("all")}
              className={`py-1.5 px-3.5 rounded-full transition ${
                thiCategoryFilter === "all"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-200/80 text-slate-600 hover:bg-slate-200"
              }`}
            >
              全部问题 (25)
            </button>
            <button
              onClick={() => setThiCategoryFilter("functional")}
              className={`py-1.5 px-3.5 rounded-full transition flex items-center gap-1 ${
                thiCategoryFilter === "functional"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-200/80 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 功能影响 ({functionalQuestions.length})
            </button>
            <button
              onClick={() => setThiCategoryFilter("emotional")}
              className={`py-1.5 px-3.5 rounded-full transition flex items-center gap-1 ${
                thiCategoryFilter === "emotional"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-200/80 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Heart className="w-3.5 h-3.5" /> 情绪反应 ({emotionalQuestions.length})
            </button>
            <button
              onClick={() => setThiCategoryFilter("catastrophic")}
              className={`py-1.5 px-3.5 rounded-full transition flex items-center gap-1 ${
                thiCategoryFilter === "catastrophic"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-200/80 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> 灾难倾向 ({catastrophicQuestions.length})
            </button>
            <span className="ml-auto text-[11px] text-slate-400 self-center">
              已答：{totalQuestionsAnswered} / 25 题
            </span>
          </div>

          {/* Question List */}
          <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-2">
            {getFilteredQuestions().map((q, idx) => {
              const currentScore = thiAnswers[q.id];

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all duration-150 ${
                    currentScore !== undefined
                      ? "bg-white border-teal-100 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between gap-4">
                    <span className="text-xs font-black text-slate-300 font-mono shrink-0 w-6 self-start mt-0.5">
                      Q{q.id}
                    </span>
                    <p className="text-slate-800 text-xs font-semibold leading-relaxed flex-1">
                      {q.text}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 self-start ${
                      q.category === "functional"
                        ? "bg-blue-50 text-blue-600"
                        : q.category === "emotional"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {q.categoryName}
                    </span>
                  </div>

                  {/* Answers option grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3.5 pl-6">
                    {[
                      { label: "是 (4分)", score: 4, color: "hover:bg-rose-50 hover:border-rose-300 text-rose-700 border-rose-100 active-bg-rose-100" },
                      { label: "有时 (2分)", score: 2, color: "hover:bg-amber-50 hover:border-amber-300 text-amber-700 border-amber-100 active-bg-amber-100" },
                      { label: "否 (0分)", score: 0, color: "hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 border-emerald-100 active-bg-emerald-100" },
                    ].map((opt) => {
                      const isSelected = currentScore === opt.score;
                      let btnBg = "bg-slate-50 text-slate-700 border-slate-200";
                      if (isSelected) {
                        if (opt.score === 4) btnBg = "bg-rose-500 border-rose-500 text-white shadow-sm";
                        if (opt.score === 2) btnBg = "bg-amber-500 border-amber-500 text-white shadow-sm";
                        if (opt.score === 0) btnBg = "bg-emerald-500 border-emerald-500 text-white shadow-sm";
                      }

                      return (
                        <button
                          key={opt.score}
                          onClick={() => handleAnswerSelect(q.id, opt.score)}
                          className={`py-2 px-1 rounded-lg text-xs font-bold border transition duration-150 flex items-center justify-center gap-1 ${btnBg} ${
                            !isSelected ? opt.color : ""
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table actions bottom */}
          <div className="mt-8 border-t border-slate-200 pt-5 flex justify-between items-center">
            <button
              onClick={() => setActiveTab("matching")}
              className="px-5 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-sm transition"
            >
              上一步：耳鸣声拟合
            </button>
            <button
              onClick={handleCompleteTest}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <span>保存耳鸣测试并生成报告 &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
