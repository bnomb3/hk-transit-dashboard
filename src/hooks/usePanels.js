import { useState, useEffect } from 'react';

const STORAGE_KEY = 'transit_panels';

// Demo set shown on first visit: well-known routes plus a made-up timetable
const DEFAULT_PANELS = [
  { id: 'default-1', type: 'mtr', fromStation: 'TWL-CEN', toStation: 'TWL-TST' },
  { id: 'default-2', type: 'mtr', fromStation: 'AEL-HOK', toStation: 'AEL-AIR' },
  { id: 'default-3', type: 'kmb', route: '1',   fromStop: 'C88E34E485B43EFB', direction: 'inbound' },
  { id: 'default-4', type: 'ctb', route: '6',   fromStop: '001032', direction: 'outbound' },
  { id: 'default-5', type: 'ctb', route: '15',  fromStop: '001195', direction: 'outbound' },
  { id: 'default-6', type: 'ctb', route: 'A11', fromStop: '001249', direction: 'outbound' },
  { id: 'default-7', type: 'gmb', region: 'HKI', route: '1', fromStop: '20014492', direction: '2' },
  {
    id: 'default-8', type: 'timetable', name: 'Sample Shuttle', from: 'Harbour Tower', to: 'Central Pier',
    weekdays: Array.from({ length: 34 }, (_, i) => `${String(7 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`),
    holidays: Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`),
    journeyDuration: '12',
  },
];

function migratePanels(panels) {
  return panels
    // The hard-coded shuttle and minibus timetables were replaced by the generic timetable panel
    .filter(p => p.type !== 'shuttle' && !p.useTimetable)
    .map(p => {
      if ('duration' in p && !('journeyDuration' in p)) {
        const { duration, ...rest } = p;
        return { ...rest, journeyDuration: duration };
      }
      return p;
    });
}

export function usePanels() {
  const [panels, setPanels] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? migratePanels(JSON.parse(stored)) : DEFAULT_PANELS;
    } catch {
      return DEFAULT_PANELS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels]);

  const addPanel = (config) =>
    setPanels(prev => [...prev, { ...config, id: crypto.randomUUID() }]);

  const removePanel = (id) =>
    setPanels(prev => prev.filter(p => p.id !== id));

  const reorderPanels = (activeId, overId) =>
    setPanels(prev => {
      const from = prev.findIndex(p => p.id === activeId);
      const to = prev.findIndex(p => p.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  return { panels, addPanel, removePanel, reorderPanels };
}
