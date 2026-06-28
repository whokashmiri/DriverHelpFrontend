import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  completeOrderDelivery,
  createPickupOrder,
  getActiveOrder,
  getMyOrders
} from "@/api/orderApi";

type OrderPhoto = {
  uri: string;
  time: Date;
};

type BackendOrder = {
  _id: string;
  status: "picked_up" | "delivered";
  pickupPhoto?: {
    url: string;
    publicId: string;
    takenAt: string;
  };
  deliveryPhoto?: {
    url: string;
    publicId: string;
    takenAt: string;
  } | null;
  pickupTime?: string;
  deliveryTime?: string | null;
  durationSeconds?: number | null;
};

export default function TabTwoScreen() {
  const [showOrderCard, setShowOrderCard] = useState(false);

  const [activeOrder, setActiveOrder] = useState<BackendOrder | null>(null);

  const [pickupPhoto, setPickupPhoto] = useState<OrderPhoto | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<OrderPhoto | null>(null);

  const [loadingActiveOrder, setLoadingActiveOrder] = useState(true);
  const [uploadingPickup, setUploadingPickup] = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);


  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

 useEffect(() => {
  loadScreenData();
}, []);


  function safeDate(value?: string | null) {
  if (!value) return new Date();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
  async function loadActiveOrder() {
    setLoadingActiveOrder(true);

    try {
      const response = await getActiveOrder();

      if (response?.order) {
        const order: BackendOrder = response.order;

        setActiveOrder(order);
        setShowOrderCard(true);

        if (order.pickupPhoto?.url) {
         setPickupPhoto({
  uri: order.pickupPhoto.url,
  time: safeDate(order.pickupPhoto.takenAt || order.pickupTime),
});
        }

        if (order.deliveryPhoto?.url) {
          setDeliveryPhoto({
            uri: order.deliveryPhoto.url,
            time: safeDate(order.deliveryPhoto.takenAt || order.deliveryTime),
          });
        }
      }
    } catch (error: any) {
      console.log("Load active order error:", error?.response?.data || error);
    } finally {
      setLoadingActiveOrder(false);
    }
  }

  async function openCamera(type: "pickup" | "delivery") {
    if (type === "delivery" && !activeOrder) {
      Alert.alert("Pickup required", "Please upload pickup photo first.");
      return;
    }

    if (type === "delivery" && activeOrder?.status === "delivered") {
      Alert.alert("Already delivered", "This order is already completed.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera permission required",
        "Please allow camera access to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    });

    if (result.canceled) return;

    const photo: OrderPhoto = {
      uri: result.assets[0].uri,
      time: new Date(),
    };

    if (type === "pickup") {
      await handlePickupUpload(photo);
      return;
    }

    await handleDeliveryUpload(photo);
  }

  async function handlePickupUpload(photo: OrderPhoto) {
    setUploadingPickup(true);

    try {
      setPickupPhoto(photo);
      setDeliveryPhoto(null);

      const response = await createPickupOrder({
        pickupPhoto: photo,
      });

      const order: BackendOrder = response.order;

      setActiveOrder(order);
      await loadScreenData();

      if (order.pickupPhoto?.url) {
        setPickupPhoto({
          uri: order.pickupPhoto.url,
          time: safeDate(order.pickupPhoto.takenAt || order.pickupTime),
        });
      }

      Alert.alert("Pickup saved", "Pickup photo uploaded successfully.");
    } catch (error: any) {
      setPickupPhoto(null);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to upload pickup photo.";

      Alert.alert("Upload Failed", message);
    } finally {
      setUploadingPickup(false);
    }
  }


  async function loadScreenData() {
  setLoadingActiveOrder(true);
  setLoadingOrders(true);

  try {
    const [activeResponse, ordersResponse] = await Promise.all([
      getActiveOrder(),
      getMyOrders(),
    ]);

    if (activeResponse?.order) {
      const order: BackendOrder = activeResponse.order;

      setActiveOrder(order);
      setShowOrderCard(true);

      if (order.pickupPhoto?.url) {
        setPickupPhoto({
          uri: order.pickupPhoto.url,
          time: safeDate(order.pickupPhoto.takenAt || order.pickupTime),
        });
      }

      if (order.deliveryPhoto?.url) {
        setDeliveryPhoto({
          uri: order.deliveryPhoto.url,
          time: safeDate(order.deliveryPhoto.takenAt || order.deliveryTime),
        });
      }
    } else {
      setActiveOrder(null);
      setPickupPhoto(null);
      setDeliveryPhoto(null);
      setShowOrderCard(false);
    }

    setOrders(ordersResponse?.orders || []);
  } catch (error: any) {
    console.log("Load orders error:", error?.response?.data || error);
  } finally {
    setLoadingActiveOrder(false);
    setLoadingOrders(false);
  }
}
  async function handleDeliveryUpload(photo: OrderPhoto) {
    if (!activeOrder?._id) {
      Alert.alert("No active order", "Please upload pickup photo first.");
      return;
    }

    setUploadingDelivery(true);

    try {
      setDeliveryPhoto(photo);

      const response = await completeOrderDelivery({
        orderId: activeOrder._id,
        deliveryPhoto: photo,
      });

      const updatedOrder: BackendOrder = response.order;

      setActiveOrder(updatedOrder);
      await loadScreenData();

      if (updatedOrder.deliveryPhoto?.url) {
        setDeliveryPhoto({
          uri: updatedOrder.deliveryPhoto.url,
          time: safeDate(
            updatedOrder.deliveryPhoto.takenAt || updatedOrder.deliveryTime
          ),
        });
      }

      Alert.alert("Delivered", "Delivery photo uploaded successfully.");
    } catch (error: any) {
      setDeliveryPhoto(null);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to upload delivery photo.";

      Alert.alert("Upload Failed", message);
    } finally {
      setUploadingDelivery(false);
    }
  }

  function formatTime(date?: Date) {
    if (!date) return "--";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getDurationText() {
    if (activeOrder?.durationSeconds != null) {
      return formatDuration(activeOrder.durationSeconds);
    }

    if (!pickupPhoto || !deliveryPhoto) {
      return activeOrder ? "In progress" : "Waiting";
    }

    const diffMs = deliveryPhoto.time.getTime() - pickupPhoto.time.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    return formatDuration(totalSeconds);
  }

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  }

  function createOrder() {
    setActiveOrder(null);
    setPickupPhoto(null);
    setDeliveryPhoto(null);
    setShowOrderCard(true);
  }

  function resetLocalCard() {
    setActiveOrder(null);
    setPickupPhoto(null);
    setDeliveryPhoto(null);
    setShowOrderCard(false);
  }

  const isDelivered = activeOrder?.status === "delivered";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>

          <Text style={styles.subtitle}>
            Take pickup photo first. Delivery photo will update the same order.
          </Text>
        </View>

        {loadingActiveOrder && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Loading...</Text>
            <Text style={styles.emptyText}>Checking active order.</Text>
          </View>
        )}

        {!loadingActiveOrder && !showOrderCard && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active order</Text>

            <Text style={styles.emptyText}>
              Tap Add Order to start tracking.
            </Text>
          </View>
        )}

        {!loadingActiveOrder && showOrderCard && (
          <View style={styles.card}>
            <View style={styles.compactTopRow}>
              <View style={styles.compactTitleBox}>
                <Text style={styles.cardTitle}>
                  {isDelivered ? "Delivered" : "New Order"}
                </Text>

                <Text style={styles.durationText}>{getDurationText()}</Text>

                {activeOrder?._id && (
                  <Text style={styles.orderIdText}>
                    #{activeOrder._id.slice(-6)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openCamera("pickup")}
                disabled={uploadingPickup || uploadingDelivery || !!activeOrder}
                style={[
                  styles.smallPhotoButton,
                  !!activeOrder && styles.disabledPhotoButton,
                ]}
              >
                <View style={styles.smallImageBox}>
                  {pickupPhoto ? (
                    <Image
                      source={{ uri: pickupPhoto.uri }}
                      style={styles.smallImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.photoIcon}>📦</Text>
                  )}
                </View>

                <Text style={styles.smallPhotoLabel}>Pickup</Text>

                <Text style={styles.smallPhotoTime}>
                  {uploadingPickup
                    ? "Saving..."
                    : pickupPhoto
                      ? formatTime(pickupPhoto.time)
                      : "Take"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openCamera("delivery")}
                disabled={
                  uploadingPickup ||
                  uploadingDelivery ||
                  !activeOrder ||
                  isDelivered
                }
                style={[
                  styles.smallPhotoButton,
                  (!activeOrder || isDelivered) && styles.disabledPhotoButton,
                ]}
              >
                <View style={styles.smallImageBox}>
                  {deliveryPhoto ? (
                    <Image
                      source={{ uri: deliveryPhoto.uri }}
                      style={styles.smallImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.photoIcon}>🏁</Text>
                  )}
                </View>

                <Text style={styles.smallPhotoLabel}>Deliver</Text>

                <Text style={styles.smallPhotoTime}>
                  {uploadingDelivery
                    ? "Saving..."
                    : deliveryPhoto
                      ? formatTime(deliveryPhoto.time)
                      : "Take"}
                </Text>
              </TouchableOpacity>

              <Pressable onPress={resetLocalCard} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
        )}


        <View style={styles.historySection}>
  <Text style={styles.historyTitle}>Order History</Text>

  {loadingOrders && (
    <Text style={styles.historyEmptyText}>Loading orders...</Text>
  )}

  {!loadingOrders && orders.length === 0 && (
    <Text style={styles.historyEmptyText}>No completed orders yet.</Text>
  )}

  {!loadingOrders &&
    orders.map((order) => {
      const isCompleted = order.status === "delivered";

      return (
        <View key={order._id} style={styles.historyCard}>
          <View style={styles.historyInfo}>
            <Text style={styles.historyStatus}>
              {isCompleted ? "Delivered" : "In Progress"}
            </Text>

            <Text style={styles.historyId}>#{order._id.slice(-6)}</Text>

            <Text style={styles.historyTime}>
              Pickup: {formatTime(safeDate(order.pickupTime))}
            </Text>

            {order.deliveryTime && (
              <Text style={styles.historyTime}>
                Delivery: {formatTime(safeDate(order.deliveryTime))}
              </Text>
            )}

            <Text style={styles.historyDuration}>
              {order.durationSeconds != null
                ? formatDuration(order.durationSeconds)
                : "In progress"}
            </Text>
          </View>

          <View style={styles.historyImages}>
            {order.pickupPhoto?.url && (
              <Image
                source={{ uri: order.pickupPhoto.url }}
                style={styles.historyImage}
                contentFit="cover"
              />
            )}

            {order.deliveryPhoto?.url && (
              <Image
                source={{ uri: order.deliveryPhoto.url }}
                style={styles.historyImage}
                contentFit="cover"
              />
            )}
          </View>
        </View>
      );
    })}
</View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={createOrder}
        disabled={uploadingPickup || uploadingDelivery}
        style={styles.floatingButton}
      >
        <Text style={styles.floatingPlus}>+</Text>
        <Text style={styles.floatingText}>Add Order</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 128,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 20,
    padding: 24,
  },

  emptyTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },

  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    color: "#64748b",
  },

  card: {
    minHeight: 100,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  compactTopRow: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  compactTitleBox: {
    flex: 1,
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  durationText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#2563eb",
  },

  orderIdText: {
    marginTop: 2,
    fontSize: 9,
    color: "#94a3b8",
  },

  smallPhotoButton: {
    width: 74,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },

  disabledPhotoButton: {
    opacity: 0.65,
  },

  smallImageBox: {
    width: 38,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },

  smallImage: {
    width: "100%",
    height: "100%",
  },

  photoIcon: {
    fontSize: 21,
  },

  smallPhotoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1e293b",
  },

  smallPhotoTime: {
    marginTop: 1,
    fontSize: 9,
    color: "#64748b",
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#64748b",
    lineHeight: 20,
  },

  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 32,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#2563eb",
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },

  floatingPlus: {
    marginRight: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
  },

  floatingText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },


  historySection: {
  marginTop: 22,
},

historyTitle: {
  marginBottom: 10,
  fontSize: 18,
  fontWeight: "800",
  color: "#0f172a",
},

historyEmptyText: {
  fontSize: 13,
  color: "#64748b",
},

historyCard: {
  marginBottom: 10,
  minHeight: 86,
  borderRadius: 18,
  backgroundColor: "#ffffff",
  padding: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 3,
  },
  elevation: 3,
},

historyInfo: {
  flex: 1,
  paddingRight: 10,
},

historyStatus: {
  fontSize: 13,
  fontWeight: "800",
  color: "#0f172a",
},

historyId: {
  marginTop: 2,
  fontSize: 10,
  color: "#94a3b8",
},

historyTime: {
  marginTop: 2,
  fontSize: 10,
  color: "#64748b",
},

historyDuration: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "800",
  color: "#2563eb",
},

historyImages: {
  flexDirection: "row",
  gap: 6,
},

historyImage: {
  width: 42,
  height: 42,
  borderRadius: 10,
  backgroundColor: "#f1f5f9",
},
});