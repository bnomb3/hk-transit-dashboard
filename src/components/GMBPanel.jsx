import React, { useEffect, useState } from "react";
import { DateTime, Duration } from "luxon";
import { useTranslation } from "react-i18next";
import { updateLuxonLocale } from "../i18n/config";
import { API } from "../api";

function GMBPanelHeader({
  currentTime,
  lang,
  backgroundColor,
  route,
  routeData,
  stopsData,
  direction,
  journeyDuration,
}) {
  const { t, i18n } = useTranslation();

  const getLocalizedStopName = (data) => {
    if (!data) return "N/A";
    if (lang === "en") return data.name_en.toLowerCase();
    if (lang === "zh-HK") return data.name_tc;
    if (lang === "zh-CN") return data.name_sc;
    return data.name_en.toLowerCase();
  };

  const fromStopText =
    stopsData.length >= 1 ? getLocalizedStopName(stopsData[0]) : "N/A";

  // Set i18n language and Luxon locale whenever lang prop changes
  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  return (
    <thead>
      <tr>
        <th
          className="text-capitalize"
          scope="col"
          colSpan="4"
          style={{ color: "black", backgroundColor: backgroundColor }}
        >
          {`🚐 ${t("company.gmb")} ${route} @ ${fromStopText}`}
        </th>
      </tr>
      <tr>
        <th scope="col">{t("table.header.nextBus")}</th>
        <th scope="col">
          {stopsData.length == 2
            ? t("table.header.journey")
            : t("table.header.destination")}
        </th>
        <th scope="col">{t("table.header.remarks")}</th>
        {journeyDuration > 0 && stopsData.length == 2 ? (
          <th scope="col">{t("table.header.estimatedOffTime")}</th>
        ) : (
          ""
        )}
      </tr>
    </thead>
  );
}

function GMBPanelBody({
  currentTime,
  lang,
  baseUrl,
  backgroundColor,
  fromStop,
  routeData,
  stopsData,
  direction,
  journeyDuration,
}) {
  const { t, i18n } = useTranslation();
  const [vehicles, setVehicles] = useState([]);

  const getLocalizedName = (data) => {
    if (!data) return "N/A";
    if (lang === "en") return data.name_en.toLowerCase();
    if (lang === "zh-HK") return data.name_tc;
    if (lang === "zh-CN") return data.name_sc;
    return data.name_en.toLowerCase();
  };

  const getLocalizedDestination = (routeData, direction) => {
    if (!routeData || !routeData.directions) return "N/A";
    const directionData = routeData.directions.find(
      (route) => route.route_seq == direction
    );
    if (!directionData) return "N/A";
    if (lang === "en") return directionData.dest_en.toLowerCase();
    if (lang === "zh-HK") return directionData.dest_tc;
    if (lang === "zh-CN") return directionData.dest_sc;
    return directionData.dest_en.toLowerCase();
  };

  const getJourneyText = () => {
    if (stopsData.length == 2) {
      const fromText = getLocalizedName(stopsData[0]);
      const toText = getLocalizedName(stopsData[1]);
      return `${fromText} -> ${toText}`;
    } else if (stopsData.length == 1) {
      return getLocalizedDestination(routeData, direction);
    }
    return "N/A";
  };

  // Set i18n language and Luxon locale whenever lang prop changes
  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  const fetchVehiclesData = () => {
    const etaUrl =
      baseUrl + "/eta/route-stop/" + routeData.route_id + "/" + fromStop;

    fetch(etaUrl)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const vehicles = data.data.filter(
          (etas) => etas.route_seq == direction
        )[0].eta;
        setVehicles(vehicles);
      });
  };

  useEffect(() => {
    fetchVehiclesData();
  }, [currentTime]);

  return (
    <tbody
      className="table-group-divider"
      style={{ borderTopColor: backgroundColor }}
    >
      {vehicles.length > 0 ? (
        vehicles.map((vehicle) => {
          return (
            <tr
              key={vehicle.eta_seq}
              className={
                DateTime.fromISO(vehicle.timestamp).setZone("Asia/Hong_Kong") <
                DateTime.now().setZone("Asia/Hong_Kong")
                  ? "table-secondary text-secondary"
                  : ""
              }
            >
              <td>
                {DateTime.fromISO(vehicle.timestamp)
                  .setZone("Asia/Hong_Kong")
                  .toFormat("HH:mm:ss")}{" "}
                (
                {DateTime.fromISO(vehicle.timestamp)
                  .setZone("Asia/Hong_Kong")
                  .toRelative()}
                )
              </td>
              <td className="text-capitalize">{getJourneyText()}</td>
              <td>
                {(lang === "en"
                  ? vehicle.remarks_en
                  : lang === "zh-HK"
                  ? vehicle.remarks_tc
                  : vehicle.remarks_sc) || ""}
              </td>
              {journeyDuration > 0 && stopsData.length == 2 ? (
                <td>
                  {DateTime.fromISO(vehicle.timestamp)
                    .plus({ minutes: journeyDuration })
                    .setZone("Asia/Hong_Kong")
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
          <td colSpan="4">{t("table.body.noMiniBus")}</td>
        </tr>
      )}
    </tbody>
  );
}

export default function GMBPanel({
  currentTime,
  lang,
  region,
  route,
  fromStop,
  toStop,
  direction,
  journeyDuration,
}) {
  const { t } = useTranslation();
  const [routeData, setRouteData] = useState([]);
  const [stopsData, setStopsData] = useState([]);

  const baseUrl = API.gmb;
  const backgroundColor = "#4da94d";

  const fetchData = () => {
    const routeUrl = baseUrl + "/route/" + region + "/" + route;

    fetch(routeUrl)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const stopsUrl =
          baseUrl + "/route-stop/" + data.data[0].route_id + "/" + direction;
        setRouteData(data.data[0]);
        return fetch(stopsUrl);
      })
      .then((response) => response.json())
      .then((data) => {
        let stopsData = data.data.route_stops
          .filter(
            (stop) =>
              stop.stop_id == fromStop || stop.stop_id == toStop
          )
          .sort((a, b) => a.stop_seq - b.stop_seq);
        setStopsData(stopsData);
      });
  };

  useEffect(() => {
    fetchData();
  }, [currentTime]);

  return (
    <div className="App">
      {routeData.route_id && stopsData.length > 0 ? (
        <table
          className="table table-bordered align-middle"
          style={{ borderColor: backgroundColor }}
        >
          <GMBPanelHeader
            currentTime={currentTime}
            lang={lang}
            backgroundColor={backgroundColor}
            route={route}
            routeData={routeData}
            stopsData={stopsData}
            direction={direction}
            journeyDuration={journeyDuration}
          />
          <GMBPanelBody
            currentTime={currentTime}
            lang={lang}
            baseUrl={baseUrl}
            backgroundColor={backgroundColor}
            fromStop={fromStop}
            routeData={routeData}
            stopsData={stopsData}
            direction={direction}
            journeyDuration={journeyDuration}
          />
        </table>
      ) : (
        <table
          className="table table-bordered align-middle"
          style={{ borderColor: backgroundColor }}
        >
          <GMBPanelHeader
            currentTime={currentTime}
            lang={lang}
            backgroundColor={backgroundColor}
            route={route}
            stopsData={[
              { name_en: "Loading", name_tc: "載入中", name_sc: "载入中" },
            ]}
          />
          <tbody
            className="table-group-divider"
            style={{ borderTopColor: backgroundColor }}
          >
            <tr>
              <td colSpan="4">{t("table.body.loading")}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
