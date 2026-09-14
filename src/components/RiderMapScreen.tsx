import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function RiderMapScreen() {
  const rider = {
    name: "Ahmed",
    latitude: 24.7136,
    longitude: 46.6753,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: rider.latitude,
          longitude: rider.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{
            latitude: rider.latitude,
            longitude: rider.longitude,
          }}
          title={rider.name}
        />
      </MapView>

      <View style={styles.card}>
        <Text style={styles.name}>{rider.name}</Text>
        <Text style={styles.text}>Rider location</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  card: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 90,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
  },

  text: {
    marginTop: 4,
    color: "#64748b",
  },
});
