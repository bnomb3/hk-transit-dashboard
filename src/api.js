// Upstream open-data endpoints. All of them send `Access-Control-Allow-Origin: *`,
// so a static production build (e.g. GitHub Pages) calls them directly.
// In development the same paths are served by the Vite proxy in vite.config.js.
const UPSTREAM = {
  mtr: "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php",
  mtrDuration: "https://www.mtr.com.hk/share/customer/jp/api/HRRoutes",
  citybus: "https://rt.data.gov.hk/v2/transport/citybus",
  kmb: "https://data.etabus.gov.hk/v1/transport/kmb",
  gmb: "https://data.etagmb.gov.hk",
};

const PROXY = {
  mtr: "/api/mtr",
  mtrDuration: "/api/mtr-duration",
  citybus: "/api/citybus",
  kmb: "/api/kmb",
  gmb: "/api/gmb",
};

export const API = import.meta.env.PROD ? UPSTREAM : PROXY;
