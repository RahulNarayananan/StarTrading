import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  SlidersHorizontal, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion } from 'motion/react';
import { cn, getCardImage } from '../lib/utils';

const TRACKED_CARDS = [
  {
    id: 'swsh12-186',
    name: 'Lugia V Alternate Art',
    set: 'Silver Tempest',
    status: 'NEW LISTING',
    price: 215.00,
    change: -1.2,
    image: 'https://images.pokemontcg.io/swsh12/186_hires.png'
  },
  {
    id: 'swsh7-218',
    name: 'Rayquaza VMAX',
    set: 'Evolving Skies',
    status: 'STABLE',
    price: 412.50,
    change: 0.8,
    image: 'https://images.pokemontcg.io/swsh7/218_hires.png'
  },
  {
    id: 'swsh11-186',
    name: 'Giratina V (Alt Art)',
    set: 'Lost Origin',
    status: 'HIGH VOLUME',
    price: 389.99,
    change: 5.1,
    image: 'https://images.pokemontcg.io/swsh11/186_hires.png'
  }
];

export default function Vault() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = async () => {
    try {
      const res = await fetch('/tracker/cards');
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const featuredCard = cards.length > 0 ? cards[0] : null;
  const totalValue = cards.reduce((sum, c) => sum + (c.last_price || 0), 0);
  const avgChange = cards.length > 0 
    ? cards.reduce((sum, c) => sum + (c.trend_30d || 0), 0) / cards.length 
    : 0;

  const handleDelete = async (e: React.MouseEvent, cardId: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to stop tracking this card?')) return;
    
    try {
      const res = await fetch(`/tracker/cards/${cardId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-6xl font-black tracking-tight text-[#1A1A1A]">Your StarVault</h1>
          <p className="text-lg font-bold text-gray-400 mt-2">Curated high-value assets and market fluctuations.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={fetchCards}
            className="bg-white/40 backdrop-blur-xl border-white/40 rounded-2xl px-6 py-6 h-auto flex items-center gap-2 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-white/60"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/40 backdrop-blur-xl border-white/40 rounded-2xl px-6 py-6 h-auto flex items-center gap-2 text-gray-600 font-black text-xs uppercase tracking-widest"
          >
            <SlidersHorizontal size={18} />
            Filter
          </Button>
          <Button className="bg-[#ADA3E6] hover:bg-[#9B8FE0] rounded-2xl px-8 py-6 h-auto flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[#ADA3E6]/20">
            <Plus size={18} />
            Add Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Featured Card Section */}
        <div className="lg:col-span-8">
          {featuredCard ? (
            <Card 
              className="p-10 bg-white/40 backdrop-blur-2xl border-white/50 rounded-[3rem] h-full cursor-pointer group relative" 
              hover={false}
              onClick={() => navigate(`/card/${featuredCard.id}`, { state: { from: 'vault' } })}
            >
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/40 border-white/20 text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all z-10"
                onClick={(e) => handleDelete(e, featuredCard.id)}
              >
                <Trash2 size={20} />
              </Button>

              <div className="flex flex-col md:flex-row gap-10">
                <div className="w-full md:w-64 aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl bg-white/20 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center p-4">
                  <img 
                    src={getCardImage(featuredCard.display_name) || featuredCard.image_url || "https://images.pokemontcg.io/swsh3/20_hires.png"} 
                    alt={featuredCard.display_name}
                    className="w-full h-full object-contain filter drop-shadow-xl"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
                  />
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="px-4 py-1.5 bg-[#F3F0FF] border border-[#ADA3E6]/20 rounded-full text-[9px] font-black tracking-[0.15em] uppercase text-[#ADA3E6] mb-4 inline-block">
                        TRACKED ASSET
                      </span>
                      <h2 className="text-5xl font-black tracking-tight text-[#1A1A1A] mb-2 group-hover:text-[#ADA3E6] transition-colors">{featuredCard.display_name}</h2>
                      <p className="text-sm font-bold text-gray-400">{featuredCard.query.split('|')[0]}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-6 bg-white/40 rounded-[2rem] border border-white/40">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Market Value</p>
                      <p className="text-3xl font-black text-[#1A1A1A]">${featuredCard.last_price ? featuredCard.last_price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}</p>
                    </div>
                    <div className="p-6 bg-[#F3F0FF]/30 rounded-[2rem] border border-[#ADA3E6]/10">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">30d Trend</p>
                      <div className="flex items-center gap-2">
                        {featuredCard.trend_30d >= 0 ? <TrendingUp size={20} className="text-emerald-500" /> : <TrendingDown size={20} className="text-rose-500" />}
                        <p className={cn("text-3xl font-black", featuredCard.trend_30d >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          {featuredCard.trend_30d > 0 ? '+' : ''}{featuredCard.trend_30d ? featuredCard.trend_30d.toFixed(2) : '-'}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Volume 7d: {featuredCard.volume_7d}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
             <Card className="p-10 flex items-center justify-center bg-white/40 h-full rounded-[3rem]">
               <p className="text-gray-400 font-bold uppercase tracking-widest">No tracked cards yet</p>
             </Card>
          )}
        </div>

        {/* Summary Section */}
        <div className="lg:col-span-4">
          <Card className="p-10 bg-[#F3F0FF]/50 backdrop-blur-2xl border-[#ADA3E6]/10 rounded-[3rem] h-full flex flex-col" hover={false}>
            <h3 className="text-2xl font-black text-[#1A1A1A] mb-10">Vault Summary</h3>
            
            <div className="space-y-8 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500">Total Value tracked</span>
                <span className="text-2xl font-black text-[#1A1A1A]">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500">Avg 30d Change</span>
                <span className={cn("text-2xl font-black", avgChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500">Tracked Assets</span>
                <span className="text-2xl font-black text-[#1A1A1A]">{cards.length} Cards</span>
              </div>
            </div>

            <div className="space-y-4 mt-10">
              <Button 
                onClick={() => navigate('/weekly-report')}
                className="w-full py-6 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black/90 transition-all"
              >
                <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 bg-white p-0.5">
                  <img src="/prof_oak_pixel.jpg" alt="Oak" className="w-full h-full object-cover" />
                </div>
                Professor Oak's Report
              </Button>
              <Button variant="outline" className="w-full py-6 rounded-2xl border-black/10 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-black/5 transition-all">
                View Analytics
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.slice(1).map((card) => (
          <div key={card.id}>
            <Card className="p-8 bg-white/40 backdrop-blur-xl border-white/50 rounded-[2.5rem] h-full flex flex-col justify-between" hover={true}>
              <div>
                <div className="flex items-start gap-4 mb-8">
                  <div className="w-20 aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-white/20 flex-shrink-0 flex items-center justify-center p-2">
                    <img 
                      src={getCardImage(card.display_name) || card.image_url || "https://images.pokemontcg.io/swsh3/20_hires.png"} 
                      alt={card.display_name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
                    />
                  </div>
                  <div>
                    <span className="text-[8px] font-black tracking-[0.15em] uppercase text-[#ADA3E6] mb-1 block">
                      {card.pop_count ? `POP ${card.pop_count}` : "TRACKED"}
                    </span>
                    <h4 className="text-base font-black text-[#1A1A1A] leading-tight mb-1">{card.display_name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 truncate">{card.query.split('|')[0]}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-8">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Market</p>
                    <p className="text-xl font-black text-[#1A1A1A]">${card.last_price ? card.last_price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-black",
                    (card.trend_30d || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(card.trend_30d || 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {(card.trend_30d || 0) >= 0 ? '+' : ''}{(card.trend_30d || 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4 rounded-xl bg-gray-100/50 border-transparent text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
                  onClick={() => navigate(`/card/${card.id}`, { state: { from: 'vault' } })}
                >
                  View Archive
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-12 h-12 rounded-xl bg-gray-100/50 border-transparent text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                  onClick={(e) => handleDelete(e, card.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
