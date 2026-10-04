import React, { useEffect, useState } from "react";
import { DateTime, Duration } from "luxon";
import { useTranslation } from "react-i18next";
import { updateLuxonLocale } from "../i18n/config";
import { API } from "../api";

function KMBPanelHeader({
  currentTime,
  lang,
  backgroundColor,
  route,
  stopsData,
  journeyDuration,
  hasRemarks,
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
    stopsData.length > 0 ? getLocalizedStopName(stopsData[0].data) : "N/A";

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
          colSpan={2 + (hasRemarks ? 1 : 0) + (journeyDuration > 0 && stopsData.length == 2 ? 1 : 0)}
          style={{ backgroundColor: backgroundColor }}
        >
          {`🚌 ${t("company.kmb")} ${route} @ ${fromStopText}`}
        </th>
      </tr>
      <tr>
        <th scope="col">{t("table.header.nextBus")}</th>
        <th scope="col">
          {stopsData.length == 2
            ? t("table.header.journey")
            : t("table.header.destination")}
        </th>
        {hasRemarks && <th scope="col">{t("table.header.remarks")}</th>}
        {journeyDuration > 0 && stopsData.length == 2 ? (
          <th scope="col">{t("table.header.estimatedOffTime")}</th>
        ) : (
          ""
        )}
      </tr>
    </thead>
  );
}

function KMBPanelBody({
  currentTime,
  lang,
  baseUrl,
  backgroundColor,
  route,
  fromStop,
  direction,
  stopsData,
  journeyDuration,
  serviceType,
  hasRemarks,
  onRemarksChange,
}) {
  const { t, i18n } = useTranslation();
  const [vehicles, setVehicles] = useState([]);

  const getLocalizedName = (data) => {
    if (!data) return "N/A";
    if (lang === "en") return data[`name_en`].toLowerCase();
    if (lang === "zh-HK") return data[`name_tc`];
    if (lang === "zh-CN") return data[`name_sc`];
    return data[`name_en`].toLowerCase();
  };

  const getLocalizedRemark = (vehicle) => {
    if (lang === "en") return vehicle.rmk_en;
    if (lang === "zh-HK") return vehicle.rmk_tc;
    if (lang === "zh-CN") return vehicle.rmk_sc;
    return vehicle.rmk_en;
  };

  const getJourneyText = (vehicle) => {
    if (stopsData.length === 2) {
      const fromText = getLocalizedName(stopsData[0].data);
      const toText = getLocalizedName(stopsData[1].data);
      return `${fromText} -> ${toText}`;
    } else if (stopsData.length === 1) {
      if (lang === "en") return vehicle.dest_en.toLowerCase();
      if (lang === "zh-HK") return vehicle.dest_tc;
      if (lang === "zh-CN") return vehicle.dest_sc;
      return vehicle.dest_en.toLowerCase();
    }
    return "N/A";
  };

  // Set i18n language and Luxon locale whenever lang prop changes
  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  const fetchVehiclesData = () => {
    const etaUrl = baseUrl + "/eta/" + fromStop + "/" + route + "/" + (serviceType || '1');
    fetch(etaUrl)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        // A stop served in both directions (e.g. a terminus) returns ETAs for both
        const dir = direction === "inbound" ? "I" : direction === "outbound" ? "O" : null;
        const vehicles = data.data.filter((v) => !dir || v.dir === dir);
        setVehicles(vehicles);
        onRemarksChange(vehicles.some(v => v.rmk_en?.trim() || v.rmk_tc?.trim() || v.rmk_sc?.trim()));
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
          const eta = vehicle.eta
            ? DateTime.fromISO(vehicle.eta, {
                zone: "Asia/Hong_Kong",
              })
            : null;

          return (
            <tr key={vehicle.eta_seq + vehicle.seq * 10}>
              <td>
                {eta
                  ? `${eta.toFormat("HH:mm:ss")} (${eta.toRelative()})`
                  : "N/A"}
              </td>
              <td className="text-capitalize">{getJourneyText(vehicle)}</td>
              {hasRemarks && <td>{getLocalizedRemark(vehicle)}</td>}
              {journeyDuration > 0 && stopsData.length == 2 ? (
                <td>
                  {eta &&
                    `${eta
                      .plus({ minutes: journeyDuration })
                      .toFormat("HH:mm:ss")} (${t("table.body.minutes", {
                      count: journeyDuration,
                    })})`}
                </td>
              ) : (
                ""
              )}
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan="4">{t("table.body.noBus")}</td>
        </tr>
      )}
    </tbody>
  );
}

export default function KMBPanel({
  currentTime,
  lang,
  route,
  fromStop,
  toStop,
  journeyDuration,
  direction,
  serviceType = '1',
}) {
  const [stopsData, setStopsData] = useState([]);
  const [hasRemarks, setHasRemarks] = useState(false);
  const baseUrl = API.kmb;
  const backgroundColor = "#d93934";

  const fetchStopsData = () => {
    const stopsUrl =
      fromStop && toStop
        ? [baseUrl + "/stop/" + fromStop, baseUrl + "/stop/" + toStop]
        : fromStop
        ? [baseUrl + "/stop/" + fromStop]
        : [];

    Promise.all(
      stopsUrl.map((url) =>
        url
          ? fetch(url).then((response) => response.json())
          : Promise.resolve(null)
      )
    )
      .then((data) => {
        setStopsData(data);
      })
      .catch((error) => {});
  };

  useEffect(() => {
    fetchStopsData();
  }, [currentTime]);

  return (
    <div className="App">
      <table
        className="table table-bordered align-middle"
        style={{ borderColor: backgroundColor }}
      >
        <KMBPanelHeader
          currentTime={currentTime}
          lang={lang}
          backgroundColor={backgroundColor}
          route={route}
          stopsData={stopsData}
          journeyDuration={journeyDuration}
          hasRemarks={hasRemarks}
        />
        <KMBPanelBody
          currentTime={currentTime}
          lang={lang}
          baseUrl={baseUrl}
          backgroundColor={backgroundColor}
          route={route}
          fromStop={fromStop}
          direction={direction}
          stopsData={stopsData}
          journeyDuration={journeyDuration}
          serviceType={serviceType}
          hasRemarks={hasRemarks}
          onRemarksChange={setHasRemarks}
        />
      </table>
    </div>
  );
}
