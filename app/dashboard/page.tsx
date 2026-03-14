"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, BrainCircuit, CheckCircle2, AlertCircle, 
  TrendingUp, Heart, Calendar, MessageSquare, 
  Zap, Smile, ShieldAlert, BarChart3, ChevronRight,
  Clock, Target, Sparkles
} from "lucide-react";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ดึงข้อมูลจาก LocalStorage
    const savedTasks = localStorage.getItem("mindful-tasks");
    const savedLogs = localStorage.getItem("mindful-task-logs");
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    
    // จำลองการโหลดให้ดูพรีเมียม
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // วิเคราะห์สถิติ
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const burnoutHigh = logs.filter(l => l.burnoutRisk === 'High').length;
    const burnoutMed = logs.filter(l => l.burnoutRisk === 'Medium').length;
    const burnoutLow = logs.filter(l => l.burnoutRisk === 'Low').length;
    
    const sentimentCounts: Record<string, number> = {};
    logs.forEach(l => {
      if (l.sentiment) sentimentCounts[l.sentiment] = (sentimentCounts[l.sentiment] || 0) + 1;
    });
    
    const topSentiment = Object.entries(sentimentCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "ยังไม่มีข้อมูล";

    return { totalTasks, completedTasks, successRate, burnoutHigh, burnoutMed, burnoutLow, topSentiment };
  }, [tasks, logs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <BrainCircuit className="w-16 h-16 text-indigo-500 animate-pulse" />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-bounce" />
          </div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Analyzing your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="group p-3 bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-105 transition-all border border-slate-100 text-slate-600 hover:text-indigo-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Insights Dashboard</h1>
              <p className="text-slate-500 font-medium italic">สรุปภาพรวมพลังงานและการเติบโตของคุณ ✨</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 font-bold">
            <Calendar className="w-5 h-5" />
            {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Tasks", val: stats.totalTasks, icon: Target, color: "indigo" },
            { label: "Success Rate", val: `${stats.successRate}%`, icon: CheckCircle2, color: "emerald" },
            { label: "Burnout Risk", val: stats.burnoutHigh, icon: ShieldAlert, color: "rose" },
            { label: "Overall Mood", val: stats.topSentiment, icon: Smile, color: "amber" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className={`p-3 bg-${item.color}-50 w-fit rounded-xl mb-4 group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-6 h-6 text-${item.color}-600`} />
              </div>
              <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{item.label}</h3>
              <p className="text-3xl font-black text-slate-800">{item.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Burnout Progress Bars */}
          <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <BarChart3 className="w-48 h-48 text-indigo-900" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-slate-900 mb-10 flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                Mental Energy Analysis
              </h2>
              
              <div className="space-y-10">
                {[
                  { label: 'Low Risk (Healthy)', count: stats.burnoutLow, color: 'emerald', sub: 'คุณกำลังรักษาสมดุลได้ดีเยี่ยม' },
                  { label: 'Medium Risk (Need Break)', count: stats.burnoutMed, color: 'amber', sub: 'ควรหาเวลาพักผ่อนระหว่างวันเพิ่มขึ้น' },
                  { label: 'High Risk (Critical)', count: stats.burnoutHigh, color: 'rose', sub: 'สัญญาณเตือน! โปรดลดภาระงานลงด่วน' },
                ].map((item) => (
                  <div key={item.label} className="group">
                    <div className="flex justify-between mb-3 items-end">
                      <div>
                        <span className="font-black text-slate-700 text-sm uppercase tracking-widest">{item.label}</span>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{item.sub}</p>
                      </div>
                      <span className={`text-2xl font-black text-${item.color}-600`}>{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-5 overflow-hidden border border-slate-100 p-1">
                      <div 
                        className={`bg-${item.color}-500 h-full rounded-full transition-all duration-1000 shadow-sm`}
                        style={{ width: `${logs.length > 0 ? (item.count / logs.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-indigo-50 rounded-[24px] border border-indigo-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-indigo-900 text-sm uppercase tracking-widest mb-1">AI Recommendation</h4>
                  <p className="text-indigo-800 text-sm leading-relaxed font-medium italic">
                    "{stats.burnoutHigh > 0 
                      ? "ตรวจพบความเครียดสะสมในระดับสูง แนะนำให้เลื่อนงานที่ไม่เร่งด่วนออกไปก่อน และเน้นการนอนหลับให้ครบ 8 ชม. ในคืนนี้ค่ะ" 
                      : "โฟกัสของคุณยอดเยี่ยมมาก! ลองเพิ่มความท้าทายใหม่ๆ ในสัปดาห์หน้าดูนะคะ"}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Side Cards */}
          <div className="space-y-8">
            {/* Quick Mood Cloud */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Smile className="w-24 h-24" />
              </div>
              <h2 className="text-xl font-black mb-6 relative z-10">Recent Vibe</h2>
              <div className="flex flex-wrap gap-2 relative z-10">
                {logs.slice(0, 8).map((log, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold border border-white/5 transition-colors cursor-default">
                    #{log.sentiment}
                  </span>
                ))}
                {logs.length === 0 && <p className="text-slate-500 italic text-sm">ยังไม่มีบันทึกความรู้สึก</p>}
              </div>
              <div className="mt-10 pt-10 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Consistency</p>
                    <p className="text-xl font-bold">Stable Growth</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Card */}
            <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-amber-500 shadow-sm mb-6 group-hover:rotate-12 transition-transform duration-500">
                <Zap className="w-10 h-10 fill-current" />
              </div>
              <h3 className="text-xl font-black text-amber-900 mb-2">Power User</h3>
              <p className="text-amber-800/60 text-sm font-medium leading-relaxed">
                คุณบันทึกกิจกรรมไปแล้วทั้งหมด {tasks.length} รายการ รักษาจังหวะนี้ไว้ให้ดีนะคะ!
              </p>
              <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200">
                Back to work
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="mt-12 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-black text-slate-900">Recent Reflections</h2>
            <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">Full History</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Task Name</th>
                  <th className="px-8 py-5">Result</th>
                  <th className="px-8 py-5">Sentiment</th>
                  <th className="px-8 py-5">Energy Risk</th>
                  <th className="px-8 py-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.slice(0, 5).map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{log.taskName}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                        log.status === 'done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        log.status === 'partial' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 italic">"{log.sentiment}"</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          log.burnoutRisk === 'High' ? 'bg-rose-500 animate-pulse' : 
                          log.burnoutRisk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span className="text-xs font-bold text-slate-700">{log.burnoutRisk}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 tracking-tighter">
                      {log.date}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-300 italic font-medium">ยังไม่มีประวัติการบันทึก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
