"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Task, AIAnalysisResponse } from "@/types";
import { 
  Sparkles, CheckCircle2, Circle, ListTodo, Plus, 
  BrainCircuit, Loader2, X, Send, Check, AlertCircle,
  TrendingUp, Heart, Sun, Star, Calendar, 
  Hash, Menu, Search, Trash2, ChevronRight,
  Bell, Repeat, StickyNote, Coffee, ArrowRightCircle
} from "lucide-react";

type ListType = "MyDay" | "Important" | "Planned" | "Tasks";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeList, setActiveList] = useState<ListType>("MyDay");
  const [taskInput, setTaskInput] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [smartPrompt, setSmartPrompt] = useState("");
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Insights State
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [todayInsight, setTodayInsight] = useState<any>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<any>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState<'today' | 'weekly' | null>(null);

  // Detail Sidebar State
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Modal State for AI Reflection
  const [reflectTask, setReflectTask] = useState<Task | null>(null);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<'done' | 'partial' | 'skipped' | null>(null);
  const [isReflectLoading, setIsReflectLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIAnalysisResponse | null>(null);

  const [isRescaleLoading, setIsRescaleLoading] = useState(false);
  const [rescaleResult, setRescaleResult] = useState<{ rescaledTasks: any[], encouragement: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Detect Burnout or Low Energy
  const hasLowEnergy = useMemo(() => {
    const todayLogs = taskLogs.filter(l => l.date === today);
    
    // Only trigger if we have some data for today (reflection/status updates)
    // To avoid false positives when user hasn't started yet
    if (todayLogs.length === 0) return false;

    // 1. Check from todayInsight if exists
    if (todayInsight?.analysis?.includes("ล้า") || todayInsight?.analysis?.includes("พัก") || todayInsight?.analysis?.includes("เหนื่อย")) return true;
    
    // 2. Check from recent task logs of today
    if (todayLogs.some(l => l.burnoutRisk === 'High' || l.burnoutRisk === 'Medium')) return true;
    
    return false;
  }, [todayInsight, taskLogs, today]);

  const handleRescaleTasks = async () => {
    const pendingTasks = filteredTasks;
    if (pendingTasks.length === 0) return;
    
    setIsRescaleLoading(true);
    try {
      const lastReflection = taskLogs.filter(l => l.date === today).pop()?.reflection || "วันนี้รู้สึกเหนื่อยล้า";
      const res = await fetch("/api/rescale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tasks: pendingTasks,
          userVibe: lastReflection
        }),
      });
      const data = await res.json();
      
      if (data.rescaledTasks) {
        // Find original names for the modal
        const resultWithOriginals = data.rescaledTasks.map((rt: any) => ({
          ...rt,
          originalName: pendingTasks.find(t => t.id === rt.id)?.name || "งานเดิม"
        }));

        setTasks(prev => prev.map(t => {
          const match = data.rescaledTasks.find((rt: any) => rt.id === t.id);
          if (match) {
            return { ...t, name: match.newName, note: (t.note || "") + `\n[AI Optimized for Energy: ${match.reason}]` };
          }
          return t;
        }));
        
        setRescaleResult({ rescaledTasks: resultWithOriginals, encouragement: data.encouragement });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRescaleLoading(false);
    }
  };

  // Load tasks, logs and insights on mount
  useEffect(() => {
    const saved = localStorage.getItem("mindful-tasks");
    if (saved) {
      setTasks(JSON.parse(saved));
    }
    const savedLogs = localStorage.getItem("mindful-task-logs");
    if (savedLogs) {
      setTaskLogs(JSON.parse(savedLogs));
    }
    const savedTodayInsight = localStorage.getItem("mindful-today-insight");
    if (savedTodayInsight) {
      const parsed = JSON.parse(savedTodayInsight);
      // Only load if it's from today to avoid stale data
      if (parsed.date === today) {
        setTodayInsight(parsed);
      } else {
        localStorage.removeItem("mindful-today-insight");
      }
    }
    const savedWeeklyInsight = localStorage.getItem("mindful-weekly-insight");
    if (savedWeeklyInsight) {
      setWeeklyInsight(JSON.parse(savedWeeklyInsight));
    }
  }, []);

  // Save tasks on change
  useEffect(() => {
    localStorage.setItem("mindful-tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Save logs and manage insights
  useEffect(() => {
    localStorage.setItem("mindful-task-logs", JSON.stringify(taskLogs));
    
    // Check if we need to re-fetch insights
    const lastLogCount = parseInt(localStorage.getItem("last-log-count") || "0");
    const lastTaskCount = parseInt(localStorage.getItem("last-task-count") || "0");
    
    const currentLogCount = taskLogs.length;
    const currentTaskCount = tasks.length;

    if (currentLogCount !== lastLogCount || currentTaskCount !== lastTaskCount) {
      if (currentLogCount > 0) {
        fetchTodayInsight();
        fetchWeeklyInsight();
      }
      localStorage.setItem("last-log-count", currentLogCount.toString());
      localStorage.setItem("last-task-count", currentTaskCount.toString());
    }
  }, [taskLogs, tasks]);

  // Initial fetch for insights only if not already there
  useEffect(() => {
    if (taskLogs.length > 0 && !todayInsight) {
      fetchTodayInsight();
    }
    if (taskLogs.length > 0 && !weeklyInsight) {
      fetchWeeklyInsight();
    }
  }, [taskLogs]);

  const filteredTasks = useMemo(() => {
    let baseTasks = tasks;
    
    if (searchQuery.trim()) {
      return baseTasks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.isCompleted
      );
    }

    switch (activeList) {
      case "MyDay":
        return baseTasks.filter(t => t.myDayDate === today && !t.isCompleted);
      case "Important":
        return baseTasks.filter(t => t.isImportant && !t.isCompleted);
      case "Planned":
        return baseTasks.filter(t => t.dueDate && !t.isCompleted).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      case "Tasks":
      default:
        return baseTasks.filter(t => !t.isCompleted);
    }
  }, [tasks, activeList, today, searchQuery]);

  const completedTasks = useMemo(() => {
    let baseTasks = tasks;

    if (searchQuery.trim()) {
      return baseTasks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) && t.isCompleted
      );
    }

    switch (activeList) {
      case "MyDay":
        return baseTasks.filter(t => t.myDayDate === today && t.isCompleted);
      case "Important":
        return baseTasks.filter(t => t.isImportant && t.isCompleted);
      case "Planned":
        return baseTasks.filter(t => t.dueDate && t.isCompleted);
      default:
        return baseTasks.filter(t => t.isCompleted);
    }
  }, [tasks, activeList, today, searchQuery]);

  const addTask = () => {
    if (!taskInput.trim()) return;

    // Auto-Labeling Logic
    const input = taskInput.toLowerCase();
    let autoCategory = "Personal";
    if (input.includes("งาน") || input.includes("ประชุม") || input.includes("ส่ง") || input.includes("report") || input.includes("office")) autoCategory = "Work";
    else if (input.includes("วิ่ง") || input.includes("น้ำ") || input.includes("ยา") || input.includes("ออกกำลัง") || input.includes("gym") || input.includes("เดิน")) autoCategory = "Health";
    else if (input.includes("เรียน") || input.includes("อ่าน") || input.includes("สอบ") || input.includes("book") || input.includes("สรุป")) autoCategory = "Study";
    else if (input.includes("นัด") || input.includes("เพื่อน") || input.includes("กิน") || input.includes("เที่ยว") || input.includes("แฟน")) autoCategory = "Social";

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      name: taskInput,
      category: autoCategory,
      isCompleted: false,
      isImportant: activeList === "Important",
      dueDate: taskDate || (activeList === "Planned" ? today : undefined),
      time: taskTime || undefined,
      myDayDate: activeList === "MyDay" ? today : (taskDate === today ? today : undefined),
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    setTaskInput("");
    setTaskDate("");
    setTaskTime("");
  };

  const toggleTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks(prev => {
      const newTasks = prev.map(t => 
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
      );
      const task = newTasks.find(t => t.id === id);
      if (task && task.isCompleted) {
        setReflectTask(task);
      }
      return newTasks;
    });
  };

  const toggleImportant = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, isImportant: !t.isImportant } : t
    ));
  };

  const deleteTask = (id: string) => {
    if (confirm("ลบงานนี้ใช่หรือไม่?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (detailTask?.id === id) setDetailTask(null);
    }
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setDetailTask(updatedTask);
  };

  const handleSmartAdd = async () => {
    if (!smartPrompt.trim()) return;
    setIsSmartLoading(true);
    try {
      const res = await fetch("/api/smart-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: smartPrompt }),
      });
      const newTasks = await res.json();
      
      if (Array.isArray(newTasks)) {
        const tasksWithIds = newTasks.map((h: { dueDate?: string; name: string; time?: string; category?: string; icon?: string }) => ({
          ...h,
          id: Math.random().toString(36).substring(7),
          isCompleted: false,
          isImportant: false,
          category: h.category || "General",
          myDayDate: h.dueDate === today ? today : undefined,
          createdAt: new Date().toISOString(),
        }));
        setTasks(prev => [...prev, ...tasksWithIds]);
        
        // Refresh insights because data changed
        setTimeout(() => {
          fetchTodayInsight();
          fetchWeeklyInsight();
        }, 500);
      }
      setSmartPrompt("");
    } catch (error) {
      console.error("Smart Add Error:", error);
    } finally {
      setIsSmartLoading(false);
    }
  };

  const fetchTodayInsight = async () => {
    if (isInsightLoading) return;
    setIsInsightLoading(true);
    try {
      const todayLogs = taskLogs.filter(log => log.date === today);
      const res = await fetch("/api/insights/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedTasks: tasks.filter(t => t.myDayDate === today && t.isCompleted).map(t => ({ name: t.name, status: t.status })),
          pendingTasks: tasks.filter(t => t.myDayDate === today && !t.isCompleted),
          reflections: todayLogs.map(l => l.reflection),
          currentDate: today,
        }),
      });
      const data = await res.json();
      const insightWithDate = { ...data, date: today };
      setTodayInsight(insightWithDate);
      localStorage.setItem("mindful-today-insight", JSON.stringify(insightWithDate));
    } catch (err) {
      console.error(err);
    } finally {
      setIsInsightLoading(false);
    }
  };

  const fetchWeeklyInsight = async () => {
    if (isInsightLoading) return;
    setIsInsightLoading(true);
    try {
      const res = await fetch("/api/insights/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: taskLogs,
          currentDate: today,
        }),
      });
      const data = await res.json();
      setWeeklyInsight(data);
      localStorage.setItem("mindful-weekly-insight", JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setIsInsightLoading(false);
    }
  };

  const handleBreakdown = async (task: Task) => {
    if (isBreakdownLoading === task.id) return;
    setIsBreakdownLoading(task.id);
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskName: task.name }),
      });
      const data = await res.json();
      
      if (res.ok && Array.isArray(data)) {
        const updated = { ...task, subtasks: data };
        updateTask(updated);
      } else {
        console.error("Breakdown error details:", data);
        alert(`ไม่สามารถย่อยงานได้: ${data.error || "รูปแบบข้อมูลไม่ถูกต้อง"} \n\n(โปรดตรวจสอบว่าเปิดโปรแกรม Ollama แล้ว)`);
      }
    } catch (error) {
      console.error("Breakdown Error:", error);
    } finally {
      setIsBreakdownLoading(null);
    }
  };

  const handleReflect = async () => {
    if (!reflectTask || !status || !reflection.trim()) return;
    setIsReflectLoading(true);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitName: reflectTask.name,
          status,
          reflection,
        }),
      });
      const feedback = await res.json();
      setAiFeedback(feedback);

      // Save log
      const newLog = {
        id: Math.random().toString(36).substring(7),
        taskId: reflectTask.id,
        taskName: reflectTask.name,
        date: today,
        status,
        reflection,
        burnoutRisk: feedback.burnout_risk_level,
        sentiment: feedback.sentiment_tag,
      };
      setTaskLogs(prev => [...prev, newLog]);

      // Update the task's final status in state
      setTasks(prev => prev.map(t => 
        t.id === reflectTask.id ? { ...t, status, reflection, aiFeedback: feedback } : t
      ));
    } catch (error) {
      console.error("Reflect Error:", error);
    } finally {
      setIsReflectLoading(false);
    }
  };

  const closeReflectModal = () => {
    setReflectTask(null);
    setAiFeedback(null);
    setReflection("");
    setStatus(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:ml-[-256px]'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 mb-10 px-2 group cursor-default">
            <div className="relative">
              {/* Main Icon Box */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:rotate-12 transition-transform duration-500">
                <Check className="text-white w-6 h-6 stroke-[3.5px]" />
              </div>
              {/* Floating Sparkle */}
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-lg shadow-md flex items-center justify-center group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-500">
                <Sparkles className="text-indigo-600 w-3 h-3" />
              </div>
            </div>
            <div className="flex flex-col ml-1">
              <h1 className="text-2xl font-black leading-none tracking-tighter text-slate-900">
                My<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Sets</span>
              </h1>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1 ml-0.5">Mindful AI Coach</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <button 
              onClick={() => setActiveList("MyDay")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeList === "MyDay" ? 'bg-amber-50 text-amber-700 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <Sun className={`w-5 h-5 ${activeList === "MyDay" ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="font-semibold flex-1 text-left text-sm">My Day</span>
              <span className="text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded-full">{tasks.filter(t => t.myDayDate === today && !t.isCompleted).length}</span>
            </button>
            <button 
              onClick={() => setActiveList("Important")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeList === "Important" ? 'bg-rose-50 text-rose-700 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <Star className={`w-5 h-5 ${activeList === "Important" ? 'text-rose-500' : 'text-slate-400'}`} />
              <span className="font-semibold flex-1 text-left text-sm">Important</span>
              <span className="text-[10px] font-bold bg-rose-100 px-2 py-0.5 rounded-full">{tasks.filter(t => t.isImportant && !t.isCompleted).length}</span>
            </button>
            <button 
              onClick={() => setActiveList("Planned")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeList === "Planned" ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <Calendar className={`w-5 h-5 ${activeList === "Planned" ? 'text-cyan-500' : 'text-slate-400'}`} />
              <span className="font-semibold flex-1 text-left text-sm">Planned</span>
              <span className="text-[10px] font-bold bg-cyan-100 px-2 py-0.5 rounded-full">{tasks.filter(t => t.dueDate && !t.isCompleted).length}</span>
            </button>
            <button 
              onClick={() => setActiveList("Tasks")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeList === "Tasks" ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <ListTodo className={`w-5 h-5 ${activeList === "Tasks" ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span className="font-semibold flex-1 text-left text-sm">Tasks</span>
              <span className="text-[10px] font-bold bg-indigo-100 px-2 py-0.5 rounded-full">{tasks.filter(t => !t.isCompleted).length}</span>
            </button>
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                className="w-full pl-10 pr-4 py-1.5 bg-slate-100 rounded-lg border-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="w-10"></div>
        </header>

        {/* Task Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-3xl mx-auto">
            {/* Premium Smart Add Area */}
            <div className="mb-12">
              <div className="relative group">
                {/* Magic Glow Effect behind the box */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[32px] blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-focus-within:duration-200" />
                
                <div className="relative bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-2xl shadow-indigo-100/50 overflow-hidden">
                  {/* Subtle Mesh Background */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-50 -ml-10 -mb-10 pointer-events-none" />

                  <div className="relative">
                    <textarea
                      className="w-full p-8 pb-4 bg-transparent text-slate-800 placeholder:text-slate-400 border-none focus:ring-0 resize-none text-xl font-semibold leading-relaxed outline-none"
                      placeholder="วันนี้มีเป้าหมายอะไร? บอก MySets ได้เลย..."
                      rows={2}
                      value={smartPrompt}
                      onChange={(e) => setSmartPrompt(e.target.value)}
                    />
                    
                    {/* Magic Suggestions */}
                    <div className="flex flex-wrap gap-2 px-8 mb-4">
                      {[
                        "🏃 วิ่งพรุ่งนี้ 8 โมง",
                        "📚 อ่านหนังสือตอนค่ำ",
                        "☕ นัดล้างแอร์วันเสาร์",
                        "🛒 ซื้อของเข้าบ้านเย็นนี้"
                      ].map((hint, i) => (
                        <button
                          key={i}
                          onClick={() => setSmartPrompt(hint.split(' ').slice(1).join(' '))}
                          className="text-[10px] font-bold bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between px-8 pb-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Qwen 2.5 Active</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleSmartAdd}
                        disabled={isSmartLoading || !smartPrompt.trim()}
                        className="group relative flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl disabled:opacity-50 overflow-hidden active:scale-95"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-2">
                          {isSmartLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-amber-300" />
                          )}
                          Set it!
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className={`text-3xl font-bold mb-1 ${
                searchQuery ? "text-slate-900" :
                activeList === "MyDay" ? "text-amber-600" :
                activeList === "Important" ? "text-rose-600" :
                activeList === "Planned" ? "text-cyan-600" : "text-indigo-700"
              }`}>
                {searchQuery ? `Searching for "${searchQuery}"` : (
                  <>
                    {activeList === "MyDay" && "My Day"}
                    {activeList === "Important" && "Important"}
                    {activeList === "Planned" && "Planned"}
                    {activeList === "Tasks" && "Tasks"}
                  </>
                )}
              </h2>
              <p className="text-slate-500 font-medium">
                {searchQuery ? `Found ${filteredTasks.length + completedTasks.length} results` : new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Adaptive Load Management Banner */}
            {hasLowEnergy && activeList === "MyDay" && filteredTasks.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-[24px] flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500 shrink-0">
                  <Coffee className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-lg font-bold text-amber-900 mb-1">วันนี้ดูเหนื่อยจัง... ให้ MySets ช่วยไหม?</h3>
                   <p className="text-sm text-amber-700 opacity-80">เราตรวจพบสภาวะล้าของคุณ ให้ AI ช่วยปรับระดับงานให้เล็กลงเพื่อให้คุณทำต่อได้โดยไม่เครียดดีไหม?</p>
                </div>
                <button 
                  onClick={handleRescaleTasks}
                  disabled={isRescaleLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isRescaleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  ปรับลดขนาดงาน
                </button>
              </div>
            )}

            {/* AI Insight Dashboard Area */}
            {!searchQuery && (activeList === "MyDay" || activeList === "Tasks") && taskLogs.length > 0 && (
              <div className="mb-10 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Today Insight Card - Full Content */}
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                      <Sparkles className="w-24 h-24 text-white" />
                    </div>
                    {/* ... (rest of today card content) */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">สรุปวันของคุณ</h3>
                      {isInsightLoading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto opacity-50" />}
                    </div>
                    
                    {todayInsight ? (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-2xl font-bold leading-tight mb-4">{todayInsight.summary}</p>
                        <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/5 backdrop-blur-sm">
                           <p className="text-sm leading-relaxed opacity-90">{todayInsight.analysis}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 text-indigo-200">Next Day Tips</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {todayInsight.next_day_tips?.map((tip: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs bg-white/10 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/20 transition-colors">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="font-medium">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 flex flex-col items-center justify-center opacity-40">
                         <Loader2 className="w-8 h-8 animate-spin mb-2" />
                         <p className="text-sm font-medium">ประมวลผลสรุปวันของคุณ...</p>
                      </div>
                    )}
                  </div>

                  {/* Weekly Insight Card - Emerald/Teal Content */}
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[32px] p-8 text-white border-none shadow-xl shadow-emerald-100 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-32 h-32 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">วิเคราะห์สัปดาห์ของคุณ</h3>
                      </div>
                      
                      {weeklyInsight ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center text-emerald-600 shadow-lg">
                              <span className="text-2xl font-black">{weeklyInsight.weekly_score}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-1">{weeklyInsight.mood_trend}</p>
                              <p className="text-lg font-bold text-white leading-tight italic">สัปดาห์ที่น่าประทับใจ!</p>
                            </div>
                          </div>
                          
                          <div className="bg-black/10 rounded-2xl p-6 border border-white/5 backdrop-blur-sm relative">
                             <h4 className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-3">Strategic Advice</h4>
                             <p className="text-base text-white font-medium italic leading-relaxed">
                               &quot;{weeklyInsight.strategic_advice}&quot;
                             </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center opacity-40">
                           <Loader2 className="w-8 h-8 animate-spin mb-2 text-white" />
                           <p className="text-sm font-medium">กำลังวิเคราะห์แนวโน้มสัปดาห์นี้...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-1 mb-10">
              {filteredTasks.length === 0 && (
                <div className="text-center py-20 opacity-20 flex flex-col items-center">
                   <div className="w-32 h-32 bg-slate-200 rounded-full mb-6 flex items-center justify-center">
                      <ListTodo className="w-16 h-16" />
                   </div>
                   <p className="text-xl font-medium">ไม่มีรายการงาน</p>
                </div>
              )}
              {filteredTasks.map(task => (
                <div 
                  key={task.id}
                  className={`group flex flex-col bg-white rounded-lg border transition-all cursor-pointer relative overflow-hidden ${detailTask?.id === task.id ? 'border-indigo-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setDetailTask(task)}
                >
                  {/* Category Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    task.category === 'Work' ? 'bg-blue-500' :
                    task.category === 'Health' ? 'bg-emerald-500' :
                    task.category === 'Study' ? 'bg-violet-500' :
                    task.category === 'Personal' ? 'bg-rose-500' :
                    task.category === 'Social' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <div className="flex items-center gap-3 p-3">
                    <button 
                      onClick={(e) => toggleTask(e, task.id)}
                      className="text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.name}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          task.category === 'Work' ? 'bg-blue-100 text-blue-600' :
                          task.category === 'Health' ? 'bg-emerald-100 text-emerald-600' :
                          task.category === 'Study' ? 'bg-violet-100 text-violet-600' :
                          task.category === 'Personal' ? 'bg-rose-100 text-rose-600' :
                          task.category === 'Social' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {task.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Hash className="w-2.5 h-2.5" /> Tasks
                        </span>
                        {task.dueDate && (
                          <span className="text-[10px] text-indigo-500 font-medium flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {task.dueDate === today ? "Today" : task.dueDate}
                          </span>
                        )}
                        {task.time && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Coffee className="w-2.5 h-2.5" /> {task.time}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!task.subtasks || task.subtasks.length === 0 ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBreakdown(task);
                          }}
                          title="Breakdown into steps"
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 rounded text-indigo-500 transition-all"
                        >
                          {isBreakdownLoading === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        </button>
                      ) : (
                        <div className="p-1.5 text-indigo-400">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                      )}
                      <button 
                        onClick={(e) => toggleImportant(e, task.id)}
                        className={`p-1.5 hover:bg-slate-50 rounded transition-all ${task.isImportant ? 'text-indigo-600 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                      >
                        <Star className={`w-4 h-4 ${task.isImportant ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Subtasks */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="px-10 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
                      {task.subtasks.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <div className="mb-10">
                <button className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2 px-2 hover:bg-slate-100 py-1 rounded transition-colors">
                  <ChevronRight className="w-4 h-4" />
                  เสร็จสิ้นแล้ว {completedTasks.length}
                </button>
                <div className="space-y-1">
                  {completedTasks.map(task => (
                    <div 
                      key={task.id}
                      className="flex flex-col bg-white/40 rounded-lg border border-slate-100 hover:border-slate-200 transition-all cursor-pointer opacity-90"
                      onClick={() => setDetailTask(task)}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <button 
                          onClick={(e) => toggleTask(e, task.id)}
                          className={`${
                            task.status === 'done' ? 'text-emerald-500' :
                            task.status === 'partial' ? 'text-amber-500' :
                            'text-slate-400'
                          }`}
                        >
                          {task.status === 'done' && <CheckCircle2 className="w-5 h-5" />}
                          {task.status === 'partial' && <TrendingUp className="w-5 h-5" />}
                          {task.status === 'skipped' && <ArrowRightCircle className="w-5 h-5" />}
                          {!task.status && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            task.status === 'skipped' ? 'text-slate-400 italic' : 
                            'text-slate-400 line-through'
                          }`}>
                            {task.name} 
                            <span className="ml-2 text-[10px] font-bold uppercase opacity-60">
                              {task.status === 'skipped' ? '(Skipped)' : task.status === 'partial' ? '(Partial)' : ''}
                            </span>
                          </p>
                        </div>
                        <button 
                          onClick={(e) => toggleImportant(e, task.id)}
                          className={`p-1.5 text-slate-200`}
                        >
                          <Star className={`w-4 h-4 ${task.isImportant ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* AI Feedback Display */}
                      {task.aiFeedback && (
                        <div className="px-11 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Heart className={`w-3 h-3 ${task.aiFeedback.burnout_risk_level === 'High' ? 'text-red-500' : 'text-indigo-500'}`} />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Insight</span>
                              <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                task.aiFeedback.burnout_risk_level === 'High' ? 'bg-red-100 text-red-600' :
                                task.aiFeedback.burnout_risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-indigo-100 text-indigo-600'
                              }`}>Risk: {task.aiFeedback.burnout_risk_level}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 italic mb-2">"{task.reflection}"</p>
                            <div className="flex items-start gap-2 bg-white/50 p-2 rounded-lg border border-slate-100/50">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] font-medium text-slate-700 leading-relaxed">{task.aiFeedback.daily_actionable_advice}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Task */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <div className="flex items-center px-4 py-2">
                <Plus className="w-5 h-5 text-indigo-600 mr-3" />
                <input 
                  type="text" 
                  placeholder="Add a task" 
                  className="flex-1 py-2 bg-transparent border-none outline-none text-sm"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
              </div>
              <div className="flex items-center gap-2 px-4 pb-2 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    className="text-[10px] bg-transparent border-none outline-none text-slate-600 w-24"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                  <Coffee className="w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="time" 
                    className="text-[10px] bg-transparent border-none outline-none text-slate-600 w-20"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                  />
                </div>
                <button 
                  onClick={addTask}
                  disabled={!taskInput.trim()}
                  className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Sidebar (Right) */}
        {detailTask && (
          <div className="absolute inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <button 
                    onClick={(e) => toggleTask(e, detailTask.id)}
                    className={detailTask.isCompleted ? "text-indigo-600" : "text-slate-300"}
                   >
                     {detailTask.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                   </button>
                   <input 
                    className={`text-xl font-bold bg-transparent border-none focus:ring-0 w-full ${detailTask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                    value={detailTask.name}
                    onChange={(e) => updateTask({ ...detailTask, name: e.target.value })}
                   />
                </div>
                <button 
                  onClick={() => setDetailTask(null)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-1">
                   <button 
                    onClick={() => updateTask({ ...detailTask, myDayDate: detailTask.myDayDate ? undefined : today })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${detailTask.myDayDate === today ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                   >
                      <Sun className="w-5 h-5" />
                      <span className="text-sm font-medium">{detailTask.myDayDate === today ? "Added to My Day" : "Add to My Day"}</span>
                   </button>
                   <button className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                      <Bell className="w-5 h-5" />
                      <span className="text-sm font-medium">Remind me</span>
                   </button>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="date"
                          className="w-full pl-10 pr-3 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500"
                          value={detailTask.dueDate || ""}
                          onChange={(e) => updateTask({ ...detailTask, dueDate: e.target.value })}
                        />
                      </div>
                      <div className="relative">
                        <Coffee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="time"
                          className="w-full pl-10 pr-3 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500"
                          value={detailTask.time || ""}
                          onChange={(e) => updateTask({ ...detailTask, time: e.target.value })}
                        />
                      </div>
                   </div>
                   <button className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                      <Repeat className="w-5 h-5" />
                      <span className="text-sm font-medium">Repeat</span>
                   </button>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <BrainCircuit className="w-3 h-3" /> AI Features
                   </h4>
                   <button 
                    onClick={() => handleBreakdown(detailTask)}
                    disabled={isBreakdownLoading === detailTask.id}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                   >
                     {isBreakdownLoading === detailTask.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                     Breakdown into Steps
                   </button>

                   {detailTask.subtasks && detailTask.subtasks.length > 0 && (
                     <div className="mt-4 space-y-2">
                        {detailTask.subtasks.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                             {step}
                          </div>
                        ))}
                     </div>
                   )}
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <StickyNote className="w-3 h-3" /> Note
                   </h4>
                   <textarea 
                    className="w-full p-4 bg-slate-50 rounded-xl text-sm border-none focus:ring-1 focus:ring-indigo-500 resize-none min-h-[120px]"
                    placeholder="Add a note"
                    value={detailTask.note || ""}
                    onChange={(e) => updateTask({ ...detailTask, note: e.target.value })}
                   />
                </div>
             </div>

             <div className="p-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                <span className="text-xs italic">Created on {new Date(detailTask.createdAt).toLocaleDateString()}</span>
                <button 
                  onClick={() => deleteTask(detailTask.id)}
                  className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Modal - AI Reflection */}
      {reflectTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeReflectModal}
          />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 truncate max-w-[300px]">{reflectTask.name}</h3>
              </div>
              <button 
                onClick={closeReflectModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8">
              {!aiFeedback ? (
                <>
                  <p className="text-slate-500 mb-6 font-medium">ทำสำเร็จแล้ว! มาสะท้อนความรู้สึกกันหน่อย ✨</p>
                  
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <button
                      onClick={() => setStatus('done')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        status === 'done' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-slate-100 hover:border-green-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-8 h-8" />
                      <span className="text-xs font-bold">สำเร็จ</span>
                    </button>
                    <button
                      onClick={() => setStatus('partial')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        status === 'partial' 
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                        : 'border-slate-100 hover:border-yellow-200 text-slate-400'
                      }`}
                    >
                      <TrendingUp className="w-8 h-8" />
                      <span className="text-xs font-bold">บางส่วน</span>
                    </button>
                    <button
                      onClick={() => setStatus('skipped')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        status === 'skipped' 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-slate-100 hover:border-red-200 text-slate-400'
                      }`}
                    >
                      <X className="w-8 h-8" />
                      <span className="text-xs font-bold">ข้าม</span>
                    </button>
                  </div>

                  <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ความรู้สึก ณ ตอนนี้</label>
                    <textarea
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-slate-700"
                      placeholder="วันนี้เป็นยังไงบ้าง..."
                      rows={4}
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleReflect}
                    disabled={isReflectLoading || !status}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50"
                  >
                    {isReflectLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    <span>วิเคราะห์ด้วย AI</span>
                  </button>
                </>
              ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <div className={`p-6 rounded-3xl mb-6 flex flex-col items-center text-center ${
                    aiFeedback.burnout_risk_level === 'High' ? 'bg-red-50' :
                    aiFeedback.burnout_risk_level === 'Medium' ? 'bg-yellow-50' : 'bg-indigo-50'
                  }`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      aiFeedback.burnout_risk_level === 'High' ? 'bg-red-100 text-red-600' :
                      aiFeedback.burnout_risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {aiFeedback.burnout_risk_level === 'High' ? <AlertCircle /> : <Heart />}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">
                      {aiFeedback.sentiment_tag}
                    </h4>
                    <p className={`text-sm font-bold uppercase tracking-widest ${
                      aiFeedback.burnout_risk_level === 'High' ? 'text-red-500' :
                      aiFeedback.burnout_risk_level === 'Medium' ? 'text-yellow-600' : 'text-indigo-500'
                    }`}>
                      Burnout Risk: {aiFeedback.burnout_risk_level}
                    </p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl text-white mb-8 relative">
                    <p className="text-lg font-medium italic leading-relaxed">
                      &quot;{aiFeedback.daily_actionable_advice}&quot;
                    </p>
                  </div>

                  <button
                    onClick={closeReflectModal}
                    className="w-full py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    เข้าใจแล้ว
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Modal - Rescale Results */}
        {rescaleResult && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setRescaleResult(null)}
          />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Coffee className="w-32 h-32" />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-6 h-6 text-amber-200" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Adaptive Mode</span>
                  </div>
                  <h3 className="text-3xl font-black leading-tight">ปรับระดับงานให้เล็กลงแล้ว ✨</h3>
                  <p className="mt-2 text-amber-100 font-medium italic">&quot;{rescaleResult.encouragement}&quot;</p>
               </div>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50/50">
               <div className="space-y-4">
                  {rescaleResult.rescaledTasks.map((rt: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex flex-col gap-4">
                          {/* Original Task */}
                          <div className="flex items-start gap-3 opacity-50">
                             <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mt-1 shrink-0">
                                <X className="w-3 h-3 text-slate-400" />
                             </div>
                             <p className="text-sm font-medium text-slate-500 line-through truncate">{rt.originalName}</p>
                          </div>

                          {/* Arrow Down */}
                          <div className="flex justify-center -my-2 relative z-10">
                             <div className="bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                                <ChevronRight className="w-4 h-4 text-amber-500 rotate-90" />
                             </div>
                          </div>

                          {/* New Task */}
                          <div className="flex items-start gap-3">
                             <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-amber-600" />
                             </div>
                             <div>
                                <p className="text-lg font-bold text-slate-900 leading-tight">{rt.newName}</p>
                                <p className="text-xs text-amber-600 font-bold mt-1 uppercase tracking-wider">{rt.reason}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex flex-col gap-3">
               <button 
                onClick={() => setRescaleResult(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl active:scale-95"
               >
                 เข้าใจแล้ว! เริ่มทำสิ่งที่ไหวกัน
               </button>
               <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Powered by MySets Mindful AI
               </p>
            </div>
          </div>
        </div>
        )}

        {/* Modal - Insights */}
      {showInsightModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setShowInsightModal(null); setTodayInsight(null); setWeeklyInsight(null); }}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-slate-900">
                  {showInsightModal === 'today' ? "สรุปกำลังใจรายวันเพื่อคุณ" : "วิเคราะห์กลยุทธ์สัปดาห์ของคุณ"}
                </h3>
              </div>
              <button 
                onClick={() => { setShowInsightModal(null); setTodayInsight(null); setWeeklyInsight(null); }}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {isInsightLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                  <p className="text-slate-500 font-medium">AI กำลังวิเคราะห์ข้อมูลของคุณ...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {showInsightModal === 'today' && todayInsight && (
                    <>
                      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="text-sm font-bold text-indigo-600 uppercase mb-2">Summary</h4>
                        <p className="text-lg font-medium text-slate-800">{todayInsight.summary}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Deep Analysis</h4>
                        <p className="text-slate-600 leading-relaxed">{todayInsight.analysis}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {todayInsight.next_day_tips?.map((tip: string, i: number) => (
                          <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {showInsightModal === 'weekly' && weeklyInsight && (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-600 flex flex-col items-center justify-center bg-indigo-50">
                          <span className="text-3xl font-black text-indigo-600">{weeklyInsight.weekly_score}</span>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase">Score</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-400 uppercase mb-1">Mood Trend</h4>
                          <p className="text-xl font-bold text-slate-800">{weeklyInsight.mood_trend}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-8 rounded-[32px] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <BrainCircuit className="w-24 h-24" />
                        </div>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Strategic Advice</h4>
                        <p className="text-xl font-medium leading-relaxed italic">
                          &quot;{weeklyInsight.strategic_advice}&quot;
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => { setShowInsightModal(null); setTodayInsight(null); setWeeklyInsight(null); }}
                className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
