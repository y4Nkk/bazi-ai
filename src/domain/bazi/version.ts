import { ruleCatalogFingerprint } from "./rules";
import { ASTRONOMY_MODEL_REVISION } from "./astronomy";
import { CALENDAR_MODEL_REVISION } from "./calendar";

/** One immutable version for every ZP-1 calendar, rule, and projection decision. */
export const ALGORITHM_VERSION = `zp-1.3.4-${ruleCatalogFingerprint()}-${ASTRONOMY_MODEL_REVISION}-${CALENDAR_MODEL_REVISION}`;
