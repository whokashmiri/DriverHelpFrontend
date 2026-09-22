import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Bike, Camera, Car, PersonStanding, X } from "lucide-react-native";

import * as ImagePicker from "expo-image-picker";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";

import { createDriver, getMyDrivers } from "../../api/driverApi";

import { AppScreen } from "../../components/AppScreen";

import { useLanguage } from "../../context/LanguageContext";

import type { Driver, VehicleType } from "../../types/driver";

import { getErrorMessage } from "../../utils";

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

export default function DriversScreen() {
  const { t } = useTranslation();

  const { language } = useLanguage();

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [name, setName] = useState("");

  const [shortName, setShortName] = useState("");

  const [iqamaId, setIqamaId] = useState("");

  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");

  const [vehicleType, setVehicleType] = useState<VehicleType>("car");

  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isArabic = language === "ar";

  const textAlign = isArabic ? "right" : "left";

  /*
   * LOAD DRIVERS
   */
  const loadDrivers = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyDrivers();

      setDrivers(response.drivers ?? []);
    } catch (err) {
      setError(
        getErrorMessage(err, t("drivers.loadFailed", "Unable to load drivers")),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  /*
   * PROFILE PICTURE
   */
  const pickProfilePicture = async () => {
    if (isCreating) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("common.permissionRequired", "Permission Required"),
          t(
            "drivers.photoPermission",
            "Photo library permission is required to choose a profile picture.",
          ),
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setProfilePictureUri(result.assets[0].uri);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.photoFailed", "Unable to select profile picture"),
        ),
      );
    }
  };

  /*
   * CREATE DRIVER
   */
  const handleCreate = async () => {
    const cleanName = name.trim();

    const cleanShortName = shortName.trim();

    const cleanIqamaId = iqamaId.trim();

    const cleanPhone = phone.trim();

    if (!cleanName || !cleanIqamaId || password.length < 6) {
      setError(
        t(
          "drivers.invalidCreate",
          "Name, Iqama ID and a password of at least 6 characters are required",
        ),
      );

      return;
    }

    if (cleanShortName.length > 30) {
      setError(
        t(
          "drivers.shortNameLength",
          "Short name must not exceed 30 characters",
        ),
      );

      return;
    }

    try {
      setIsCreating(true);

      setError(null);

      await createDriver({
        name: cleanName,

        shortName: cleanShortName || undefined,

        iqamaId: cleanIqamaId,

        password,

        phone: cleanPhone || undefined,

        vehicleType,

        profilePictureUri,
      });

      setName("");

      setShortName("");

      setIqamaId("");

      setPhone("");

      setPassword("");

      setVehicleType("car");

      setProfilePictureUri(null);

      await loadDrivers();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.createFailed", "Unable to create driver"),
        ),
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text
            style={[
              styles.title,
              {
                textAlign,
              },
            ]}
          >
            {t("drivers.title", "Drivers")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                textAlign,
              },
            ]}
          >
            {t("drivers.subtitle", "Create and manage your delivery drivers")}
          </Text>
        </View>

        {/* CREATE DRIVER */}

        <View style={styles.createCard}>
          <View style={styles.createHeader}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.cardTitle,
                  {
                    textAlign,
                  },
                ]}
              >
                {t("drivers.create", "Create Driver")}
              </Text>

              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    textAlign,
                  },
                ]}
              >
                {t(
                  "drivers.createSubtitle",
                  "Enter the driver's account information",
                )}
              </Text>
            </View>

            {/* PROFILE PICTURE */}

            <View>
              <Pressable
                disabled={isCreating}
                onPress={() => void pickProfilePicture()}
                style={({ pressed }) => [
                  styles.profileButton,

                  pressed && !isCreating && styles.buttonPressed,
                ]}
              >
                {profilePictureUri ? (
                  <Image
                    source={{
                      uri: profilePictureUri,
                    }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Camera size={20} color={COLORS.primary} />
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  <Camera size={10} color={COLORS.white} />
                </View>
              </Pressable>

              {profilePictureUri && (
                <Pressable
                  disabled={isCreating}
                  onPress={() => setProfilePictureUri(null)}
                  style={styles.removePhotoButton}
                >
                  <X size={11} color={COLORS.error} />
                </Pressable>
              )}
            </View>
          </View>

          {/* NAME + SHORT NAME */}

          <View style={styles.twoColumnRow}>
            <View style={styles.flexField}>
              <FormField
                label={t("profile.name", "Full Name")}
                value={name}
                onChangeText={setName}
                placeholder={t("drivers.namePlaceholder", "Driver name")}
                textAlign={textAlign}
                editable={!isCreating}
              />
            </View>

            <View style={styles.flexField}>
              <FormField
                label={t("drivers.shortName", "Short Name")}
                optional
                value={shortName}
                onChangeText={setShortName}
                placeholder={t("drivers.shortNamePlaceholder", "Ahmed")}
                textAlign={textAlign}
                editable={!isCreating}
              />
            </View>
          </View>

          {/* IQAMA + PHONE */}

          <View style={styles.twoColumnRow}>
            <View style={styles.flexField}>
              <FormField
                label={t("profile.iqama", "Iqama ID")}
                value={iqamaId}
                onChangeText={setIqamaId}
                placeholder={t("drivers.iqamaPlaceholder", "Iqama ID")}
                keyboardType="number-pad"
                textAlign={textAlign}
                editable={!isCreating}
              />
            </View>

            <View style={styles.flexField}>
              <FormField
                label={t("profile.phone", "Phone")}
                optional
                value={phone}
                onChangeText={setPhone}
                placeholder={t("drivers.phonePlaceholder", "Phone number")}
                keyboardType="phone-pad"
                textAlign={textAlign}
                editable={!isCreating}
              />
            </View>
          </View>

          {/* VEHICLE */}

          <VehicleTypeSelector
            value={vehicleType}
            onChange={setVehicleType}
            disabled={isCreating}
          />

          {/* PASSWORD */}

          <FormField
            label={t("auth.password", "Password")}
            value={password}
            onChangeText={setPassword}
            placeholder={t(
              "drivers.passwordPlaceholder",
              "Minimum 6 characters",
            )}
            secureTextEntry
            textAlign={textAlign}
            editable={!isCreating}
          />

          <Pressable
            onPress={() => void handleCreate()}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.primaryButton,

              pressed && !isCreating && styles.primaryButtonPressed,

              isCreating && styles.primaryButtonDisabled,
            ]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t("drivers.createDriver", "Create Driver")}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ERROR */}

        {!!error && (
          <View style={styles.errorBox}>
            <Text
              style={[
                styles.errorText,
                {
                  textAlign,
                },
              ]}
            >
              {error}
            </Text>
          </View>
        )}

        {/* DRIVER LIST */}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {t("drivers.yourDrivers", "Your Drivers")}
          </Text>

          {!isLoading && (
            <View style={styles.driverCount}>
              <Text style={styles.driverCountText}>{drivers.length}</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {t("drivers.noDrivers", "No drivers yet")}
            </Text>

            <Text style={styles.emptyText}>
              {t(
                "drivers.noDriversDescription",
                "Create your first driver using the form above.",
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.driverList}>
            {drivers.map((driver) => {
              const driverId = driver._id ?? driver.id;

              return (
                <Pressable
                  key={driverId}
                  disabled={!driverId}
                  onPress={() => {
                    if (!driverId) {
                      return;
                    }

                    router.push({
                      pathname: "/(supervisor)/driver-details",

                      params: {
                        driverId,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.driverCard,

                    pressed && styles.driverCardPressed,
                  ]}
                >
                  {/* DRIVER PHOTO */}

                  <View style={styles.driverAvatar}>
                    {driver.profilePicture?.url ? (
                      <Image
                        source={{
                          uri: driver.profilePicture.url,
                        }}
                        style={styles.driverAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <DriverVehicleIcon
                        vehicleType={driver.vehicleType}
                        size={17}
                        color={COLORS.primary}
                      />
                    )}
                  </View>

                  {/* INFO */}

                  <View style={styles.driverInfo}>
                    <View style={styles.driverNameRow}>
                      <Text style={styles.driverName} numberOfLines={1}>
                        {driver.shortName || driver.name}
                      </Text>

                      <View style={styles.vehicleMiniBadge}>
                        <DriverVehicleIcon
                          vehicleType={driver.vehicleType}
                          size={11}
                          color={COLORS.secondary}
                        />

                        <Text style={styles.driverVehicle}>
                          {driver.vehicleType === "bike"
                            ? t("drivers.bike", "Bike")
                            : driver.vehicleType === "car"
                              ? t("drivers.car", "Car")
                              : t("drivers.walking", "Walking")}
                        </Text>
                      </View>
                    </View>

                    {!!driver.shortName && (
                      <Text style={styles.driverFullName} numberOfLines={1}>
                        {driver.name}
                      </Text>
                    )}

                    <Text style={styles.driverSub} numberOfLines={1}>
                      {driver.iqamaId}
                    </Text>

                    {!!driver.phone && (
                      <Text style={styles.driverPhone} numberOfLines={1}>
                        {driver.phone}
                      </Text>
                    )}
                  </View>

                  {/* STATUS */}

                  <View
                    style={[
                      styles.statusBadge,

                      driver.isActive
                        ? styles.activeBadge
                        : styles.inactiveBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        driver.isActive
                          ? styles.activeText
                          : styles.inactiveText,
                      ]}
                    >
                      {driver.isActive
                        ? t("common.active", "Active")
                        : t("common.inactive", "Inactive")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

/*
 * VEHICLE SELECTOR
 */

function VehicleTypeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: VehicleType;

  onChange: (value: VehicleType) => void;

  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.vehicleField}>
      <Text style={styles.vehicleLabel}>
        {t("drivers.vehicleType", "Vehicle Type")}
      </Text>

      <View style={styles.vehicleOptions}>
        <VehicleRadio
          label={t("drivers.car", "Car")}
          icon={Car}
          selected={value === "car"}
          disabled={disabled}
          onPress={() => onChange("car")}
        />

        <VehicleRadio
          label={t("drivers.bike", "Bike")}
          icon={Bike}
          selected={value === "bike"}
          disabled={disabled}
          onPress={() => onChange("bike")}
        />
      </View>
    </View>
  );
}

function VehicleRadio({
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

        pressed && !disabled && styles.buttonPressed,

        disabled && styles.vehicleOptionDisabled,
      ]}
    >
      <Icon size={15} color={selected ? COLORS.white : COLORS.primary} />

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

/*
 * FORM FIELD
 */

type FormFieldProps = {
  label: string;

  optional?: boolean;

  value: string;

  onChangeText: (value: string) => void;

  placeholder: string;

  keyboardType?: "default" | "number-pad" | "phone-pad";

  secureTextEntry?: boolean;

  textAlign: "left" | "right" | "center";

  editable?: boolean;
};

function FormField({
  label,
  optional = false,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  textAlign,
  editable = true,
}: FormFieldProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text
          style={[
            styles.label,
            {
              textAlign,
            },
          ]}
        >
          {label}
        </Text>

        {optional && (
          <Text style={styles.optional}>
            {t("common.optional", "Optional")}
          </Text>
        )}
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
        editable={editable}
        style={[
          styles.input,
          {
            textAlign,
          },
        ]}
      />
    </View>
  );
}

/*
 * VEHICLE ICON
 */

function DriverVehicleIcon({
  vehicleType,
  size = 17,
  color = COLORS.primary,
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

/*
 * STYLES
 */

const styles = StyleSheet.create({
  screen: {
    flex: 1,

    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 10,

    paddingTop: 6,

    paddingBottom: 22,
  },

  backButton: {
    alignSelf: "flex-start",

    paddingVertical: 2,

    marginBottom: 4,
  },

  backText: {
    fontSize: 11,

    fontWeight: "700",

    color: COLORS.secondary,
  },

  heading: {
    marginBottom: 7,
  },

  title: {
    fontSize: 19,

    fontWeight: "900",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 1,

    fontSize: 9,

    lineHeight: 13,

    color: COLORS.muted,
  },

  /*
   * CREATE
   */

  createCard: {
    padding: 10,

    borderRadius: 11,

    backgroundColor: COLORS.white,

    borderWidth: 1,

    borderColor: COLORS.border,

    marginBottom: 10,
  },

  createHeader: {
    minHeight: 54,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 7,
  },

  cardTitle: {
    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  cardSubtitle: {
    marginTop: 1,

    fontSize: 8,

    lineHeight: 12,

    color: COLORS.muted,
  },

  /*
   * PROFILE
   */

  profileButton: {
    position: "relative",

    width: 50,

    height: 50,

    marginLeft: 10,
  },

  profilePlaceholder: {
    width: 50,

    height: 50,

    borderRadius: 25,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.light,
  },

  profileImage: {
    width: 50,

    height: 50,

    borderRadius: 25,

    borderWidth: 1,

    borderColor: COLORS.border,
  },

  cameraBadge: {
    position: "absolute",

    right: -2,

    bottom: -1,

    width: 20,

    height: 20,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 2,

    borderColor: COLORS.white,

    backgroundColor: COLORS.primary,
  },

  removePhotoButton: {
    position: "absolute",

    top: -3,

    right: -5,

    width: 19,

    height: 19,

    borderRadius: 10,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.white,
  },

  /*
   * FORM
   */

  twoColumnRow: {
    flexDirection: "row",

    gap: 7,
  },

  flexField: {
    flex: 1,
  },

  field: {
    marginBottom: 6,
  },

  labelRow: {
    minHeight: 14,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 3,
  },

  label: {
    flex: 1,

    fontSize: 8,

    fontWeight: "700",

    color: COLORS.primary,
  },

  optional: {
    fontSize: 6,

    fontWeight: "600",

    color: COLORS.muted,
  },

  input: {
    height: 33,

    paddingHorizontal: 8,

    paddingVertical: 0,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 7,

    backgroundColor: COLORS.light,

    fontSize: 10,

    color: COLORS.black,
  },

  /*
   * VEHICLE
   */

  vehicleField: {
    marginBottom: 6,
  },

  vehicleLabel: {
    marginBottom: 3,

    fontSize: 8,

    fontWeight: "700",

    color: COLORS.primary,
  },

  vehicleOptions: {
    flexDirection: "row",

    gap: 7,
  },

  vehicleOption: {
    flex: 1,

    height: 34,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 7,

    backgroundColor: COLORS.light,
  },

  vehicleOptionSelected: {
    borderColor: COLORS.primary,

    backgroundColor: COLORS.primary,
  },

  vehicleOptionDisabled: {
    opacity: 0.5,
  },

  vehicleOptionText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.primary,
  },

  vehicleOptionTextSelected: {
    color: COLORS.white,
  },

  /*
   * CREATE BUTTON
   */

  primaryButton: {
    height: 35,

    marginTop: 1,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 7,

    backgroundColor: COLORS.primary,
  },

  primaryButtonPressed: {
    backgroundColor: COLORS.secondary,
  },

  primaryButtonDisabled: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: COLORS.white,

    fontSize: 10,

    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.7,
  },

  /*
   * ERROR
   */

  errorBox: {
    paddingHorizontal: 9,

    paddingVertical: 6,

    marginBottom: 8,

    borderRadius: 7,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    color: COLORS.error,

    fontSize: 8,

    lineHeight: 12,
  },

  /*
   * DRIVER LIST
   */

  listHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 5,
  },

  listTitle: {
    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  driverCount: {
    minWidth: 20,

    height: 20,

    marginLeft: 6,

    paddingHorizontal: 5,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.secondary,
  },

  driverCountText: {
    fontSize: 8,

    fontWeight: "900",

    color: COLORS.white,
  },

  loading: {
    paddingVertical: 18,

    alignItems: "center",
  },

  emptyCard: {
    padding: 12,

    borderRadius: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 11,

    fontWeight: "800",

    color: COLORS.primary,
  },

  emptyText: {
    marginTop: 2,

    fontSize: 8,

    lineHeight: 12,

    color: COLORS.muted,

    textAlign: "center",
  },

  driverList: {
    gap: 5,
  },

  driverCard: {
    minHeight: 57,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 8,

    paddingVertical: 6,

    borderRadius: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.white,
  },

  driverCardPressed: {
    opacity: 0.7,
  },

  driverAvatar: {
    width: 38,

    height: 38,

    borderRadius: 19,

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",

    backgroundColor: COLORS.light,

    borderWidth: 1,

    borderColor: COLORS.border,

    marginRight: 7,
  },

  driverAvatarImage: {
    width: "100%",

    height: "100%",
  },

  driverInfo: {
    flex: 1,

    minWidth: 0,

    paddingRight: 5,
  },

  driverNameRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,
  },

  driverName: {
    flexShrink: 1,

    fontSize: 11,

    fontWeight: "900",

    color: COLORS.black,
  },

  driverFullName: {
    marginTop: 1,

    fontSize: 7,

    color: COLORS.muted,
  },

  driverSub: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.secondary,
  },

  driverPhone: {
    marginTop: 1,

    fontSize: 7,

    color: COLORS.muted,
  },

  vehicleMiniBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 3,

    paddingHorizontal: 5,

    paddingVertical: 2,

    borderRadius: 999,

    backgroundColor: COLORS.light,
  },

  driverVehicle: {
    fontSize: 6,

    fontWeight: "800",

    color: COLORS.secondary,
  },

  /*
   * STATUS
   */

  statusBadge: {
    paddingHorizontal: 6,

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
    fontSize: 7,

    fontWeight: "800",
  },

  activeText: {
    color: COLORS.success,
  },

  inactiveText: {
    color: COLORS.error,
  },
});
