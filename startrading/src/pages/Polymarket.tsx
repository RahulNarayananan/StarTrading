import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { getCardImage } from '../lib/utils';

const PredictionMarketCard = ({ card }: { card: any; key?: React.Key }) => {
  const [marketData, setMarketData] = useState<any>(null);
  const [betLoading, setBetLoading] = useState(false);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const mRes = await fetch(`/tracker/card/${card.id}/market`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMarketData(mData);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMarket();
  }, [card.id]);

  const handleBet = async (direction: 'UP' | 'DOWN') => {
    if (!marketData || betLoading) return;
    setBetLoading(true);
    try {
      const res = await fetch(`/tracker/market/${marketData.market.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, amount: 1 })
      });
      if (res.ok) {
        const updated = await res.json();
        setMarketData({ ...marketData, sentiment: updated.sentiment });
      }
    } catch (e) {
      console.error("Failed to place bet", e);
    } finally {
      setBetLoading(false);
    }
  };

  if (!marketData) return null;

  return (
    <Card className="p-0 bg-white/40 backdrop-blur-xl border-white/50 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all h-full" hover={false}>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left: Card Image */}
        <div className="w-full lg:w-48 bg-white/20 flex items-center justify-center p-6 shrink-0 border-b lg:border-b-0 lg:border-r border-white/30">
          <div className="w-full max-w-[120px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg hover:-translate-y-2 transition-transform duration-300">
            <img 
              src={getCardImage(card.display_name)} 
              alt={card.display_name}
              className="w-full h-full object-contain filter drop-shadow-md"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
            />
          </div>
        </div>

        {/* Middle: Info & Graph */}
        <div className="flex-1 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/30">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#F3F0FF] border border-[#ADA3E6]/20 rounded-full text-[8px] font-black tracking-[0.15em] uppercase text-[#ADA3E6]">
                {card.pop_count ? `POP ${card.pop_count}` : 'TRACKED ASSET'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-[#1A1A1A] leading-tight mb-1">{card.display_name}</h3>
            <p className="text-xs font-bold text-gray-400 truncate mb-6">{card.query.split('|')[0]}</p>
          </div>
          
          <div className="flex-1 min-h-[140px] w-full mt-4 -ml-4">
            {card.price_history && card.price_history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.price_history.map((entry: any) => ({ date: entry.date.slice(5), price: entry.price }))}>
                  <defs>
                    <linearGradient id={`color-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ADA3E6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ADA3E6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} minTickGap={15} />
                  <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} tickFormatter={(v) => `$${v}`} width={45} />
                  <Tooltip 
                    cursor={{stroke: '#ADA3E6', strokeWidth: 1, strokeDasharray: '4 4'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#ADA3E6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill={`url(#color-${card.id})`} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase tracking-widest">
                No Data
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Betting Interface */}
        <div className="w-full lg:w-[400px] p-8 shrink-0 bg-[#F3F0FF]/30 relative flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ADA3E6]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="flex justify-end mb-6">
            <span className="text-xl font-black text-[#1A1A1A]">
              ${card.last_price ? card.last_price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}
            </span>
          </div>
          
          <p className="text-base font-black text-[#1A1A1A] leading-tight mb-8">
            {marketData.market.question}
          </p>

          {/* Sentiment Bar */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-[11px] font-black tracking-widest uppercase">
              <span className="text-emerald-500">UP · {marketData.sentiment.up_percent}%</span>
              <span className="text-rose-500">{marketData.sentiment.down_percent}% · DOWN</span>
            </div>
            <div className="w-full h-3 rounded-full flex overflow-hidden bg-white/50 border border-white/50 shadow-inner">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                style={{ width: `${marketData.sentiment.up_percent}%` }} 
              />
              <div 
                className="h-full bg-rose-500 transition-all duration-1000 ease-out" 
                style={{ width: `${marketData.sentiment.down_percent}%` }} 
              />
            </div>
            <p className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest pt-1">
              {marketData.sentiment.total} Cast
            </p>
          </div>

          {/* Bet Buttons */}
          <div className="flex gap-4 mt-auto">
            <Button 
              onClick={() => handleBet('UP')}
              disabled={betLoading}
              className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 font-black tracking-wider text-xs text-white"
            >
              YES
            </Button>
            <Button 
              onClick={() => handleBet('DOWN')}
              disabled={betLoading}
              className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 font-black tracking-wider text-xs text-white"
            >
              NO
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function Polymarket() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchCards();
  }, []);

  return (
    <div className="pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-6xl font-black tracking-tight text-[#1A1A1A]">Forecasts</h1>
          <p className="text-lg font-bold text-gray-400 mt-2">Predict future price action on top tracked assets.</p>
        </div>
      </div>

      {loading ? (
        <div className="pb-20 pt-20 text-center font-bold text-gray-400 tracking-widest uppercase">Decrypting Vault Data...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {cards.map(card => (
            <PredictionMarketCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
