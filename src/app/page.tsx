'use client';

import React, { useState, useEffect } from 'react';
import { TopMetricsHeader } from '@/features/dashboard/TopMetricsHeader';
import { KanbanBoard } from '@/features/kanban/KanbanBoard';
import { LeadCardData } from '@/features/kanban/KanbanCard';

export default function HomePage() {
  const [leads, setLeads] = useState<LeadCardData[]>([]);
  const [buildLogs, setBuildLogs] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch leads and build logs
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
        setBuildLogs(data.buildLogs || []);
      }

      // 2. Fetch system status & metrics
      const statusRes = await fetch('/api/system/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Real-time polling every 3 seconds to stream live agent badges & build progress
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDiscoverLeads = async () => {
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 3 }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <TopMetricsHeader
        systemStatus={systemStatus}
        onDiscoverLeads={handleDiscoverLeads}
        onRefresh={fetchData}
        loading={loading}
      />

      <KanbanBoard
        leads={leads}
        buildLogs={buildLogs}
        onRefreshLeads={fetchData}
      />
    </main>
  );
}
