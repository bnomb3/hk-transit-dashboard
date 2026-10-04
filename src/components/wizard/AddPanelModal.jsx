import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import mtrData from '../../data/mtrData.json';
import { API } from '../../api';
import { parseTimes } from '../../timetable';

// UT = UP direction (API), DT = DOWN direction (API)
function getMtrDirOptions(line, lang, t) {
  const stations = mtrData.stations[line];
  if (!stations) return [];
  const utLast = (stations.UT || [])[((stations.UT || []).length) - 1];
  const dtLast = (stations.DT || [])[((stations.DT || []).length) - 1];
  const name = (s) => !s ? '' : lang === 'en' ? s.name_en : lang === 'zh-HK' ? s.name_tc : s.name_sc;
  return [
    { value: 'UP',   label: t('wizard.towards', { dest: name(utLast) }) },
    { value: 'DOWN', label: t('wizard.towards', { dest: name(dtLast) }) },
  ];
}

function getMtrStationList(line, lang) {
  const byDir = mtrData.stations[line];
  if (!byDir) return [];
  const seen = new Set();
  const result = [];
  for (const dir of ['UT', 'DT']) {
    for (const s of (byDir[dir] || [])) {
      if (!seen.has(s.station)) {
        seen.add(s.station);
        result.push({
          id: `${line}-${s.station}`,
          name: lang === 'en' ? s.name_en : lang === 'zh-HK' ? s.name_tc : s.name_sc,
        });
      }
    }
  }
  return result;
}

export const OPERATOR_STYLE = {
  mtr:     { bg: '#162547', color: 'white' },
  kmb:     { bg: '#d93934', color: 'white' },
  ctb:     { bg: '#ffdd00', color: 'black' },
  gmb:     { bg: '#4da94d', color: 'white' },
  timetable: { bg: '#ab64a8', color: 'black' },
};

const EMPTY_FORM = {
  type: null,
  route: '',
  routeValidating: false,
  routeValid: null,
  routeData: null,
  routeError: null,
  // GMB
  regions: [],
  region: null,
  routeId: null,
  // navigation data
  directionOptions: [],
  direction: null,
  serviceTypeOptions: [],
  serviceType: '1',
  stopList: [],
  fromStop: null,
  toStop: null,
  journeyDuration: '',
  // MTR
  line: null,
  fromStation: null,
  toStation: null,
  // Custom timetable
  ttName: '',
  ttFrom: '',
  ttTo: '',
  ttWeekdays: '',
  ttHolidays: '',
};

