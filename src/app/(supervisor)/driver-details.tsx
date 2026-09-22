import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Bike,
  Camera,
  Car,
  Eye,
  EyeOff,
  MessageCircle,
  Pencil,
  PersonStanding,
  Phone,
  X,
} from "lucide-react-native";

import { router, useLocalSearchParams } from "expo-router";

import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

import {
  getDriverById,
  updateDriver,
  updateDriverStatus,
} from "../../api/driverApi";

import { getDriverLocation } from "../../api/locationApi";
import { getDriverStats } from "../../api/statsApi";

import { useLanguage } from "../../context/LanguageContext";

import type {
  Driver,
  UpdateDriverPayload,
  VehicleType,
} from "../../types/driver";
import type { DriverLocation } from "../../types/location";
import type { DriverStatsResponse } from "../../types/stats";

import { formatDateTime, formatDuration, getErrorMessage } from "../../utils";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",

  border: "#CAD4D4",
  muted: "#667577",

  error: "#B91C1C",
  errorBackground: "#FDECEC",

  success: "#166534",
  successBackground: "#EAF7EE",
};

export default function DriverDetailsScreen() {
  const { t } = useTranslation();

  const { driverId } = useLocalSearchParams<{
    driverId: string;
  }>();

  const { language } = useLanguage();

  const [driver, setDriver] = useState<Driver | null>(null);

  const [stats, setStats] = useState<DriverStatsResponse | null>(null);

  const [location, setLocation] = useState<DriverLocation | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [editVisible, setEditVisible] = useState(false);

  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");

  const [editVehicleType, setEditVehicleType] = useState<VehicleType | null>(
    null,
  );

  const [editProfilePictureUri, setEditProfilePictureUri] = useState<
    string | null
  >(null);

  const [editIqamaId, setEditIqamaId] = useState("");

  const [editPhone, setEditPhone] = useState("");

  const [editPassword, setEditPassword] = useState("");

  const [isUpdatingDriver, setIsUpdatingDriver] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!driverId) {
      return;
    }

    try {
      setError(null);

      const [driverResponse, statsResponse, locationResponse] =
        await Promise.all([
          getDriverById(driverId),
          getDriverStats(driverId, "today"),
          getDriverLocation(driverId),
        ]);

      setDriver(driverResponse.driver);

      setStats(statsResponse);

      setLocation(locationResponse.location);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.detailsLoadFailed", "Unable to load driver"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [driverId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openEditDriver = () => {
    if (!driver) {
      return;
    }

    setEditName(driver.name ?? "");

    setEditShortName(driver.shortName ?? "");

    setEditIqamaId(driver.iqamaId ?? "");

    setEditPhone(driver.phone ?? "");

    setEditVehicleType(driver.vehicleType ?? null);

    /*
     * null means no NEW image selected.
     *
     * We still display the existing
     * remote image separately.
     */
    setEditProfilePictureUri(null);

    setEditPassword("");

    setError(null);

    setEditVisible(true);
  };
  const closeEditDriver = () => {
    if (isUpdatingDriver) {
      return;
    }

    setEditVisible(false);
  };

  const handleUpdateDriver = async () => {
    if (!driver || !driverId || isUpdatingDriver) {
      return;
    }

    const name = editName.trim();

    const shortName = editShortName.trim();

    const iqamaId = editIqamaId.trim();

    const phone = editPhone.trim();

    const password = editPassword.trim();

    if (!name) {
      setError(t("drivers.nameRequired", "Driver name is required"));

      return;
    }

    if (shortName.length > 30) {
      setError(
        t(
          "drivers.shortNameLength",
          "Short name must not exceed 30 characters",
        ),
      );

      return;
    }

    if (!iqamaId) {
      setError(t("drivers.iqamaRequired", "Iqama ID is required"));

      return;
    }

    if (password && password.length < 6) {
      setError(
        t("drivers.passwordLength", "Password must be at least 6 characters"),
      );

      return;
    }

    try {
      setIsUpdatingDriver(true);

      setError(null);

      const payload: UpdateDriverPayload = {
        name,

        shortName: shortName || null,

        iqamaId,

        phone: phone || null,

        vehicleType: editVehicleType,

        profilePictureUri: editProfilePictureUri,
      };

      if (password) {
        payload.password = password;
      }

      const response = await updateDriver(driverId, payload);

      setDriver(response.driver);

      setEditPassword("");

      setEditProfilePictureUri(null);

      setEditVisible(false);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.updateFailed", "Unable to update driver"),
        ),
      );
    } finally {
      setIsUpdatingDriver(false);
    }
  };

  const pickProfilePicture = async () => {
    if (isUpdatingDriver) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("common.permissionRequired", "Permission Required"),
        t(
          "drivers.photoPermission",
          "Photo library permission is required to select a profile picture.",
        ),
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],

      allowsEditing: true,

      aspect: [1, 1],

      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setEditProfilePictureUri(result.assets[0].uri);
  };
  const handleStatusPress = () => {
    if (!driver) {
      return;
    }

    if (!driver.isActive) {
      void toggleStatus();
      return;
    }

    Alert.alert(
      t("drivers.deactivateConfirmTitle", "Deactivate Driver?"),
      t(
        "drivers.deactivateConfirmMessage",
        "Are you sure you want to deactivate this driver? The driver will no longer be able to use the app until activated again.",
      ),
      [
        {
          text: t("common.cancel", "Cancel"),
          style: "cancel",
        },
        {
          text: t("drivers.deactivate", "Deactivate Driver"),
          style: "destructive",
          onPress: () => {
            void toggleStatus();
          },
        },
      ],
    );
  };

  const toggleStatus = async () => {
    if (!driver || !driverId || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);

      const response = await updateDriverStatus(driverId, !driver.isActive);

      setDriver((current) =>
        current
          ? {
              ...current,
              isActive: response.driver.isActive,
            }
          : current,
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.statusFailed", "Unable to update driver status"),
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCall = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForCall(driver.phone);

      await Linking.openURL(`tel:${phone}`);
    } catch {
      setError(t("drivers.callFailed", "Unable to open the phone app"));
    }
  };

  const handleWhatsApp = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForWhatsApp(driver.phone);

      await Linking.openURL(`https://wa.me/${phone}`);
    } catch {
      setError(t("drivers.whatsappFailed", "Unable to open WhatsApp"));
    }
  };

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>← {t("common.back", "Back")}</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error && !driver ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : driver ? (
          <>
            <View style={styles.heading}>
              <View style={styles.avatar}>
                {driver.profilePicture?.url ? (
                  <Image
                    source={{
                      uri: driver.profilePicture.url,
                    }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <DriverVehicleIcon
                    vehicleType={driver.vehicleType}
                    size={20}
                    color={COLORS.white}
                  />
                )}
              </View>

              <View style={styles.headingInfo}>
                <Text style={styles.title} numberOfLines={1}>
                  {driver.shortName || driver.name}
                </Text>

                {!!driver.shortName && (
                  <Text style={styles.fullName} numberOfLines={1}>
                    {driver.name}
                  </Text>
                )}

                <View
                  style={[
                    styles.statusBadge,

                    driver.isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,

                      driver.isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {driver.isActive
                      ? t("common.active", "Active")
                      : t("common.inactive", "Inactive")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openEditDriver}
                style={({ pressed }) => [
                  styles.editDriverButton,

                  pressed && styles.buttonPressed,
                ]}
              >
                <Pencil size={15} color={COLORS.primary} />

                <Text style={styles.editDriverButtonText}>
                  {t("common.edit", "Edit")}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {t("drivers.information", "Driver Information")}
              </Text>
              <View style={styles.twoColumnRow}>
                <View style={styles.flexField}>
                  <InfoRow
                    label={t("drivers.fullName", "Full Name")}
                    value={driver.name}
                  />

                  <InfoRow
                    label={t("drivers.shortName", "Short Name")}
                    value={driver.shortName || "-"}
                  />
                </View>
              </View>
              <View style={styles.twoColumnRow}>
                <View style={styles.flexField}>
                  <InfoRow
                    label={t("drivers.vehicleType", "Vehicle Type")}
                    value={
                      driver.vehicleType === "car"
                        ? t("drivers.car", "Car")
                        : driver.vehicleType === "bike"
                          ? t("drivers.bike", "Bike")
                          : t("drivers.walking", "Walking")
                    }
                  />

                  <InfoRow
                    label={t("profile.iqama", "Iqama ID")}
                    value={driver.iqamaId}
                  />
                </View>
              </View>

              <PhoneRow
                label={t("profile.phone", "Phone")}
                value={driver.phone || "-"}
                hasPhone={!!driver.phone}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
              />
            </View>

            {stats && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("stats.today", "Today")}
                </Text>

                <View style={styles.statGrid}>
                  <MiniStat
                    label={t("stats.orders", "Orders")}
                    value={String(stats.orders.total)}
                  />

                  <MiniStat
                    label={t("stats.delivered", "Delivered")}
                    value={String(stats.orders.delivered)}
                  />
                </View>

                <View style={styles.workBox}>
                  <Text style={styles.workLabel}>
                    {t("stats.workingTime", "Working Time")}
                  </Text>

                  <Text style={styles.workValue}>
                    {formatDuration(stats.work.totalSeconds, language)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {t("location.latest", "Latest Location")}
              </Text>

              {location ? (
                <>
                  <Text style={styles.locationText}>
                    {location.latitude}, {location.longitude}
                  </Text>

                  <Text style={styles.locationDate}>
                    {formatDateTime(location.recordedAt, language)}
                  </Text>
                </>
              ) : (
                <Text style={styles.muted}>
                  {t("location.none", "No location available")}
                </Text>
              )}
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.statusButton,

                driver.isActive ? styles.disableButton : styles.enableButton,

                pressed && styles.buttonPressed,

                isUpdatingStatus && styles.buttonDisabled,
              ]}
              disabled={isUpdatingStatus}
              onPress={handleStatusPress}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {driver.isActive
                    ? t("drivers.deactivate", "Deactivate Driver")
                    : t("drivers.activate", "Activate Driver")}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}

        <EditDriverModal
          visible={editVisible}
          name={editName}
          shortName={editShortName}
          iqamaId={editIqamaId}
          phone={editPhone}
          password={editPassword}
          vehicleType={editVehicleType}
          existingProfilePictureUrl={driver?.profilePicture?.url ?? null}
          selectedProfilePictureUri={editProfilePictureUri}
          loading={isUpdatingDriver}
          onNameChange={setEditName}
          onShortNameChange={setEditShortName}
          onIqamaChange={setEditIqamaId}
          onPhoneChange={setEditPhone}
          onPasswordChange={setEditPassword}
          onVehicleTypeChange={setEditVehicleType}
          onPickProfilePicture={() => void pickProfilePicture()}
          onClose={closeEditDriver}
          onSave={() => void handleUpdateDriver()}
        />
      </ScrollView>
    </AppScreen>
  );
}

