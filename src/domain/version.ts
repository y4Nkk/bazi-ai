/**
 * Deterministic engine identity. Every ChartSnapshot carries these versions.
 * A calculation change increments ENGINE_VERSION; a scoring rubric change
 * increments SCORING_PROFILE_VERSION. Historical output never changes silently.
 */
export const ENGINE_VERSION = "1.0.0";
