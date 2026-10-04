import React, { useEffect, useState } from "react";
import { DateTime, Duration } from "luxon";
import { useTranslation } from "react-i18next";
import { updateLuxonLocale } from "../i18n/config";
import { API } from "../api";
import mtrData from "../data/mtrData.json";
import mtrLogo from "../data/mtrLogo.svg";

const DIRECTION_MAP = {
  AEL: {
    en: { UP: "Airport", DOWN: "Hong Kong" },
    tc: { UP: "機場", DOWN: "香港" },
    sc: { UP: "机场", DOWN: "香港" },
  },
  EAL: {
    en: { UP: "North", DOWN: "South" },
    tc: { UP: "北", DOWN: "南" },
    sc: { UP: "北", DOWN: "南" },
  },
  ISL: {
    en: { UP: "East", DOWN: "West" },
    tc: { UP: "東", DOWN: "西" },
    sc: { UP: "东", DOWN: "西" },
  },
  KTL: {
    en: { UP: "East", DOWN: "West" },
    tc: { UP: "東", DOWN: "西" },
    sc: { UP: "东", DOWN: "西" },
  },
  SIL: {
    en: { UP: "South", DOWN: "North" },
    tc: { UP: "南", DOWN: "北" },
    sc: { UP: "南", DOWN: "北" },
  },
  TCL: {
    en: { UP: "West", DOWN: "East" },
    tc: { UP: "西", DOWN: "東" },
    sc: { UP: "西", DOWN: "东" },
  },
  TKL: {
    en: { UP: "North", DOWN: "South" },
    tc: { UP: "北", DOWN: "南" },
    sc: { UP: "北", DOWN: "南" },
  },
  TML: {
    en: { UP: "West", DOWN: "East" },
    tc: { UP: "西", DOWN: "東" },
    sc: { UP: "西", DOWN: "东" },
  },
  TWL: {
    en: { UP: "North", DOWN: "South" },
    tc: { UP: "北", DOWN: "南" },
    sc: { UP: "北", DOWN: "南" },
  },
};

const COLOR_MAP = {
  AEL: { fg: "white", bg: "#3e888c" },
  EAL: { fg: "black", bg: "#73c1e8" },
  ISL: { fg: "white", bg: "#3880c4" },
  KTL: { fg: "white", bg: "#53ad59" },
  SIL: { fg: "black", bg: "#c6cd3c" },
  TCL: { fg: "black", bg: "#f09651" },
  TKL: { fg: "white", bg: "#64459e" },
  TML: { fg: "white", bg: "#8e351d" },
  TWL: { fg: "black", bg: "#eb452e" },
};

const MTR_DEFAULT_COLORS = {
  fg: "white",
  bg: "#162547",
};

// Too dark to show against the dark theme; see .brand-dark in index.css
const tableClassName = (backgroundColor) =>
  "table table-bordered align-middle" +
  (backgroundColor === MTR_DEFAULT_COLORS.bg ? " brand-dark" : "");

function MTRPanelHeader({
  currentTime,
  lang,
  fromStation,
  toStation,
  direction,
  foregroundColor,
  backgroundColor,
  lineText,
  journeyDuration,
  printStationText,
}) {
  const { t, i18n } = useTranslation();
  const line = fromStation.split("-")[0];
  const station = fromStation.split("-")[1];

  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  const directionText =
    DIRECTION_MAP[line]?.[
      lang === "en" ? "en" : lang === "zh-HK" ? "tc" : "sc"
    ]?.[direction] || "";

  return (
    <thead>
      <tr>
        <th
          scope="col"
          colSpan="3"
          style={{ backgroundColor: backgroundColor, color: foregroundColor }}
        >
          <img src={mtrLogo} alt="" /> {lineText}
          {lineText != t("company.mtr") && directionText
            ? "(" + directionText + ")"
            : ""}{" "}
          @{" "}
          {printStationText(station)}
        </th>
      </tr>
      <tr>
        <th scope="col">{t("table.header.nextTrain")}</th>
        <th scope="col">
          {toStation
            ? t("table.header.journey")
            : t("table.header.destination")}
        </th>
        {journeyDuration > 0 && toStation ? (
          <th scope="col">{t("table.header.estimatedOffTime")}</th>
        ) : (
          ""
        )}
      </tr>
    </thead>
  );
}

