 import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Clock, ExternalLink, Ticket, Star } from 'lucide-react';
import { motion } from 'motion/react';

const EVENTS_DATA = [
  {
    id: 1,
    name: "CARD CON 2",
    description: "Experience Singapore's premier trading card convention. Join thousands of collectors, traders, and fans for a weekend of epic pulls and rare finds.",
    date: "March 28 - 29, 2026",
    time: "11AM - 9PM Daily",
    location: "Suntec City Convention Center Hall 405",
    image: "/images/card_con_2_banner.png",
    featured: true,
    tags: ["Featured", "Singapore"]
  },
  {
    id: 2,
    name: "Singapore TCG Tradefair",
    description: "The TSTF Safari Zone is back! A massive tradefair dedicated to Pokemon and other TCG collectors. Exclusive drops and community deals await.",
    date: "April 4 - 5, 2026",
    time: "11AM - 9PM Daily",
    location: "Kallang Leisure Park (Level 1 Atrium)",
    image: "/images/singapore_tcg_tradefair_banner.png",
    featured: false,
    tags: ["Safari Zone", "Trading"]
  },
  {
    id: 3,
    name: "SG Collectibles Card Show",
    description: "A professional grade trade show for serious collectors. Featuring 100+ vendors, exclusive activities, and high-end collectibles.",
    date: "April 11 - 12, 2026",
    time: "11AM - 9PM (VIP 10AM)",
    location: "Singapore Expo Hall 6B",
    image: "/images/sg_collectibles_expo_banner.png",
    featured: false,
    tags: ["Expo", "Trade Show"]
  },
  {
    id: 4,
    name: "SG Collectibles Card Show",
    description: "Catch the second leg of the SG Collectibles show at Kallang. More vendors, more exclusive drops, and community activities.",
    date: "April 17 - 19, 2026",
    time: "11AM - 9PM (VIP 10AM)",
    location: "Kallang Leisure Park (Level 1 Atrium)",
    image: "/images/sg_collectibles_kallang_banner.png",
    featured: false,
    tags: ["Kallang", "Community"]
  }
];

const EventCard = ({ event }: { event: typeof EVENTS_DATA[0] }) => {
  return (
    <Card className="p-0 bg-white/40 backdrop-blur-xl border-white/50 rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all group mb-8" hover={false}>
      <div className="flex flex-col lg:flex-row min-h-[400px]">
        {/* Left Section: Visual Banner */}
        <div className="w-full lg:w-[45%] relative overflow-hidden shrink-0">
          <img 
            src={event.image} 
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {event.featured && (
            <div className="absolute top-6 left-6 px-4 py-1.5 bg-yellow-400 text-black font-black text-[10px] tracking-widest uppercase rounded-full shadow-lg flex items-center gap-2">
              <Star size={12} fill="currentColor" />
              Featured
            </div>
          )}
        </div>

        {/* Right Section: Content */}
        <div className="flex-1 p-8 lg:p-10 flex flex-col justify-between bg-white/10">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-white/40 border border-white/60 rounded-full text-[9px] font-black tracking-widest uppercase text-gray-500">
                  {tag}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight text-[#1A1A1A] leading-tight">
                {event.name}
              </h2>
              <p className="text-sm font-bold text-gray-400 line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm border border-white/40">
                  <Calendar className="text-[#ADA3E6]" size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                  <p className="text-xs font-black text-[#1A1A1A]">{event.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm border border-white/40">
                  <Clock className="text-[#ADA3E6]" size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                  <p className="text-xs font-black text-[#1A1A1A]">{event.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm border border-white/40">
                  <MapPin className="text-[#ADA3E6]" size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                  <p className="text-xs font-black text-[#1A1A1A]">{event.location}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-10">
            <Button className="h-12 px-8 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white font-black tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-black/10 transition-all active:scale-95">
              <Ticket size={14} />
              RSVP FREE PASS
            </Button>
            <Button variant="outline" className="h-12 px-6 rounded-2xl border-gray-200 hover:bg-white text-gray-500 font-black tracking-widest text-[10px] hidden sm:flex items-center gap-2">
              <ExternalLink size={14} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function Events() {
  return (
    <div className="pb-20">
      <header className="mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[10px] font-black tracking-[0.5em] text-[#ADA3E6] uppercase pb-2 block">Collector's Hub</span>
          <h1 className="text-6xl font-black tracking-tighter text-[#1A1A1A]">Events</h1>
          <p className="text-lg font-bold text-gray-400 mt-2 max-w-2xl">
            Singapore's premier trading card shows and community meets. Track your favorite events across the city.
          </p>
        </motion.div>
      </header>

      <div className="grid grid-cols-1">
        {EVENTS_DATA.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <EventCard event={event} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
