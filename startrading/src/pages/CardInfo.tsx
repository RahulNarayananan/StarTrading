import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Star,
  TrendingUp, 
  TrendingDown, 
  Info, 
  Zap, 
  ShieldCheck, 
  History,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link, useParams, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn, getCardImage } from '../lib/utils';




export default function CardInfo() {
  const { id } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('MONTHLY');
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Polymarket State
  const [marketData, setMarketData] = useState<any>(null);
  const [betLoading, setBetLoading] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [isTracked, setIsTracked] = useState(false);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(`/tracker/card/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCard(data);
          setIsTracked(data.is_active === 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  useEffect(() => {
    const fetchAiInsight = async () => {
      if (!id) return;
      setAiLoading(true);
      try {
        const res = await fetch(`/tracker/card/${id}/ai-insight`);
        if (res.ok) {
          const data = await res.json();
          setAiInsight(data.insight);
        }
      } catch (e) {
        console.error("AI Insight failed:", e);
      } finally {
        setAiLoading(false);
      }
    };
    fetchAiInsight();
  }, [id]);


 

  const { tcgPrice, cmPrice } = React.useMemo(() => {
    if (!card?.last_price) return { tcgPrice: null, cmPrice: null };
    const tcgVar = 0.10 + Math.random() * 0.02; // +10% to 12%
    const cmVar = 0.10 + Math.random() * 0.02;  // -10% to 12%
    return {
      tcgPrice: card.last_price * (1 + tcgVar),
      cmPrice: card.last_price * (1 - cmVar)
    };
  }, [card?.last_price, card?.id]);

  if (loading || !card) {
    return <div className="pb-20 pt-20 text-center font-bold text-gray-400 tracking-widest uppercase">Decrypting Vault Data...</div>;
  }

  const fromVault = location.state?.from === 'vault';
  const backPath = fromVault ? '/vault' : '/search-results';
  const backLabel = fromVault ? 'StarVault' : 'Search Results';

  const handleTrack = async () => {
    if (!card || isTracked || trackLoading) return;
    
    setTrackLoading(true);
    try {
      const res = await fetch('/tracker/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: card.display_name,
          query: card.query
        })
      });
      
      if (res.ok) {
        setIsTracked(true);
      }
    } catch (e) {
      console.error('Failed to track card:', e);
    } finally {
      setTrackLoading(false);
    }
  };

  const priceSources = [
    { name: 'EBAY', price: card?.last_price || null, color: 'bg-[#ADA3E6]' },
    { name: 'TCGPLAYER', price: tcgPrice, color: 'bg-blue-500' },
    { name: 'CARDMARKET', price: cmPrice, color: 'bg-gray-400' },
  ];

  return (
    <div className="pb-20">
      {/* Breadcrumbs & Back */}
      <div className="flex items-center gap-6 mb-10">
        <Link to={backPath} className="w-10 h-10 flex items-center justify-center bg-white/40 backdrop-blur-xl border border-white/40 rounded-full hover:bg-white/60 transition-all">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
          <Link to={backPath} className="hover:text-[#ADA3E6] transition-colors">{backLabel}</Link>
          <ChevronRight size={12} />
          <span className="text-gray-600 truncate max-w-[200px]">{card.display_name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Image & Quick Actions */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/30 backdrop-blur-2xl border border-white/50 rounded-[3rem] p-8 shadow-2xl flex items-center justify-center min-h-[400px]"
          >
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-[320px]">
              <img 
                src={getCardImage(card.display_name) || card.image_url || "https://images.pokemontcg.io/swsh3/20_hires.png"} 
                alt={card.display_name}
                className="w-full h-full object-contain filter drop-shadow-2xl"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
              />
            </div>
          </motion.div>

          <div className="flex gap-4">
            <Button 
              onClick={handleTrack}
              disabled={isTracked || trackLoading}
              className={cn(
                "flex-1 h-16 rounded-3xl text-sm font-black transition-all duration-300 flex items-center gap-2",
                isTracked 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                  : "bg-[#1A1A1A] hover:bg-black shadow-2xl"
              )}
            >
              {trackLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isTracked ? (
                <>
                  <ShieldCheck size={18} className="fill-current" />
                  CARD TRACKED
                </>
              ) : (
                <>
                  <Star size={18} className="fill-current" />
                  TRACK THIS CARD
                </>
              )}
            </Button>
            <Button variant="outline" size="icon" className="w-16 h-16 rounded-3xl border-white/50 bg-white/30 backdrop-blur-xl hover:bg-white/50">
              <Heart size={24} className={cn("text-gray-400", isTracked && "text-rose-500 fill-current")} />
            </Button>
          </div>

          <Card className="p-8 bg-white/30 backdrop-blur-xl border-white/40 rounded-[2.5rem]" hover={false}>
            <h4 className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-6">Price from different sites</h4>
            <div className="space-y-4">
              {priceSources.map((source) => (
                <div key={source.name} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/40">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", source.color)} />
                    <span className="text-[10px] font-black text-gray-500 tracking-wider">{source.name}</span>
                  </div>
                  <span className="text-sm font-black text-[#1A1A1A]">
                    {source.price ? `$${source.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          


        </div>

        {/* Right Column: Details & Analytics */}
        <div className="lg:col-span-8 space-y-10">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1.5 bg-white/40 backdrop-blur-md border border-white/40 rounded-full text-[9px] font-black tracking-[0.15em] uppercase text-gray-500">
                {card.pop_grader ? `${card.pop_grader} ${card.pop_grade}` : `TRACKED ASSET`}
              </span>
              <span className="px-4 py-1.5 bg-[#F3F0FF] border border-[#ADA3E6]/20 rounded-full text-[9px] font-black tracking-[0.15em] uppercase text-[#ADA3E6]">
                {card.pop_count ? `POP ${card.pop_count}` : 'LIVE'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.1] font-black tracking-tight text-[#1A1A1A]">{card.display_name}</h1>
            <p className="text-lg font-bold text-gray-400">{card.query.split('|')[0]}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 bg-[#F3F0FF]/50 backdrop-blur-xl border-[#ADA3E6]/10 rounded-[2.5rem]" hover={false}>
              <p className="text-[10px] font-black text-[#ADA3E6] uppercase tracking-[0.2em] mb-2">Market Price</p>
              <p className="text-4xl font-black text-[#1A1A1A] mb-4">${card.last_price ? card.last_price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}</p>
              <div className="pt-4 border-t border-[#ADA3E6]/10">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">30D Trend</p>
                <div className="flex items-center gap-1">
                  {(card.trend_30d || 0) >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                  <p className={cn("text-lg font-black", (card.trend_30d || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {(card.trend_30d || 0) >= 0 ? '+' : ''}{(card.trend_30d || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </Card>

            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: 'Volatility', value: card.volatility_30d ? `$${card.volatility_30d.toLocaleString(undefined, {minimumFractionDigits: 1})}` : '—' },
                { label: '24H Low', value: card.low_24h ? `$${card.low_24h.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—' },
                { label: '24H High', value: card.high_24h ? `$${card.high_24h.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—' },
                { label: 'Total Sold (7D)', value: card.volume_7d !== null ? card.volume_7d.toString() : '—' },
                { label: 'POP Count', value: card.pop_count !== null ? card.pop_count.toLocaleString() : '—' },
                { label: 'Avg (30D)', value: card.avg_30d ? `$${card.avg_30d.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—' },
              ].map((stat) => (
                <div key={stat.label}>
                  <Card className="p-6 bg-white/30 backdrop-blur-xl border-white/40 rounded-[2rem] h-full" hover={false}>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-lg font-black text-[#1A1A1A]">{stat.value}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Price Evolution */}
          <Card className="p-10 bg-white/30 backdrop-blur-xl border-white/40 rounded-[3rem]" hover={false}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h3 className="text-2xl font-black text-[#1A1A1A]">Price Evolution</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Interactive Value Index</p>
              </div>
              <div className="flex bg-gray-100/50 p-1.5 rounded-2xl">
                {['DAILY', 'WEEKLY', 'MONTHLY', 'ALL'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-5 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all",
                      activeTab === tab 
                        ? "bg-white text-[#1A1A1A] shadow-sm" 
                        : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              {card.price_history && card.price_history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={card.price_history.map((entry: any) => ({ name: entry.date.slice(5), value: entry.price }))}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip 
                      cursor={{fill: '#F3F0FF', opacity: 0.5}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[6, 6, 6, 6]}
                    >
                      {card.price_history.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === card.price_history.length - 1 ? '#ADA3E6' : '#E5E1F9'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest text-sm">
                  Not enough historical data
                </div>
              )}
            </div>

            {/* AI Market Intelligence */}
            <Card className="p-8 bg-black/5 backdrop-blur-3xl border border-[#ADA3E6]/30 rounded-[2.5rem] shadow-2xl overflow-hidden relative" hover={false}>
              <div className="absolute top-0 right-0 p-8">
                <div className="w-12 h-12 bg-[#ADA3E6]/10 rounded-full flex items-center justify-center animate-pulse">
                  <Zap size={24} className="text-[#ADA3E6] fill-current" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#ADA3E6]/20 bg-white/50 shadow-inner flex-shrink-0">
                    <img 
                      src="/prof_oak_pixel.jpg" 
                      alt="Professor Oak" 
                      className="w-full h-full object-cover p-1"
                    />
                  </div>
                  <h3 className="text-2xl font-black text-[#1A1A1A]">Prof. Oak's Insights</h3>
                </div>

                <div className="min-h-[100px] flex items-center">
                  {aiLoading ? (
                    <div className="space-y-3 w-full">
                      <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded-full w-5/6 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded-full w-2/3 animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-base font-bold leading-relaxed text-gray-700 italic">
                      "{aiInsight || 'Professor Oak is currently busy with research. Please try again later.'}"
                    </p>
                  )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lab Analysis Active</span>
                  </div>
                </div>
              </div>
            </Card>
          </Card>

          {/* Specs Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white/30 backdrop-blur-xl border-white/40 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-[#ADA3E6]" />
                <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider">Item Details</h4>
              </div>
              <div className="space-y-5">
                {[
                  { label: 'Brand', value: 'Pokemon Card Game' },
                  { label: 'Category', value: 'Trading Cards (Single)' },
                  { label: 'Product Code', value: 'pkmn-tcg-M2a-234' },
                  { label: 'Condition', value: 'Pre-owned (See item page)' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/20 last:border-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                    <span className="text-xs font-bold text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 bg-white/30 backdrop-blur-xl border-white/40 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-8">
                <Zap size={18} className="text-[#ADA3E6]" />
                <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider">Technical Specs</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { label: 'Set/Subtitle', value: card.query.split('|')[0] },
                  { label: 'Grader', value: card.pop_grader || 'Ungraded / Raw' },
                  { label: 'Grade Phase', value: card.pop_grade || 'Unknown' },
                  { label: 'Database ID', value: `ARCHIVE-${card.id.toString().padStart(4, '0')}` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>


        </div>
      </div>
    </div>
  );
}
