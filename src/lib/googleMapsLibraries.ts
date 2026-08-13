// Shared across every useJsApiLoader() call in the app. @react-google-maps/api loads a
// single script tag behind the scenes, so every caller must request the same libraries
// array (and the same array reference, not just equal contents) — otherwise whichever
// component mounts first "wins" and later callers may find `google.maps.places`
// undefined, or the loader logs an "unintentional reload" warning.
export const GOOGLE_MAPS_LIBRARIES: 'places'[] = ['places'];