function EditDriverModal({
  visible,
  name,
  shortName,
  iqamaId,
  phone,
  password,
  vehicleType,
  existingProfilePictureUrl,
  selectedProfilePictureUri,
  loading,
  onNameChange,
  onShortNameChange,
  onIqamaChange,
  onPhoneChange,
  onPasswordChange,
  onVehicleTypeChange,
  onPickProfilePicture,
  onClose,
  onSave,
}: {
  visible: boolean;

  name: string;

  shortName: string;

  iqamaId: string;

  phone: string;

  password: string;

  vehicleType: VehicleType | null;

  existingProfilePictureUrl: string | null;

  selectedProfilePictureUri: string | null;

  loading: boolean;

  onNameChange: (value: string) => void;

  onShortNameChange: (value: string) => void;

  onIqamaChange: (value: string) => void;

  onPhoneChange: (value: string) => void;

  onPasswordChange: (value: string) => void;

  onVehicleTypeChange: (value: VehicleType | null) => void;

  onPickProfilePicture: () => void;

  onClose: () => void;

  onSave: () => void;
}) {
  const { t } = useTranslation();

  const profileUri = selectedProfilePictureUri || existingProfilePictureUrl;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editModalOverlay}>
        <View style={styles.editModalCard}>
          <View style={styles.editModalHeader}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.editModalTitle}>
                {t("drivers.editDriver", "Edit Driver")}
              </Text>

              <Text style={styles.editModalSubtitle}>
                {t(
                  "drivers.editDriverDescription",
                  "Update driver information",
                )}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={loading}
              style={styles.editModalClose}
            >
              <X size={17} color={COLORS.primary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* PROFILE PHOTO */}

            <View style={styles.editProfileSection}>
              <Pressable
                disabled={loading}
                onPress={onPickProfilePicture}
                style={styles.editProfilePictureButton}
              >
                <View style={styles.editProfilePicture}>
                  {profileUri ? (
                    <Image
                      source={{
                        uri: profileUri,
                      }}
                      style={styles.editProfileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <DriverVehicleIcon
                      vehicleType={vehicleType}
                      size={27}
                      color={COLORS.primary}
                    />
                  )}
                </View>

                <View style={styles.editCameraBadge}>
                  <Camera size={13} color={COLORS.white} />
                </View>
              </Pressable>

              <View style={styles.editProfileText}>
                <Text style={styles.editProfileTitle}>
                  {t("drivers.profilePicture", "Profile Picture")}
                </Text>

                <Text style={styles.editProfileSubtitle}>
                  {t(
                    "drivers.changeProfilePicture",
                    "Tap the image to choose a new photo",
                  )}
                </Text>
              </View>
            </View>

            {/* FULL NAME */}

            <EditField
              label={t("profile.name", "Full Name")}
              value={name}
              onChangeText={onNameChange}
              placeholder={t("drivers.namePlaceholder", "Driver name")}
            />

            {/* SHORT NAME */}

            <EditField
              label={t("drivers.shortName", "Short Name")}
              value={shortName}
              onChangeText={onShortNameChange}
              placeholder={t("drivers.shortNamePlaceholder", "Example: Ahmed")}
            />

            {/* VEHICLE */}

            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>
                {t("drivers.vehicleType", "Vehicle Type")}
              </Text>

              <View style={styles.vehicleOptions}>
                <VehicleOption
                  label={t("drivers.car", "Car")}
                  icon={Car}
                  selected={vehicleType === "car"}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange("car")}
                />

                <VehicleOption
                  label={t("drivers.bike", "Bike")}
                  icon={Bike}
                  selected={vehicleType === "bike"}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange("bike")}
                />

                <VehicleOption
                  label={t("drivers.walking", "Walking")}
                  icon={PersonStanding}
                  selected={vehicleType === null}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange(null)}
                />
              </View>
            </View>

            <EditField
              label={t("profile.iqama", "Iqama ID")}
              value={iqamaId}
              onChangeText={onIqamaChange}
              placeholder={t("drivers.iqamaPlaceholder", "Iqama ID")}
              keyboardType="number-pad"
            />

            <EditField
              label={t("profile.phone", "Phone")}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder={t("drivers.phonePlaceholder", "Phone number")}
              keyboardType="phone-pad"
            />

            <EditField
              label={t("profile.password", "New Password")}
              value={password}
              onChangeText={onPasswordChange}
              placeholder={t(
                "driver.passwordOptional",
                "Leave empty to keep current password",
              )}
              secureTextEntry
            />
          </ScrollView>

          <View style={styles.editModalActions}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.editCancelButton,

                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.editCancelText}>
                {t("common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              disabled={loading}
              style={({ pressed }) => [
                styles.editSaveButton,

                pressed && styles.buttonPressed,

                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.editSaveText}>
                  {t("common.save", "Save")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function VehicleOption({
  label,
  icon: Icon,
  selected,
  disabled,
  onPress,
}: {
  label: string;

  icon: typeof Car;

  selected: boolean;

  disabled: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.vehicleOption,

        selected && styles.vehicleOptionSelected,

        pressed && styles.buttonPressed,

        disabled && styles.buttonDisabled,
      ]}
    >
      <Icon size={17} color={selected ? COLORS.white : COLORS.primary} />

      <Text
        style={[
          styles.vehicleOptionText,

          selected && styles.vehicleOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DriverVehicleIcon({
  vehicleType,
  size = 20,
  color = COLORS.white,
}: {
  vehicleType?: VehicleType | null;

  size?: number;

  color?: string;
}) {
  if (vehicleType === "car") {
    return <Car size={size} color={color} strokeWidth={2.3} />;
  }

  if (vehicleType === "bike") {
    return <Bike size={size} color={color} strokeWidth={2.3} />;
  }

  return <PersonStanding size={size} color={color} strokeWidth={2.3} />;
}
function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
}: {
  label: string;

  value: string;

  onChangeText: (value: string) => void;

  placeholder: string;

  keyboardType?: "default" | "number-pad" | "phone-pad";

  secureTextEntry?: boolean;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const shouldShowToggle = secureTextEntry;

  return (
    <View style={styles.editField}>
      <Text style={styles.editFieldLabel}>{label}</Text>

      <View style={styles.editInputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !passwordVisible}
          autoCapitalize={secureTextEntry ? "none" : "sentences"}
          autoCorrect={false}
          style={[
            styles.editInput,
            shouldShowToggle && styles.editInputWithIcon,
          ]}
        />

        {shouldShowToggle && (
          <Pressable
            onPress={() => setPasswordVisible((current) => !current)}
            style={({ pressed }) => [
              styles.passwordEyeButton,

              pressed && styles.buttonPressed,
            ]}
          >
            {passwordVisible ? (
              <EyeOff size={18} color={COLORS.muted} />
            ) : (
              <Eye size={18} color={COLORS.muted} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PhoneRow({
  label,
  value,
  hasPhone,
  onCall,
  onWhatsApp,
}: {
  label: string;
  value: string;
  hasPhone: boolean;
  onCall: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <View style={styles.phoneRow}>
      <View style={styles.phoneInfo}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue}>{value}</Text>
      </View>

      {hasPhone && (
        <View style={styles.phoneActions}>
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.contactButtonPressed,
            ]}
          >
            <Phone size={18} color={COLORS.primary} />
          </Pressable>

          <Pressable
            onPress={onWhatsApp}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.contactButtonPressed,
            ]}
          >
            <MessageCircle size={19} color={COLORS.secondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>

      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function normalizePhoneForCall(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizePhoneForWhatsApp(phone: string) {
  let value = phone.replace(/\D/g, "");

  // Saudi local mobile:
  // 05XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("05") && value.length === 10) {
    value = `966${value.slice(1)}`;
  }

  // 5XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("5") && value.length === 9) {
    value = `966${value}`;
  }

  // 009665XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("00")) {
    value = value.slice(2);
  }

  return value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    marginBottom: 7,
  },

  back: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  loading: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primary,

    marginRight: 9,
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.white,
  },

  headingInfo: {
    flex: 1,
    alignItems: "flex-start",
  },

  title: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.primary,
  },

  statusBadge: {
    marginTop: 3,

    paddingHorizontal: 7,
    paddingVertical: 3,

    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: COLORS.successBackground,
  },

  inactiveBadge: {
    backgroundColor: COLORS.errorBackground,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  activeText: {
    color: COLORS.success,
  },

  inactiveText: {
    color: COLORS.error,
  },

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 12,

    padding: 11,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,

    marginBottom: 7,
  },

  infoRow: {
    flex: 1,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  infoLabel: {
    fontSize: 9,

    fontWeight: "600",

    color: COLORS.muted,
  },

  infoValue: {
    marginTop: 2,

    fontSize: 12,
    fontWeight: "800",

    color: COLORS.black,
  },

  phoneRow: {
    minHeight: 50,

    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 6,
  },

  phoneInfo: {
    flex: 1,
  },

  phoneActions: {
    flexDirection: "row",

    gap: 6,

    marginLeft: 8,
  },

  contactButton: {
    width: 32,
    height: 32,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  contactButtonPressed: {
    opacity: 0.6,
  },

  statGrid: {
    flexDirection: "row",
    gap: 7,
  },

  miniStat: {
    flex: 1,

    minHeight: 56,

    paddingHorizontal: 9,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    justifyContent: "center",
  },

  miniStatValue: {
    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,
  },

  miniStatLabel: {
    marginTop: 2,

    fontSize: 9,

    color: COLORS.muted,
  },

  workBox: {
    marginTop: 7,

    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },

  workLabel: {
    fontSize: 9,

    color: COLORS.muted,
  },

  workValue: {
    marginTop: 2,

    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,
  },

  locationText: {
    fontSize: 12,

    fontWeight: "800",

    color: COLORS.black,
  },

  locationDate: {
    marginTop: 3,

    fontSize: 9,

    color: COLORS.muted,
  },

  muted: {
    fontSize: 11,

    color: COLORS.muted,
  },

  errorBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 8,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 8,
  },

  errorText: {
    fontSize: 10,
    lineHeight: 14,

    color: COLORS.error,
  },

  statusButton: {
    height: 38,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 2,
  },

  disableButton: {
    backgroundColor: COLORS.error,
  },

  enableButton: {
    backgroundColor: COLORS.primary,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonText: {
    color: COLORS.white,

    fontSize: 12,
    fontWeight: "800",
  },

  editDriverButton: {
    minHeight: 34,

    flexDirection: "row",
    alignItems: "center",

    gap: 5,

    paddingHorizontal: 10,

    borderRadius: 9,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  editDriverButtonText: {
    fontSize: 9,

    fontWeight: "800",

    color: COLORS.primary,
  },

  editModalOverlay: {
    flex: 1,

    paddingHorizontal: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(10, 9, 12, 0.5)",
  },

  editModalCard: {
    width: "100%",
    maxWidth: 420,

    maxHeight: "90%",

    padding: 14,

    borderRadius: 16,

    backgroundColor: COLORS.white,
  },

  editModalHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 12,
  },

  editModalTitle: {
    fontSize: 15,

    fontWeight: "900",

    color: COLORS.primary,
  },

  editModalSubtitle: {
    marginTop: 2,

    fontSize: 9,

    color: COLORS.muted,
  },

  editModalClose: {
    width: 32,
    height: 32,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  editField: {
    marginBottom: 10,
  },

  editFieldLabel: {
    marginBottom: 5,

    fontSize: 9,

    fontWeight: "800",

    color: COLORS.muted,
  },

  editInputWrapper: {
    position: "relative",

    justifyContent: "center",
  },

  editInput: {
    height: 42,

    paddingHorizontal: 10,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    fontSize: 11,

    fontWeight: "600",

    color: COLORS.black,
  },

  editInputWithIcon: {
    paddingRight: 44,
  },

  passwordEyeButton: {
    position: "absolute",

    right: 4,

    width: 38,
    height: 38,

    alignItems: "center",
    justifyContent: "center",
  },
  editModalActions: {
    flexDirection: "row",

    gap: 8,

    marginTop: 5,
  },

  editCancelButton: {
    flex: 1,

    height: 40,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  editCancelText: {
    fontSize: 10,

    fontWeight: "800",

    color: COLORS.primary,
  },

  editSaveButton: {
    flex: 1,

    height: 40,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.primary,
  },

  editSaveText: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.white,
  },
  avatarImage: {
    width: "100%",
    height: "100%",

    borderRadius: 20,
  },

  fullName: {
    marginTop: 1,

    fontSize: 9,

    color: COLORS.muted,
  },

  editProfileSection: {
    minHeight: 74,

    marginBottom: 12,

    padding: 8,

    flexDirection: "row",

    alignItems: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 11,

    backgroundColor: COLORS.light,
  },

  editProfilePictureButton: {
    position: "relative",

    marginRight: 10,
  },

  editProfilePicture: {
    width: 58,

    height: 58,

    borderRadius: 29,

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",

    borderWidth: 2,

    borderColor: COLORS.white,

    backgroundColor: COLORS.white,
  },

  editProfileImage: {
    width: "100%",

    height: "100%",
  },

  editCameraBadge: {
    position: "absolute",

    right: -2,

    bottom: -1,

    width: 23,

    height: 23,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 2,

    borderColor: COLORS.white,

    backgroundColor: COLORS.primary,
  },

  editProfileText: {
    flex: 1,
  },

  editProfileTitle: {
    fontSize: 10,

    fontWeight: "800",

    color: COLORS.primary,
  },

  editProfileSubtitle: {
    marginTop: 3,

    fontSize: 8,

    lineHeight: 12,

    color: COLORS.muted,
  },

  vehicleOptions: {
    flexDirection: "row",

    gap: 6,
  },

  vehicleOption: {
    flex: 1,

    minHeight: 48,

    alignItems: "center",

    justifyContent: "center",

    gap: 3,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  vehicleOptionSelected: {
    borderColor: COLORS.primary,

    backgroundColor: COLORS.primary,
  },

  vehicleOptionText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.primary,
  },

  vehicleOptionTextSelected: {
    color: COLORS.white,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 7,
  },

  flexField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 7,
    flex: 1,
  },
});