export default function AddPanelModal({ lang, onAdd, onClose }) {
  const { t } = useTranslation();
  const debounceRef = useRef(null);

  const [step, setStep] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const ttWeekdays = parseTimes(form.ttWeekdays);
  const ttHolidays = parseTimes(form.ttHolidays);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Step sequencing ─────────────────────────────────────────────────────────

  function nextStep() {
    const { type, regions, serviceTypeOptions } = form;
    switch (step) {
      case 'operator':
        if (type === 'timetable') return 'timetable';
        if (type === 'mtr')     return 'mtrLine';
        return 'route';
      case 'timetable':  return 'confirm';
      case 'mtrLine':    return 'mtrStations';
      case 'mtrStations': return 'confirm';
      case 'route':
        return (type === 'gmb' && regions.length > 1) ? 'region' : 'direction';
      case 'region':     return 'direction';
      case 'direction':
        if (type === 'kmb' && serviceTypeOptions.length > 1) return 'serviceType';
        return 'stops';
      case 'serviceType': return 'stops';
      case 'stops':      return 'confirm';
      default:           return null;
    }
  }

  function prevStep() {
    const { type, regions, serviceTypeOptions } = form;
    switch (step) {
      case 'timetable':   return 'operator';
      case 'mtrLine':     return 'operator';
      case 'mtrStations': return 'mtrLine';
      case 'route':       return 'operator';
      case 'region':      return 'route';
      case 'direction':
        if (type === 'gmb' && regions.length > 1) return 'region';
        return 'route';
      case 'serviceType': return 'direction';
      case 'stops':
        return (type === 'kmb' && serviceTypeOptions.length > 1) ? 'serviceType' : 'direction';
      case 'confirm':
        if (type === 'mtr')     return 'mtrStations';
        if (type === 'timetable') return 'timetable';
        return 'stops';
      default: return 'operator';
    }
  }

  function canProceed() {
    switch (step) {
      case 'operator':    return !!form.type;
      case 'timetable':
        return !!form.ttName.trim() && !!form.ttFrom.trim() && !!form.ttTo.trim()
          && ttWeekdays.times.length > 0
          && ttWeekdays.invalid.length === 0 && ttHolidays.invalid.length === 0;
      case 'mtrLine':     return !!form.line;
      case 'mtrStations': return !!form.fromStation && (!!form.toStation || !!form.direction);
      case 'route':       return form.routeValid === true;
      case 'region':      return !!form.region;
      case 'direction':   return !!form.direction;
      case 'serviceType': return !!form.serviceType;
      case 'stops':       return !!form.fromStop;
      case 'confirm':     return true;
      default:            return false;
    }
  }

  const goNext = async () => {
    const next = nextStep();
    if (!next) return;

    if (next === 'direction') {
      // Load direction options before navigating (fast single API call)
      setLoading(true);
      try { await loadDirectionOptions(); } finally { setLoading(false); }
      setStep('direction');
    } else if (next === 'stops') {
      // Navigate first so the user sees the spinner on the stops step
      update({ stopList: [], fromStop: null, toStop: null });
      setStep('stops');
      setLoading(true);
      try { await loadStopList(); } finally { setLoading(false); }
    } else {
      setStep(next);
    }
  };

  const goBack = () => setStep(prevStep());

  // ── Route validation ─────────────────────────────────────────────────────────

  const validateRoute = async (value, type) => {
    const upper = value.trim().toUpperCase();
    if (!upper) { update({ routeValid: null, routeData: null, routeError: null, routeValidating: false }); return; }
    update({ routeValidating: true, routeValid: null, routeError: null });
    try {
      if (type === 'kmb') {
        // KMB has no per-route lookup; the route list is the only way to get all bounds and service types
        const json = await fetch(`${API.kmb}/route/`).then(r => r.json());
        const entries = (json.data || []).filter(e => e.route === upper);
        if (entries.length > 0)
          update({ routeValid: true, routeData: entries, routeValidating: false });
        else
          update({ routeValid: false, routeError: t('wizard.routeNotFound'), routeValidating: false });

      } else if (type === 'ctb') {
        const json = await fetch(`${API.citybus}/route/ctb/${upper}`).then(r => r.json());
        if (json.data?.co)
          update({ routeValid: true, routeData: json.data, routeValidating: false });
        else
          update({ routeValid: false, routeError: t('wizard.routeNotFound'), routeValidating: false });

      } else if (type === 'gmb') {
        const json = await fetch(`${API.gmb}/route`).then(r => r.json());
        const foundRegions = Object.entries(json.data.routes)
          .filter(([, codes]) => codes.includes(upper))
          .map(([r]) => r);
        if (foundRegions.length > 0)
          update({
            routeValid: true, routeValidating: false, routeError: null,
            regions: foundRegions,
            region: foundRegions.length === 1 ? foundRegions[0] : null,
          });
        else
          update({ routeValid: false, routeError: t('wizard.routeNotFound'), routeValidating: false });
      }
    } catch {
      update({ routeValid: false, routeError: t('wizard.validationFailed'), routeValidating: false });
    }
  };

  const handleRouteInput = (value) => {
    update({ route: value, routeValid: null, routeError: null, directionOptions: [], direction: null, stopList: [] });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validateRoute(value, form.type), 600);
  };

  // ── Direction options ────────────────────────────────────────────────────────

  const loadDirectionOptions = async () => {
    const { type, route, routeData, region } = form;
    const upper = route.trim().toUpperCase();
    let options = [];

    if (type === 'kmb') {
      const uniqueBounds = {};
      for (const e of routeData) {
        if (!uniqueBounds[e.bound]) uniqueBounds[e.bound] = e;
      }
      for (const [bound, e] of Object.entries(uniqueBounds)) {
        const dest = lang === 'en' ? e.dest_en : lang === 'zh-HK' ? e.dest_tc : e.dest_sc;
        options.push({ value: bound === 'O' ? 'outbound' : 'inbound', label: t('wizard.towards', { dest }) });
      }
    } else if (type === 'ctb') {
      const d = routeData;
      const dest = (lang === 'en' ? d.dest_en : lang === 'zh-HK' ? d.dest_tc : d.dest_sc) ?? d.dest_en ?? d.dest_tc ?? '';
      const orig = (lang === 'en' ? d.orig_en : lang === 'zh-HK' ? d.orig_tc : d.orig_sc) ?? d.orig_en ?? d.orig_tc ?? '';
      options = [
        { value: 'outbound', label: t('wizard.towards', { dest }) },
        { value: 'inbound',  label: t('wizard.towards', { dest: orig }) },
      ];
    } else if (type === 'gmb') {
      const activeRegion = region || form.regions[0];
      const json = await fetch(`${API.gmb}/route/${activeRegion}/${upper}`).then(r => r.json());
      const info = json.data[0];
      update({ routeId: info.route_id });
      for (const dir of info.directions) {
        const dest = lang === 'en' ? dir.dest_en : lang === 'zh-HK' ? dir.dest_tc : dir.dest_sc;
        options.push({ value: String(dir.route_seq), label: t('wizard.towards', { dest }) });
      }
    }
    update({ directionOptions: options, direction: null, serviceTypeOptions: [], serviceType: '1' });
  };

  // ── Direction select ─────────────────────────────────────────────────────────

  const handleDirectionSelect = (dir) => {
    update({ direction: dir, fromStop: null, toStop: null, stopList: [] });
    if (form.type === 'kmb') {
      const bound = dir === 'outbound' ? 'O' : 'I';
      const entries = form.routeData.filter(e => e.bound === bound);
      const allSameOrig = new Set(entries.map(e => e.orig_tc)).size === 1;
      const opts = entries.map(e => {
        const orig = lang === 'en' ? e.orig_en : lang === 'zh-HK' ? e.orig_tc : e.orig_sc;
        const dest = lang === 'en' ? e.dest_en : lang === 'zh-HK' ? e.dest_tc : e.dest_sc;
        return {
          value: e.service_type,
          label: allSameOrig ? `${t('wizard.service')} ${e.service_type}` : `${orig} → ${dest}`,
        };
      });
      update({ serviceTypeOptions: opts, serviceType: opts[0]?.value || '1' });
    }
  };

  // ── Stop list ────────────────────────────────────────────────────────────────

  const loadStopList = async () => {
    const { type, route, direction, serviceType, region, routeId } = form;
    const upper = route.trim().toUpperCase();
    let stops = [];
    try {
      if (type === 'kmb') {
        const rsJson = await fetch(`${API.kmb}/route-stop/${upper}/${direction}/${serviceType}`).then(r => r.json());
        const ids = rsJson.data.map(s => s.stop);
        const names = await Promise.all(ids.map(id => fetch(`${API.kmb}/stop/${id}`).then(r => r.json())));
        stops = names.map((r, i) => ({
          id: r.data.stop, seq: i + 1,
          name_en: r.data.name_en, name_tc: r.data.name_tc, name_sc: r.data.name_sc,
        }));
      } else if (type === 'ctb') {
        const rsJson = await fetch(`${API.citybus}/route-stop/ctb/${upper}/${direction}`).then(r => r.json());
        const ids = rsJson.data.map(s => s.stop);
        const names = await Promise.all(ids.map(id => fetch(`${API.citybus}/stop/${id}`).then(r => r.json())));
        stops = names.map((r, i) => ({
          id: r.data.stop, seq: i + 1,
          name_en: r.data.name_en, name_tc: r.data.name_tc, name_sc: r.data.name_sc,
        }));
      } else if (type === 'gmb') {
        const rsJson = await fetch(`${API.gmb}/route-stop/${routeId}/${direction}`).then(r => r.json());
        stops = rsJson.data.route_stops.map(s => ({
          id: String(s.stop_id), seq: s.stop_seq,
          name_en: s.name_en, name_tc: s.name_tc, name_sc: s.name_sc,
        }));
      }
    } catch (e) {
      console.error('loadStopList failed', e);
    }
    update({ stopList: stops, fromStop: null, toStop: null });
  };

  // ── Build final config ───────────────────────────────────────────────────────

  const buildConfig = () => {
    const { type, route, direction, serviceType, fromStop, toStop, journeyDuration, line, fromStation, toStation, region } = form;
    switch (type) {
      case 'mtr':
        return {
          type,
          fromStation,
          ...(toStation ? { toStation } : { direction }),
        };
      case 'kmb':
        return {
          type, route: route.toUpperCase(), direction, serviceType, fromStop,
          ...(toStop    ? { toStop }    : {}),
          ...(journeyDuration  ? { journeyDuration }  : {}),
        };
      case 'ctb':
        return {
          type, route: route.toUpperCase(), direction, fromStop,
          ...(toStop    ? { toStop }    : {}),
          ...(journeyDuration  ? { journeyDuration }  : {}),
        };
      case 'gmb':
        return {
          type, region, route: route.toUpperCase(), direction, fromStop,
          ...(toStop    ? { toStop }    : {}),
          ...(journeyDuration  ? { journeyDuration }  : {}),
        };
      case 'timetable':
        return {
          type,
          name: form.ttName.trim(), from: form.ttFrom.trim(), to: form.ttTo.trim(),
          weekdays: ttWeekdays.times, holidays: ttHolidays.times,
          ...(journeyDuration  ? { journeyDuration }  : {}),
        };
      default:
        return { type };
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const stopName = (stop) => {
    if (!stop) return '';
    return lang === 'en' ? stop.name_en : lang === 'zh-HK' ? stop.name_tc : stop.name_sc;
  };

  const fromStopObj  = form.stopList.find(s => s.id === form.fromStop);
  const toStopOpts   = fromStopObj
    ? form.stopList.filter(s => s.seq > fromStopObj.seq)
    : form.stopList;

  const mtrStations  = getMtrStationList(form.line, lang);
  const mtrDirOpts   = getMtrDirOptions(form.line, lang, t);

  const mtrLines = Object.entries(mtrData.lines).map(([code, names]) => ({
    code,
    name: lang === 'en' ? names.en : lang === 'zh-HK' ? names.tc : names.sc,
  }));

  const dirLabel = (dir) =>
    [...form.directionOptions, ...mtrDirOpts].find(o => o.value === dir)?.label || dir;

  const stationName = (id) =>
    mtrStations.find(s => s.id === id)?.name || id;

  // ── Render step content ──────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 'operator':
        return (
          <div>
            <p className="text-muted small mb-3">{t('wizard.selectOperator')}</p>
            <div className="d-flex flex-wrap gap-2">
              {['mtr', 'kmb', 'ctb', 'gmb', 'timetable'].map(op => {
                const s = OPERATOR_STYLE[op];
                const selected = form.type === op;
                return (
                  <button
                    key={op}
                    className={`btn fw-bold${selected ? ' border border-3 border-dark' : ''}`}
                    style={{ background: s.bg, color: s.color, minWidth: 100, opacity: selected ? 1 : 0.7 }}
                    onClick={() => update({ type: op })}
                  >
                    {t(`company.${op === 'ctb' ? 'citybus' : op}`)}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'route':
        return (
          <div>
            <label className="form-label fw-semibold">{t('wizard.routeNumber')}</label>
            <input
              type="text"
              autoFocus
              className={`form-control form-control-lg${
                form.routeValid === true ? ' is-valid' : form.routeValid === false ? ' is-invalid' : ''
              }`}
              value={form.route}
              onChange={e => handleRouteInput(e.target.value)}
              placeholder="e.g. 98A"
            />
            {form.routeValidating && <div className="form-text">{t('wizard.validating')}</div>}
            {form.routeValid === true  && <div className="valid-feedback   d-block">{t('wizard.routeValid')}</div>}
            {form.routeValid === false && <div className="invalid-feedback d-block">{form.routeError}</div>}
          </div>
        );

      case 'region':
        return (
          <div>
            <p className="text-muted small mb-2">{t('wizard.selectRegion')}</p>
            <div className="d-flex gap-2">
              {form.regions.map(r => (
                <button
                  key={r}
                  className={`btn btn-lg${form.region === r ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => update({ region: r })}
                >
                  {t(`wizard.regions.${r}`)}
                </button>
              ))}
            </div>
          </div>
        );

      case 'direction':
        return (
          <div>
            <p className="text-muted small mb-2">{t('wizard.direction')}</p>
            <div className="d-flex flex-column gap-2">
              {form.directionOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`btn btn-lg text-start${form.direction === opt.value ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => handleDirectionSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'timetable': {
        const timesField = (key, label, parsed, hint) => (
          <div className="mb-3">
            <label className="form-label">{label}</label>
            <textarea
              className={`form-control${parsed.invalid.length ? ' is-invalid' : ''}`}
              rows="3"
              value={form[key]}
              onChange={e => update({ [key]: e.target.value })}
              placeholder="07:00, 07:30, 08:15"
            />
            {parsed.invalid.length > 0 ? (
              <div className="invalid-feedback">{t('wizard.timesInvalid', { list: parsed.invalid.join(', ') })}</div>
            ) : (
              <div className="form-text">
                {parsed.times.length > 0 ? t('wizard.timesCount', { count: parsed.times.length }) : hint}
              </div>
            )}
          </div>
        );
        return (
          <div className="text-start">
            <p className="text-muted small mb-3">{t('wizard.timetableHint')}</p>
            <div className="mb-3">
              <label className="form-label">{t('wizard.timetableName')}</label>
              <input
                type="text" className="form-control" maxLength="40" autoFocus
                value={form.ttName}
                onChange={e => update({ ttName: e.target.value })}
                placeholder={t('wizard.timetableNamePlaceholder')}
              />
            </div>
            <div className="row">
              <div className="col mb-3">
                <label className="form-label">{t('wizard.timetableFrom')}</label>
                <input
                  type="text" className="form-control" maxLength="40"
                  value={form.ttFrom}
                  onChange={e => update({ ttFrom: e.target.value })}
                />
              </div>
              <div className="col mb-3">
                <label className="form-label">{t('wizard.timetableTo')}</label>
                <input
                  type="text" className="form-control" maxLength="40"
                  value={form.ttTo}
                  onChange={e => update({ ttTo: e.target.value })}
                />
              </div>
            </div>
            {timesField('ttWeekdays', t('wizard.weekdayTimes'), ttWeekdays, t('wizard.timesHint'))}
            {timesField(
              'ttHolidays',
              <>{t('wizard.holidayTimes')} <span className="text-muted">({t('wizard.optional')})</span></>,
              ttHolidays,
              t('wizard.holidayTimesHint')
            )}
            <div>
              <label className="form-label">{t('wizard.journeyDuration')} <span className="text-muted">({t('wizard.optional')})</span></label>
              <input
                type="number" className="form-control" min="0" max="120"
                value={form.journeyDuration}
                onChange={e => update({ journeyDuration: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        );
      }

      case 'serviceType':
        return (
          <div>
            <p className="text-muted small mb-2">{t('wizard.serviceTypeHint')}</p>
            <div className="d-flex flex-column gap-2">
              {form.serviceTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`btn btn-lg text-start${form.serviceType === opt.value ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => update({ serviceType: opt.value, stopList: [], fromStop: null, toStop: null })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'stops':
        return (
          <div>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-secondary" />
                <p className="mt-2 text-muted">{t('wizard.stopsLoading')}</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('wizard.fromStop')}</label>
                  <select
                    className="form-select"
                    value={form.fromStop || ''}
                    onChange={e => update({ fromStop: e.target.value || null, toStop: null })}
                  >
                    <option value="">{t('wizard.select')}</option>
                    {form.stopList.map(s => (
                      <option key={s.id} value={s.id}>{stopName(s)}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    {t('wizard.toStop')} <span className="text-muted">({t('wizard.optional')})</span>
                  </label>
                  <select
                    className="form-select"
                    value={form.toStop || ''}
                    disabled={!form.fromStop}
                    onChange={e => update({ toStop: e.target.value || null })}
                  >
                    <option value="">{t('wizard.noPreference')}</option>
                    {toStopOpts.map(s => (
                      <option key={s.id} value={s.id}>{stopName(s)}</option>
                    ))}
                  </select>
                </div>
                {form.toStop && (
                  <div className="mb-3">
                    <label className="form-label">
                      {t('wizard.journeyDuration')} <span className="text-muted">({t('wizard.optional')})</span>
                    </label>
                    <input
                      type="number" className="form-control" min="0" max="120"
                      value={form.journeyDuration}
                      onChange={e => update({ journeyDuration: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'mtrLine':
        return (
          <div>
            <p className="text-muted small mb-2">{t('wizard.selectLine')}</p>
            <div className="d-flex flex-wrap gap-2">
              {mtrLines.map(l => (
                <button
                  key={l.code}
                  className={`btn${form.line === l.code ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => update({ line: l.code, fromStation: null, toStation: null, direction: null })}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        );

      case 'mtrStations': {
        const fromStationsFiltered = mtrStations;
        const toStationsFiltered   = mtrStations.filter(s => s.id !== form.fromStation);
        return (
          <div>
            <div className="mb-3">
              <label className="form-label fw-semibold">{t('wizard.fromStation')}</label>
              <select
                className="form-select"
                value={form.fromStation || ''}
                onChange={e => update({ fromStation: e.target.value || null, toStation: null, direction: null })}
              >
                <option value="">{t('wizard.select')}</option>
                {fromStationsFiltered.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">
                {t('wizard.toStation')} <span className="text-muted">({t('wizard.optional')})</span>
              </label>
              <select
                className="form-select"
                value={form.toStation || ''}
                onChange={e => update({ toStation: e.target.value || null, direction: null })}
              >
                <option value="">{t('wizard.noPreference')}</option>
                {toStationsFiltered.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {!form.toStation && (
              <div className="mb-3">
                <p className="text-muted small mb-2">{t('wizard.direction')}</p>
                <div className="d-flex flex-column gap-2">
                  {mtrDirOpts.map(opt => (
                    <button
                      key={opt.value}
                      className={`btn text-start${form.direction === opt.value ? ' btn-primary' : ' btn-outline-secondary'}`}
                      onClick={() => update({ direction: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'confirm': {
        const cfg = buildConfig();
        const rows = [
          [t('wizard.operator'),    t(`company.${cfg.type === 'ctb' ? 'citybus' : cfg.type}`)],
          cfg.name         && [t('wizard.timetableName'), cfg.name],
          cfg.from         && [t('wizard.timetableFrom'), cfg.from],
          cfg.to           && [t('wizard.timetableTo'),   cfg.to],
          cfg.weekdays     && [t('wizard.weekdayTimes'),  t('wizard.timesCount', { count: cfg.weekdays.length })],
          cfg.holidays?.length > 0 && [t('wizard.holidayTimes'), t('wizard.timesCount', { count: cfg.holidays.length })],
          cfg.route        && [t('wizard.routeNumber'), cfg.route],
          cfg.region       && [t('wizard.region'),      t(`wizard.regions.${cfg.region}`)],
          cfg.fromStation  && [t('wizard.fromStation'), stationName(cfg.fromStation)],
          cfg.toStation    && [t('wizard.toStation'),   stationName(cfg.toStation)],
          cfg.direction    && [t('wizard.direction'),   dirLabel(cfg.direction)],
          cfg.serviceType && cfg.serviceType !== '1' && [t('wizard.serviceType'), cfg.serviceType],
          cfg.fromStop     && [t('wizard.fromStop'),    stopName(form.stopList.find(s => s.id === cfg.fromStop))],
          cfg.toStop       && [t('wizard.toStop'),      stopName(form.stopList.find(s => s.id === cfg.toStop))],
          cfg.journeyDuration     && [t('wizard.journeyDuration'),    t('wizard.minutes', { count: cfg.journeyDuration })],
        ].filter(Boolean);

        return (
          <div>
            <p className="fw-semibold mb-3">{t('wizard.confirmTitle')}</p>
            <table className="table table-sm table-bordered">
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-muted" style={{ width: '40%' }}>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ── Modal shell ──────────────────────────────────────────────────────────────

  const isConfirm = step === 'confirm';

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, overflowY: 'auto' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('wizard.title')}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ minHeight: 200 }}>
            {renderStep()}
          </div>
          <div className="modal-footer">
            {step !== 'operator' && (
              <button className="btn btn-secondary" onClick={goBack} disabled={loading}>
                {t('wizard.back')}
              </button>
            )}
            <button className="btn btn-outline-secondary" onClick={onClose}>
              {t('wizard.cancel')}
            </button>
            {isConfirm ? (
              <button
                className="btn btn-success"
                onClick={() => { onAdd(buildConfig()); onClose(); }}
              >
                {t('wizard.confirm')}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={goNext}
                disabled={!canProceed() || loading}
              >
                {loading && <span className="spinner-border spinner-border-sm me-1" />}
                {t('wizard.next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
