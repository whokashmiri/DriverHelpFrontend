import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Rider = {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "Delivering";
  vehicle: string;
  top: `${number}%`;
  left: `${number}%`;
};

export default function MapsScreen() {
  const router = useRouter();

  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);

  const riders: Rider[] = [
    {
      id: "1",
      name: "محمد علي",
      phone: "0501234567",
      status: "Available",
      vehicle: "تويوتا هايلكس",
      top: "25%",
      left: "20%",
    },
    {
      id: "2",
      name: "خالد أحمد",
      phone: "0559876543",
      status: "Delivering",
      vehicle: "هيونداي H1",
      top: "45%",
      left: "65%",
    },
    {
      id: "3",
      name: "عبدالله عمر",
      phone: "0531112233",
      status: "Available",
      vehicle: "نيسان أورفان",
      top: "70%",
      left: "35%",
    },
  ];

  function getStatusText(status: Rider["status"]) {
    return status === "Available" ? "متاح" : "في توصيل";
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>خريطة السائقين</Text>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>العودة</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>اضغط على أحد السائقين لعرض التفاصيل</Text>
      </View>

      <View style={styles.map}>
        <View style={styles.roadHorizontal} />
        <View style={styles.roadVertical} />
        <View style={styles.roadHorizontalTwo} />

        <View style={styles.cityBadge}>
          <Text style={styles.cityText}>الرياض</Text>
        </View>

        {riders.map((rider) => {
          const isSelected = selectedRider?.id === rider.id;

          return (
            <TouchableOpacity
              key={rider.id}
              activeOpacity={0.85}
              onPress={() => setSelectedRider(rider)}
              style={[
                styles.marker,
                {
                  top: rider.top,
                  left: rider.left,
                },
                isSelected && styles.selectedMarker,
              ]}
            >
              <Text style={styles.markerText}>{rider.name.charAt(0)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.detailsContainer}>
        {selectedRider ? (
          <>
            <View style={styles.detailsHeader}>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{selectedRider.name}</Text>

                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />

                  <Text style={styles.status}>
                    {getStatusText(selectedRider.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.riderNumber}>
                <Text style={styles.riderNumberLabel}>رقم السائق</Text>

                <Text style={styles.riderId}>#{selectedRider.id}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.label}>رقم الجوال</Text>

                <Text style={styles.value}>{selectedRider.phone}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.label}>المركبة</Text>

                <Text style={styles.value}>{selectedRider.vehicle}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>لم يتم اختيار سائق</Text>

            <Text style={styles.emptyText}>
              اضغط على أحد السائقين في الخريطة لعرض بياناته
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D0E5D5",
    paddingTop: 58,
  },

  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },

  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  back: {
    fontSize: 12,
    fontWeight: "800",
    color: "#634B66",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#9590A8",
    textAlign: "right",
  },

  map: {
    height: 260,
    marginHorizontal: 16,
    backgroundColor: "#BBCBCB",
    borderRadius: 18,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#9590A8",
  },

  cityBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  cityText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#634B66",
  },

  roadHorizontal: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: "#F7F7F7",
    transform: [{ rotate: "-8deg" }],
  },

  roadHorizontalTwo: {
    position: "absolute",
    top: "65%",
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: "#F7F7F7",
    transform: [{ rotate: "10deg" }],
  },

  roadVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "52%",
    width: 12,
    backgroundColor: "#F7F7F7",
    transform: [{ rotate: "5deg" }],
  },

  marker: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#634B66",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#9590A8",
  },

  markerText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  detailsContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minHeight: 95,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBCBCB",
  },

  detailsHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  riderInfo: {
    alignItems: "flex-end",
  },

  riderName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  statusRow: {
    marginTop: 5,
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#634B66",
    marginLeft: 5,
  },

  status: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9590A8",
  },

  riderNumber: {
    alignItems: "flex-start",
  },

  riderNumberLabel: {
    fontSize: 9,
    color: "#9590A8",
  },

  riderId: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: "#634B66",
  },

  divider: {
    height: 1,
    backgroundColor: "#BBCBCB",
    marginVertical: 12,
  },

  detailsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },

  detailItem: {
    flex: 1,
    alignItems: "flex-end",
    backgroundColor: "#D0E5D5",
    padding: 10,
    borderRadius: 10,
  },

  label: {
    fontSize: 9,
    color: "#9590A8",
    fontWeight: "700",
    textAlign: "right",
  },

  value: {
    marginTop: 4,
    fontSize: 12,
    color: "#634B66",
    fontWeight: "800",
    textAlign: "right",
  },

  emptyContainer: {
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#634B66",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: "#9590A8",
  },
});
