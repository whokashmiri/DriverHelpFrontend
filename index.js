/*
 * App entry point.
 *
 * The background location task MUST be defined before
 * anything else runs. When Android restarts the JS
 * process for a background location event (app swiped
 * away / closed), no screen or layout is rendered, so
 * defining the task inside a route file is not enough.
 */
import "./src/services/backgroundLocation";

import "expo-router/entry";
