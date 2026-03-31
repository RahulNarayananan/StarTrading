import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronDown, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  LayoutGrid,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getCardImage } from '../lib/utils';
import { PokemonLoading } from '../components/ui/PokemonLoading';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [isBusy, setIsBusy] = useState(true);

  const handleDeepSearch = React.useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await fetch('/tracker/deep-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.card_id) {
          // Keep isBusy true during navigation
          navigate(`/card/${data.card_id}`, { state: { from: 'search' } });
          return; 
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsBusy(false);
  }, [query, navigate]);

  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      setIsBusy(true);
      try {
        const res = await fetch('/tracker/cards');
        if (res.ok && active) {
          const data = await res.json();
          const filtered = query 
            ? data.filter((c: any) => 
                (c.display_name?.toLowerCase().includes(query.toLowerCase()) || 
                 c.query?.toLowerCase().includes(query.toLowerCase()))
              )
            : data;
          
          setResults(filtered || []);
          
          if (query && (!filtered || filtered.length === 0)) {
            await handleDeepSearch();
          } else {
            setIsBusy(false);
          }
        }
      } catch (e) {
        console.error(e);
        if (active) setIsBusy(false);
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [query, handleDeepSearch]);

  if (isBusy && query && results.length === 0) {
    return <PokemonLoading query={query} />;
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#1A1A1A]">
            Search Results {query ? <>for <span className="text-[#ADA3E6]">'{query}'</span></> : ''}
          </h1>
          <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
            {results.length} CARDS FOUND IN THE ARCHIVE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="bg-white/40 backdrop-blur-md border-white/40 rounded-2xl h-12 px-6 gap-3 hover:bg-white/60 transition-all">
            <LayoutGrid size={18} className="text-[#ADA3E6]" />
            <span className="text-xs font-bold text-gray-600">Rarity</span>
            <ChevronDown size={14} className="text-gray-400" />
          </Button>
          <Button variant="outline" className="bg-white/40 backdrop-blur-md border-white/40 rounded-2xl h-12 px-6 gap-3 hover:bg-white/60 transition-all">
            <SlidersHorizontal size={18} className="text-[#ADA3E6]" />
            <span className="text-xs font-bold text-gray-600">Set</span>
            <ChevronDown size={14} className="text-gray-400" />
          </Button>
          <Button variant="outline" className="bg-white/40 backdrop-blur-md border-white/40 rounded-2xl h-12 px-6 gap-3 hover:bg-white/60 transition-all">
            <TrendingUp size={18} className="text-[#ADA3E6]" />
            <span className="text-xs font-bold text-gray-600">Price Range</span>
            <ChevronDown size={14} className="text-gray-400" />
          </Button>
          <Button variant="primary" size="icon" className="w-12 h-12 rounded-2xl shadow-xl shadow-[#ADA3E6]/20 bg-[#ADA3E6] hover:scale-105 transition-all">
            <SlidersHorizontal size={20} />
          </Button>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {results.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center gap-6">
            <div className="text-center text-gray-400 font-bold uppercase tracking-widest">
              No cards matched your query in the archive
            </div>
            {query && (
              <Button 
                onClick={handleDeepSearch}
                className="bg-[#ADA3E6] hover:bg-[#9D93D6] text-white px-8 py-6 rounded-3xl font-black text-sm shadow-xl shadow-[#ADA3E6]/20 flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full border-2 border-white flex flex-col overflow-hidden">
                  <div className="h-1/2 bg-white" />
                  <div className="h-1/2 bg-red-400" />
                </div>
                DEEP DIVE: CATCH LIVE DATA
              </Button>
            )}
          </div>
        ) : results.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link 
              to={`/card/${card.id}`}
              state={{ from: 'search' }}
              className="block group bg-white/30 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-5 hover:bg-white/50 hover:shadow-2xl hover:shadow-[#ADA3E6]/10 transition-all duration-500"
            >
              {/* Card Image Container */}
              <div className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden mb-6 shadow-2xl group-hover:scale-[1.03] transition-transform duration-700 ease-out flex items-center justify-center p-4 bg-white/20">
                <img 
                  src={getCardImage(card.display_name) || card.image_url || "https://images.pokemontcg.io/swsh3/20_hires.png"} 
                  alt={card.display_name}
                  className="w-full h-full object-contain filter drop-shadow-xl"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "https://images.pokemontcg.io/swsh3/20_hires.png" }}
                />
                <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.15em] uppercase border backdrop-blur-xl bg-[#F3F0FF]/80 text-[#ADA3E6] border-[#ADA3E6]/20`}>
                  {card.pop_count ? `POP ${card.pop_count}` : "TRACKED"}
                </div>
              </div>

              {/* Card Info */}
              <div className="space-y-5 px-1">
                <div>
                  <h3 className="text-xl font-bold text-[#1A1A1A] group-hover:text-[#ADA3E6] transition-colors duration-300 leading-tight line-clamp-2 min-h-[2.5rem]">
                    {card.display_name}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 truncate">
                    {card.query.split('|')[0]}
                  </p>
                </div>

                <div className="pt-5 border-t border-white/40 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Market Price</p>
                    <p className="text-2xl font-black text-[#1A1A1A]">
                      ${card.last_price ? card.last_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                    (card.trend_30d || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {(card.trend_30d || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {(card.trend_30d || 0) > 0 ? '+' : ''}{(card.trend_30d || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer Section */}
      {results.length > 0 && (
        <div className="flex flex-col items-center gap-8 py-16">
          <Button 
            variant="primary" 
            className="px-16 py-7 rounded-3xl text-sm font-black shadow-2xl shadow-[#ADA3E6]/30 bg-[#ADA3E6] hover:scale-105 hover:shadow-[#ADA3E6]/40 transition-all duration-300"
          >
            Load More Archives
          </Button>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">
              VIEWING {results.length} OF {results.length} RESULTS
            </p>
            <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-full h-full bg-[#ADA3E6] rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
