import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Rider = {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "Delivering" | "Offline";
  startTime: string;
  hoursWorked: string;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
};

export default function OrdersScreen() {
  const router = useRouter();

  const [expandedRiderId, setExpandedRiderId] = useState<string | null>(null);

  const [showAddRider, setShowAddRider] = useState(false);

  const [newRiderId, setNewRiderId] = useState("");
  const [newRiderPhone, setNewRiderPhone] = useState("");
  const [newRiderPassword, setNewRiderPassword] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const riders: Rider[] = [
    {
      id: "001",
      name: "محمد علي",
      phone: "0501234567",
      status: "Available",
      startTime: "08:00 ص",
      hoursWorked: "4 س 25 د",
      todayOrders: 6,
      weekOrders: 31,
      monthOrders: 118,
    },
    {
      id: "002",
      name: "خالد أحمد",
      phone: "0559876543",
      status: "Delivering",
      startTime: "07:30 ص",
      hoursWorked: "4 س 55 د",
      todayOrders: 8,
      weekOrders: 38,
      monthOrders: 142,
    },
    {
      id: "003",
      name: "عبدالله عمر",
      phone: "0531112233",
      status: "Available",
      startTime: "09:00 ص",
      hoursWorked: "3 س 25 د",
      todayOrders: 4,
      weekOrders: 26,
      monthOrders: 101,
    },
    {
      id: "004",
      name: "فهد صالح",
      phone: "0544445566",
      status: "Offline",
      startTime: "08:15 ص",
      hoursWorked: "2 س 10 د",
      todayOrders: 2,
      weekOrders: 21,
      monthOrders: 87,
    },
  ];

  const activeRiders = riders.filter(
    (rider) => rider.status !== "Offline",
  ).length;

  const todayOrders = riders.reduce(
    (total, rider) => total + rider.todayOrders,
    0,
  );

  const weekOrders = riders.reduce(
    (total, rider) => total + rider.weekOrders,
    0,
  );

  const monthOrders = riders.reduce(
    (total, rider) => total + rider.monthOrders,
    0,
  );

  function getStatusText(status: Rider["status"]) {
    if (status === "Available") return "متاح";
    if (status === "Delivering") return "في توصيل";

    return "غير متصل";
  }

  function getStatusColor(status: Rider["status"]) {
    if (status === "Available") return "#634B66";
    if (status === "Delivering") return "#9590A8";

    return "#BBCBCB";
  }

  function toggleRider(id: string) {
    setExpandedRiderId((current) => (current === id ? null : id));
  }

  function closeAddRider() {
    setShowAddRider(false);

    setNewRiderId("");
    setNewRiderPhone("");
    setNewRiderPassword("");
  }

  function addRider() {
    if (
      !newRiderId.trim() ||
      !newRiderPhone.trim() ||
      !newRiderPassword.trim()
    ) {
      return;
    }

    closeAddRider();

    setSuccessMessage("تمت إضافة السائق بنجاح");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>لوحة المتابعة</Text>

            <Text style={styles.subtitle}>
              متابعة السائقين وأداء عمليات التوصيل
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.mapButton}
            onPress={() => router.push("/maps")}
          >
            <Text style={styles.mapButtonText}>الخريطة</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>السائقون النشطون</Text>

            <Text style={styles.statValue}>{activeRiders}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>طلبات اليوم</Text>

            <Text style={styles.statValue}>{todayOrders}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>هذا الأسبوع</Text>

            <Text style={styles.statValue}>{weekOrders}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>هذا الشهر</Text>

            <Text style={styles.statValue}>{monthOrders}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>السائقون</Text>

            <Text style={styles.sectionCount}>{riders.length} سائق</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addRiderButton}
            onPress={() => setShowAddRider(true)}
          >
            <Text style={styles.addRiderButtonText}>+ إضافة سائق</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ridersList}>
          {riders.map((rider) => {
            const expanded = expandedRiderId === rider.id;

            return (
              <View
                key={rider.id}
                style={[styles.riderCard, expanded && styles.riderCardExpanded]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleRider(rider.id)}
                  style={styles.riderRow}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {rider.name.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.riderMain}>
                    <Text style={styles.riderName}>{rider.name}</Text>

                    <View style={styles.riderMetaRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: getStatusColor(rider.status),
                          },
                        ]}
                      />

                      <Text style={styles.riderMeta}>
                        {getStatusText(rider.status)}
                      </Text>

                      <Text style={styles.separator}>•</Text>

                      <Text style={styles.riderMeta}>
                        بدأ {rider.startTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.todayBox}>
                    <Text style={styles.todayNumber}>{rider.todayOrders}</Text>

                    <Text style={styles.todayLabel}>اليوم</Text>
                  </View>

                  <Text style={styles.arrow}>{expanded ? "⌃" : "⌄"}</Text>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>وقت البدء</Text>

                        <Text style={styles.detailValue}>
                          {rider.startTime}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>مدة العمل</Text>

                        <Text style={styles.detailValue}>
                          {rider.hoursWorked}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>طلبات اليوم</Text>

                        <Text style={styles.detailValue}>
                          {rider.todayOrders}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>الأسبوع</Text>

                        <Text style={styles.detailValue}>
                          {rider.weekOrders}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>الشهر</Text>

                        <Text style={styles.detailValue}>
                          {rider.monthOrders}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>رقم الجوال</Text>

                        <Text style={styles.detailValue}>{rider.phone}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.locationButton}
                      onPress={() => router.push("/maps")}
                    >
                      <Text style={styles.locationButtonText}>
                        عرض موقع السائق
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.logout}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>

      {successMessage !== "" && (
        <View style={styles.successMessage}>
          <Text style={styles.successMessageText}>{successMessage}</Text>
        </View>
      )}

      <Modal
        visible={showAddRider}
        transparent
        animationType="fade"
        onRequestClose={closeAddRider}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={closeAddRider}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>إضافة سائق جديد</Text>

                <Text style={styles.modalSubtitle}>
                  أدخل بيانات حساب السائق
                </Text>
              </View>
            </View>

            <View style={styles.modalForm}>
              <View>
                <Text style={styles.inputLabel}>رقم السائق</Text>

                <TextInput
                  value={newRiderId}
                  onChangeText={setNewRiderId}
                  placeholder="مثال: 005"
                  placeholderTextColor="#9590A8"
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>رقم الجوال</Text>

                <TextInput
                  value={newRiderPhone}
                  onChangeText={setNewRiderPhone}
                  placeholder="05xxxxxxxx"
                  placeholderTextColor="#9590A8"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>كلمة المرور</Text>

                <TextInput
                  value={newRiderPassword}
                  onChangeText={setNewRiderPassword}
                  placeholder="أدخل كلمة المرور"
                  placeholderTextColor="#9590A8"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.cancelButton}
                onPress={closeAddRider}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.saveButton}
                onPress={addRider}
              >
                <Text style={styles.saveButtonText}>إضافة السائق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D0E5D5",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 36,
  },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#9590A8",
    textAlign: "right",
  },

  mapButton: {
    marginRight: 14,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#634B66",
  },

  mapButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  statsGrid: {
    marginTop: 20,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  statCard: {
    width: "48.5%",
    minHeight: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    alignItems: "flex-end",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBCBCB",
  },

  statLabel: {
    fontSize: 11,
    color: "#9590A8",
    fontWeight: "700",
    textAlign: "right",
  },

  statValue: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: "800",
    color: "#634B66",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 9,
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  sectionCount: {
    marginTop: 2,
    fontSize: 10,
    color: "#9590A8",
    textAlign: "right",
  },

  addRiderButton: {
    paddingHorizontal: 13,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#634B66",
    alignItems: "center",
    justifyContent: "center",
  },

  addRiderButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  ridersList: {
    gap: 8,
  },

  riderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBCBCB",
    overflow: "hidden",
  },

  riderCardExpanded: {
    borderColor: "#634B66",
  },

  riderRow: {
    minHeight: 62,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D0E5D5",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontWeight: "800",
    color: "#634B66",
    fontSize: 14,
  },

  riderMain: {
    flex: 1,
    marginRight: 10,
    alignItems: "flex-end",
  },

  riderName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  riderMetaRow: {
    marginTop: 4,
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  riderMeta: {
    fontSize: 10,
    color: "#9590A8",
  },

  separator: {
    marginHorizontal: 5,
    fontSize: 10,
    color: "#BBCBCB",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 5,
  },

  todayBox: {
    alignItems: "center",
    marginHorizontal: 10,
    minWidth: 34,
  },

  todayNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#634B66",
  },

  todayLabel: {
    marginTop: 1,
    fontSize: 8,
    color: "#9590A8",
  },

  arrow: {
    width: 20,
    textAlign: "center",
    fontSize: 17,
    color: "#9590A8",
  },

  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#BBCBCB",
    opacity: 0.65,
    marginBottom: 12,
  },

  detailsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  detailItem: {
    width: "48.5%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#D0E5D5",
    alignItems: "flex-end",
  },

  detailLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9590A8",
    textAlign: "right",
  },

  detailValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  locationButton: {
    marginTop: 11,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#634B66",
    alignItems: "center",
    justifyContent: "center",
  },

  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  logout: {
    marginTop: 22,
    alignItems: "center",
    paddingVertical: 10,
  },

  logoutText: {
    color: "#634B66",
    fontSize: 12,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(38, 30, 40, 0.40)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderWidth: 1,
    borderColor: "#BBCBCB",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  modalHeaderText: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 14,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  modalSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#9590A8",
    textAlign: "right",
  },

  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#D0E5D5",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontSize: 19,
    color: "#634B66",
  },

  modalForm: {
    marginTop: 20,
    gap: 13,
  },

  inputLabel: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#634B66",
    textAlign: "right",
  },

  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#BBCBCB",
    borderRadius: 10,
    backgroundColor: "#F9FBFA",
    paddingHorizontal: 12,
    color: "#634B66",
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
  },

  modalActions: {
    marginTop: 20,
    flexDirection: "row-reverse",
    gap: 8,
  },

  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#634B66",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#D0E5D5",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#634B66",
    fontSize: 12,
    fontWeight: "800",
  },

  successMessage: {
    position: "absolute",
    top: 55,
    left: 20,
    right: 20,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#634B66",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  successMessageText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
