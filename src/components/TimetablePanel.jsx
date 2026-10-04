import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { updateLuxonLocale } from "../i18n/config";
import publicHolidays from "../data/publicHolidays.json";

export default function TimetablePanel({
  currentTime,
  lang,
  name,
  from,
  to,
  weekdays = [],
  holidays = [],
  journeyDuration,
}) {
  const [departures, setDepartures] = useState([]);
  const { t, i18n } = useTranslation();
  const backgroundColor = "#ab64a8";
  const showOffTime = journeyDuration > 0;

  // Set i18n language and Luxon locale whenever lang prop changes
  useEffect(() => {
    i18n.changeLanguage(lang);
    updateLuxonLocale(lang);
  }, [lang]);

  const isHoliday = (theDate) =>
    theDate.weekday === 6 ||
    theDate.weekday === 7 ||
    publicHolidays.includes(theDate.toFormat("yyyyMMdd"));

  const calcNextDepartures = () => {
    const now = DateTime.now().setZone("Asia/Hong_Kong");
    // An empty holiday timetable means the weekday one applies every day
    const times = isHoliday(now) && holidays.length > 0 ? holidays : weekdays;
    return times
      .map((time) =>
        DateTime.fromFormat(time, "HH:mm", { zone: "Asia/Hong_Kong" })
      )
      .sort((a, b) => a - b)
      .filter((time) =>
        showOffTime ? time.plus({ minutes: journeyDuration }) > now : time > now
      )
      .slice(0, 4);
  };

  useEffect(() => {
    setDepartures(calcNextDepartures());
  }, [currentTime, lang, weekdays, holidays, journeyDuration]);

  return (
    <div className="App">
      <table
        className="table table-bordered align-middle"
        style={{ borderColor: backgroundColor }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              colSpan={showOffTime ? 3 : 2}
              style={{ color: "black", backgroundColor: backgroundColor }}
            >
              {`🚍 ${name} @ ${from}`}
            </th>
          </tr>
          <tr>
            <th scope="col">{t("table.header.nextDeparture")}</th>
            <th scope="col">{t("table.header.journey")}</th>
            {showOffTime && (
              <th scope="col">{t("table.header.estimatedOffTime")}</th>
            )}
          </tr>
        </thead>
        <tbody
          className="table-group-divider"
          style={{ borderTopColor: backgroundColor }}
        >
          {departures.length > 0 ? (
            departures.map((departure) => (
              <tr
                key={departure.toMillis()}
                className={
                  departure < DateTime.now()
                    ? "table-secondary text-secondary"
                    : ""
                }
              >
                <td>
                  {departure.toFormat("HH:mm")} ({departure.toRelative()})
                </td>
                <td>{`${from} -> ${to}`}</td>
                {showOffTime && (
                  <td>
                    {departure
                      .plus({ minutes: journeyDuration })
                      .toFormat("HH:mm:ss")}{" "}
                    ({t("table.body.minutes", { count: journeyDuration })})
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showOffTime ? 3 : 2}>
                {t("table.body.noDeparture")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