function MTRPanelBody({
  currentTime,
  lang,
  fromStation,
  toStation,
  backgroundColor,
  journeyDuration,
  vehicles,
  printStationText,
}) {
  const { t, i18n } = useTranslation();
  const from = fromStation.split("-")[1];
  const to = toStation ? toStation.split("-")[1] : "";

  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  return (
    <tbody
      className="table-group-divider"
      style={{ borderTopColor: backgroundColor }}
    >
      {vehicles ? (
        vehicles.map((vehicle) => {
          return (
            <tr key={vehicle.seq}>
              <td>
                {DateTime.fromFormat(vehicle.time, "yyyy-MM-dd hh:mm:ss", {
                  zone: "Asia/Hong_Kong",
                }).toFormat("HH:mm:ss")}{" "}
                (
                {DateTime.fromFormat(vehicle.time, "yyyy-MM-dd hh:mm:ss", {
                  zone: "Asia/Hong_Kong",
                }).toRelative()}
                )
              </td>
              <td>
                {toStation
                  ? printStationText(from) + " -> " + printStationText(to)
                  : printStationText(vehicle.dest)}
              </td>
              {journeyDuration > 0 && toStation ? (
                <td>
                  {DateTime.fromFormat(vehicle.time, "yyyy-MM-dd hh:mm:ss", {
                    zone: "Asia/Hong_Kong",
                  })
                    .plus({ minutes: journeyDuration })
                    .toFormat("HH:mm:ss")}{" "}
                  ({t("table.body.minutes", { count: journeyDuration })})
                </td>
              ) : (
                ""
              )}
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan="3">{t("table.body.noTrain")}</td>
        </tr>
      )}
    </tbody>
  );
}

export default function MTRPanel({
  currentTime,
  lang,
  fromStation,
  toStation,
  direction,
}) {
  const { t, i18n } = useTranslation();
  const [vehicles, setVehicles] = useState([]);

  const printStationText = (inputStation) => {
    for (const line in mtrData.stations) {
      for (const direction in mtrData.stations[line]) {
        for (const station of mtrData.stations[line][direction]) {
          if (station.station == inputStation) {
            if (lang === "en") return station.name_en;
            if (lang === "zh-HK") return station.name_tc;
            return station.name_sc;
          }
        }
      }
    }
  };

  const calcLines = (inputStation) => {
    let lines = [];
    for (const line in mtrData.stations) {
      for (const direction in mtrData.stations[line]) {
        for (const station of mtrData.stations[line][direction]) {
          if (station.station == inputStation && !lines.includes(line)) {
            lines.push(line);
          }
        }
      }
    }
    return lines;
  };

  const calcDirection = (fromStationId, toStationId) => {
    for (const line in mtrData.stations) {
      for (const direction in mtrData.stations[line]) {
        const stations = mtrData.stations[line][direction];
        const fromIndex = stations.findIndex(
          (station) => station.stationId === fromStationId
        );
        const toIndex = stations.findIndex(
          (station) => station.stationId === toStationId
        );
        if (fromIndex < toIndex) {
          return direction;
        }
      }
    }
  };

  const baseUrl = API.mtr;
  const line = fromStation.split("-")[0];
  const station = fromStation.split("-")[1];
  let lineText, foregroundColor, backgroundColor;

  if (
    toStation &&
    line != toStation.split("-")[0] &&
    calcLines(station).filter((item) =>
      calcLines(toStation.split("-")[1]).includes(item)
    ).length == 0
  ) {
    lineText = t("company.mtr");
    foregroundColor = MTR_DEFAULT_COLORS.fg;
    backgroundColor = MTR_DEFAULT_COLORS.bg;
  } else {
    const lineInfo = mtrData.lines[line];
    lineText =
      lang === "en"
        ? lineInfo.en
        : lang === "zh-HK"
        ? lineInfo.tc
        : lineInfo.sc;

    foregroundColor = COLOR_MAP[line].fg;
    backgroundColor = COLOR_MAP[line].bg;
  }

  const [journeyDuration, setDuration] = useState([]);

  const getStationId = (inputStation) => {
    for (const line in mtrData.stations) {
      for (const direction in mtrData.stations[line]) {
        for (const station of mtrData.stations[line][direction]) {
          if (station.station == inputStation) {
            return station.stationId;
          }
        }
      }
    }
  };

  const fetchDurationData = () => {
    if (fromStation && toStation) {
      const from = getStationId(fromStation.split("-")[1]);
      const to = getStationId(toStation.split("-")[1]);

      const journeyDurationUrl =
        API.mtrDuration +
        "/?o=" +
        from +
        "&d=" +
        to +
        "&lang=" +
        (lang === "en" ? "E" : "C");

      fetch(journeyDurationUrl)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          setDuration(data.routes[0].time);
        });
    }
  };

  const fetchVehiclesData = () => {
    const etaUrl =
      baseUrl + "?line=" + line + "&sta=" + station + "&lang=" + lang;

    fetch(etaUrl)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        // mtrData uses CSV codes (UT/DT); the live API uses UP/DOWN
        const csvToApi = { UT: "UP", DT: "DOWN" };
        const resolvedDirection =
          direction ||
          (toStation
            ? csvToApi[
                calcDirection(
                  getStationId(fromStation.split("-")[1]),
                  getStationId(toStation.split("-")[1])
                )
              ]
            : undefined);
        let vehicles = data.data[fromStation][resolvedDirection];
        setVehicles(vehicles);
      });
  };

  useEffect(() => {
    fetchDurationData();
    fetchVehiclesData();
  }, [currentTime]);

  return (
    <div className="App">
      <table
        className={tableClassName(backgroundColor)}
        style={{ borderColor: backgroundColor }}
      >
        <MTRPanelHeader
          currentTime={currentTime}
          lang={lang}
          fromStation={fromStation}
          toStation={toStation}
          direction={direction}
          foregroundColor={foregroundColor}
          backgroundColor={backgroundColor}
          lineText={lineText}
          journeyDuration={journeyDuration}
          printStationText={printStationText}
        />
        <MTRPanelBody
          currentTime={currentTime}
          lang={lang}
          fromStation={fromStation}
          toStation={toStation}
          backgroundColor={backgroundColor}
          journeyDuration={journeyDuration}
          vehicles={vehicles}
          printStationText={printStationText}
        />
      </table>
    </div>
  );
}
