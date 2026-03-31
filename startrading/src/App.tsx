/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Search from './pages/Search';
import SearchResults from './pages/SearchResults';
import CardInfo from './pages/CardInfo';
import Vault from './pages/Vault';
import WeeklyReport from './pages/WeeklyReport';
import Polymarket from './pages/Polymarket';
import Events from './pages/Events';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/card/:id" element={<CardInfo />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/weekly-report" element={<WeeklyReport />} />
          <Route path="/forecasts" element={<Polymarket />} />
          <Route path="/events" element={<Events />} />
          {/* Fallback for demo purposes */}
          <Route path="*" element={<Search />} />
        </Routes>
      </Layout>
    </Router>
  );
}
