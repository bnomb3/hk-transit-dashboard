import "./App.css";
import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { REFRESH_INTERVAL_MS } from "./config";
import { updateLuxonLocale } from "./i18n/config";
import { usePanels } from "./hooks/usePanels";
import { useTheme } from "./hooks/useTheme";
import PanelWrapper from "./components/PanelWrapper";
import AddPanelModal, { OPERATOR_STYLE } from "./components/wizard/AddPanelModal";

import CTBPanel from "./components/CTBPanel";
import KMBPanel from "./components/KMBPanel";
import GMBPanel from "./components/GMBPanel";
import MTRPanel from "./components/MTRPanel";
import TimetablePanel from "./components/TimetablePanel";

function renderPanel(config, currentTime, lang) {
  const common = { currentTime, lang };
  switch (config.type) {
    case "mtr":
      return (
        <MTRPanel
          {...common}
          fromStation={config.fromStation}
          toStation={config.toStation}
          direction={config.direction}
        />
      );
    case "kmb":
      return (
        <KMBPanel
          {...common}
          route={config.route}
          fromStop={config.fromStop}
          toStop={config.toStop}
          direction={config.direction}
          serviceType={config.serviceType}
          journeyDuration={config.journeyDuration}
        />
      );
    case "ctb":
      return (
        <CTBPanel
          {...common}
          route={config.route}
          fromStop={config.fromStop}
          toStop={config.toStop}
          direction={config.direction}
          journeyDuration={config.journeyDuration}
        />
      );
    case "gmb":
      return (
        <GMBPanel
          {...common}
          region={config.region}
          route={config.route}
          fromStop={config.fromStop}
          toStop={config.toStop}
          direction={config.direction}
          journeyDuration={config.journeyDuration}
        />
      );
    case "timetable":
      return (
        <TimetablePanel
          {...common}
          name={config.name}
          from={config.from}
          to={config.to}
          weekdays={config.weekdays}
          holidays={config.holidays}
          journeyDuration={config.journeyDuration}
        />
      );
    default:
      return null;
  }
}

function Dashboard({ currentTime, lang, setLang }) {
  const { t, i18n } = useTranslation();
  const { panels, addPanel, removePanel, reorderPanels } = usePanels();
  const [editMode,   setEditMode]   = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      reorderPanels(active.id, over.id);
    }
  };

  return (
    <div className="container text-center">
      {/* Header */}
      <div className="row align-items-center">
        <div className="col-12 col-xl-7 my-2 my-xl-3 h3 d-flex flex-column align-items-center align-items-xl-start row-gap-1">
          <span>{t("dashboard.title")}</span>
          <span className="d-inline-flex flex-wrap justify-content-center gap-1 fs-6">
            {Object.entries(OPERATOR_STYLE).map(([op, s]) => (
              <span
                key={op}
                className={`badge${s.className ? ` ${s.className}` : ""}`}
                style={{ background: s.bg, color: s.color }}
              >
                {t(`company.${op === "ctb" ? "citybus" : op}`)}
              </span>
            ))}
          </span>
        </div>
        <div className="col-12 col-xl-5 text-xl-end mt-1 mb-3 my-xl-3">
          <div>
            <span className="d-block d-sm-inline">
              {t("dashboard.lastUpdated")}:{" "}
            </span>
            <span className="fw-bold">
              {DateTime.now()
                .setZone("Asia/Hong_Kong")
                .toLocaleString({
                  ...DateTime.DATETIME_MED_WITH_SECONDS,
                  hourCycle: "h23",
                  timeZoneName: "short",
                })}
            </span>
          </div>
          <div className="mt-2 d-flex flex-wrap justify-content-center justify-content-xl-end gap-2">
            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm w-auto"
                aria-label={t("dashboard.language")}
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">En</option>
                <option value="zh-HK">繁</option>
                <option value="zh-CN">简</option>
              </select>
              <select
                className="form-select form-select-sm w-auto"
                aria-label={t("dashboard.theme")}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">{t("theme.system")}</option>
                <option value="light">{t("theme.light")}</option>
                <option value="dark">{t("theme.dark")}</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm${editMode ? " btn-warning" : " btn-outline-secondary"}`}
                onClick={() => setEditMode((m) => !m)}
              >
                {editMode ? t("wizard.done") : t("wizard.editPanels")}
              </button>
              {!editMode && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => setShowWizard(true)}
                >
                  {t("wizard.addPanel")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={panels.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="row row-cols-1 row-cols-md-2">
            {panels.map((panel) => (
              <PanelWrapper
                key={panel.id}
                id={panel.id}
                editMode={editMode}
                onDelete={removePanel}
              >
                {renderPanel(panel, currentTime, lang)}
              </PanelWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Wizard modal */}
      {showWizard && (
        <AddPanelModal
          lang={lang}
          onAdd={addPanel}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return <Dashboard currentTime={currentTime} lang={lang} setLang={setLang} />;
}
