import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Zap, 
  FlaskConical, 
  FileText, 
  Sparkles,
  TrendingUp,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

interface TopMover {
  name: string;
  change: string;
  analysis: string;
}

interface ReportData {
  overview: string;
  top_movers: TopMover[];
  strategic_advice: string;
  lab_note: string;
}

export default function WeeklyReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/tracker/weekly-report');
        if (res.ok) {
          const data = await res.json();
          try {
            const parsed = JSON.parse(data.report);
            setReport(parsed);
          } catch (e) {
            console.error("Failed to parse report JSON:", e);
            setReport({
              overview: data.report,
              top_movers: [],
              strategic_advice: "",
              lab_note: "Professor Oak's notes are a bit scrambled today."
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-6 mb-12">
        <Link to="/vault" className="w-10 h-10 flex items-center justify-center bg-white/40 backdrop-blur-xl border border-white/40 rounded-full hover:bg-white/60 transition-all">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
          <Link to="/vault" className="hover:text-[#ADA3E6] transition-colors">StarVault</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-600">Weekly Research Report</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        {/* Title Section */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-[#ADA3E6]/10 border border-[#ADA3E6]/20 rounded-full"
          >
            <FlaskConical size={16} className="text-[#ADA3E6]" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#ADA3E6]">Pallet Town Research Lab</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black tracking-tight text-[#1A1A1A]"
          >
            Weekly Market Intelligence
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-gray-400"
          >
            Authored by Professor Samuel Oak • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </motion.p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-16 h-16 border-4 border-[#ADA3E6]/20 border-t-[#ADA3E6] rounded-full animate-spin" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Analyzing Pokedex Data & Market Trends...</p>
          </div>
        )}

        {/* Modular Report Content */}
        {report && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
          >
            {/* 1. Market Overview */}
            <Card className="p-10 bg-white/40 backdrop-blur-3xl border border-white/50 rounded-[3rem] shadow-xl" hover={false}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText size={20} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-black text-[#1A1A1A] uppercase tracking-wider">Executive Overview</h3>
              </div>
              <p className="text-lg font-bold text-gray-600 leading-relaxed italic">
                "{report.overview}"
              </p>
            </Card>

            {/* 2. Top Movers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {report.top_movers.map((mover, i) => (
                <div key={i}>
                  <Card className="p-8 bg-white/40 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] shadow-lg relative overflow-hidden h-full" hover={true}>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-black text-[#1A1A1A] max-w-[70%] leading-tight">{mover.name}</h4>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
                          mover.change.includes('+') || parseFloat(mover.change) > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}>
                          {mover.change}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-500 leading-relaxed">{mover.analysis}</p>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
                      <TrendingUp size={100} className={mover.change.includes('+') ? "text-emerald-500" : "text-rose-500"} />
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* 3. Strategic Advice & Lab Note */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 p-10 bg-[#1A1A1A] text-white rounded-[3rem] shadow-2xl relative overflow-hidden" hover={false}>
                 <div className="flex items-center gap-4 mb-6">
                    <Zap size={22} className="text-yellow-400 fill-current" />
                    <h3 className="text-xl font-black uppercase tracking-wider">Research Recommendations</h3>
                 </div>
                 <p className="text-base font-bold leading-relaxed text-gray-300">
                   {report.strategic_advice}
                 </p>
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles size={80} />
                 </div>
              </Card>

              <Card className="p-8 bg-[#ADA3E6] text-white rounded-[3rem] shadow-xl flex flex-col justify-between" hover={false}>
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white/20 bg-white/10 shadow-lg flex-shrink-0">
                    <img 
                      src="/prof_oak_pixel.jpg" 
                      alt="Professor Oak" 
                      className="w-full h-full object-cover p-1"
                    />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Pallet Town Lab Note</h4>
                  <p className="text-sm font-black leading-relaxed italic">
                    "{report.lab_note}"
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Verified Samuel Oak</span>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Action Bar */}
        <div className="flex justify-between items-center text-gray-400 px-8 pt-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Pokedex Index Live</span>
          </div>
          <div className="flex gap-6">
             <button className="text-[10px] font-black uppercase tracking-widest hover:text-[#ADA3E6] transition-colors flex items-center gap-2">
                <Download size={14} />
                Export PDF
             </button>
             <button className="text-[10px] font-black uppercase tracking-widest hover:text-[#ADA3E6] transition-colors flex items-center gap-2">
                <Sparkles size={14} />
                Share Analysis
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
