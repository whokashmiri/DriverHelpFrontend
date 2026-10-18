import appJson from "./app.json";

export default {
  expo: {
    ...appJson.expo,
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/94655ac3-adb5-48e7-81d1-8c4047185f4a",
    },

    plugins: [
      ...(appJson.expo.plugins ?? []),

      "@maplibre/maplibre-react-native",
      "@react-native-community/datetimepicker",
    ],
  },
};
