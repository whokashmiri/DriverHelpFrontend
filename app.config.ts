import appJson from "./app.json";

export default {
  expo: {
    ...appJson.expo,

    plugins: [
      ...(appJson.expo.plugins ?? []),

      "@maplibre/maplibre-react-native",
      "@react-native-community/datetimepicker"
    ],
  },
};
