export const IRAS_PORTAL_URL = "https://iras.iocliras.in/";

export const DSR_REPORT_UPDATE_URL_FRAGMENT = "apps.iocliras.in/iras-portal/dsrreportupdate";

/** Local persistent browser profile — keeps IRAS login session on disk, not in the app DB. */
export const IRAS_BROWSER_PROFILE_DIR = ".iras-browser-profile";

/** How long to wait for the user to submit the DSR form before timing out. */
export const DSR_CAPTURE_TIMEOUT_MS = 30 * 60 * 1000;

/** Per-job timeout while waiting for dsrreportupdate during batch capture. */
export const DSR_BATCH_JOB_TIMEOUT_MS = 3 * 60 * 1000;

/** Retry transient batch failures (timeout / 401) before marking a job failed. */
export const DSR_BATCH_JOB_MAX_ATTEMPTS = 2;
