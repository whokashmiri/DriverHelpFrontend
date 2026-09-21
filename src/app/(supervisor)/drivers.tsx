import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { createDriver, getMyDrivers } from "../../api/driverApi";
import { AppScreen } from "../../components/AppScreen";

import { useLanguage } from "../../context/LanguageContext";

import type { Driver ,VehicleType } from "../../types/driver";

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
  const [iqamaId, setIqamaId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [
  vehicleType,
  setVehicleType,
] = useState<
  "car" | "bike"
>("car");

  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isArabic = language === "ar";

  const textAlign = isArabic ? "right" : "left";

  const loadDrivers = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyDrivers();

      setDrivers(response.drivers);
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

  const handleCreate = async () => {
    const cleanName = name.trim();
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

    try {
      setIsCreating(true);
      setError(null);
await createDriver({
  name:
    cleanName,

  iqamaId:
    cleanIqamaId,

  password,

  phone:
    cleanPhone ||
    undefined,

  vehicleType,
});
      setName("");
      setIqamaId("");
      setPhone("");
      setPassword("");

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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>
            {isArabic ? "←" : "←"} {t("common.back", "Back")}
          </Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={[styles.title, { textAlign }]}>
            {t("drivers.title", "Drivers")}
          </Text>

          <Text style={[styles.subtitle, { textAlign }]}>
            {t("drivers.subtitle", "Create and manage your delivery drivers")}
          </Text>
        </View>

        <View style={styles.createCard}>
          <Text style={[styles.cardTitle, { textAlign }]}>
            {t("drivers.create", "Create Driver")}
          </Text>

          <Text style={[styles.cardSubtitle, { textAlign }]}>
            {t(
              "drivers.createSubtitle",
              "Enter the driver's account information",
            )}
          </Text>

          

          <FormField
            label={t("profile.name", "Driver name")}
            value={name}
            onChangeText={setName}
            placeholder={t("drivers.namePlaceholder", "Enter driver name")}
            textAlign={textAlign}
            editable={!isCreating}
          />

          <FormField
            label={t("profile.iqama", "Iqama ID")}
            value={iqamaId}
            onChangeText={setIqamaId}
            placeholder={t("drivers.iqamaPlaceholder", "Enter Iqama ID")}
            keyboardType="number-pad"
            textAlign={textAlign}
            editable={!isCreating}
          />

          <FormField
            label={t("profile.phone", "Phone")}
            optional
            value={phone}
            onChangeText={setPhone}
            placeholder={t("drivers.phonePlaceholder", "Enter phone number")}
            keyboardType="phone-pad"
            textAlign={textAlign}
            editable={!isCreating}
          />
          <VehicleTypeSelector
  value={vehicleType}
  onChange={
    setVehicleType
  }
  disabled={
    isCreating
  }
/>

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
            onPress={handleCreate}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isCreating && styles.primaryButtonPressed,
              isCreating && styles.primaryButtonDisabled,
            ]}
          >
            {isCreating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t("drivers.createDriver", "Create Driver")}
              </Text>
            )}
          </Pressable>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {t("drivers.yourDrivers", "Your Drivers")}
          </Text>

          {!isLoading && (
            <Text style={styles.driverCount}>{drivers.length}</Text>
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
          drivers.map((driver) => {
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
                <View style={styles.driverAvatar}>
                  <Text style={styles.avatarText}>
                    {driver.name?.trim().charAt(0).toUpperCase() || "D"}
                  </Text>
                </View>

                <View style={styles.driverInfo}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {driver.name}
                  </Text>

                  <Text style={styles.driverSub} numberOfLines={1}>
                    {driver.iqamaId}
                  </Text>

                  {!!driver.phone && (
                    <Text style={styles.driverPhone} numberOfLines={1}>
                      {driver.phone}
                    </Text>
                  )}

                  <Text
  style={
    styles.driverVehicle
  }
>
  {driver.vehicleType ===
  "bike"
    ? t(
        "drivers.bike",
        "Bike",
      )
    : t(
        "drivers.car",
        "Car",
      )}
</Text>
                </View>

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
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </AppScreen>
  );
}

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

function VehicleTypeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value:
    | "car"
    | "bike";

  onChange: (
    value:
      | "car"
      | "bike",
  ) => void;

  disabled?: boolean;
}) {
  const { t } =
    useTranslation();

  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.vehicleLabel
        }
      >
        {t(
          "drivers.vehicleType",
          "Vehicle Type",
        )}
      </Text>

      <View
        style={
          styles.vehicleOptions
        }
      >
        <VehicleRadio
          label={t(
            "drivers.car",
            "Car",
          )}
          selected={
            value ===
            "car"
          }
          disabled={
            disabled
          }
          onPress={() =>
            onChange(
              "car",
            )
          }
        />

        <VehicleRadio
          label={t(
            "drivers.bike",
            "Bike",
          )}
          selected={
            value ===
            "bike"
          }
          disabled={
            disabled
          }
          onPress={() =>
            onChange(
              "bike",
            )
          }
        />
      </View>
    </View>
  );
}

function VehicleRadio({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;

  selected: boolean;

  disabled: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={
        disabled
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.vehicleOption,

        selected &&
          styles.vehicleOptionSelected,

        pressed &&
          !disabled &&
          styles.vehicleOptionPressed,

        disabled &&
          styles.vehicleOptionDisabled,
      ]}
    >
      <View
        style={[
          styles.radioOuter,

          selected &&
            styles.radioOuterSelected,
        ]}
      >
        {selected && (
          <View
            style={
              styles.radioInner
            }
          />
        )}
      </View>

      <Text
        style={[
          styles.vehicleOptionText,

          selected &&
            styles.vehicleOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

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
        <Text style={[styles.label, { textAlign }]}>{label}</Text>

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
        style={[styles.input, { textAlign }]}
      />
    </View>
  );
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
    marginBottom: 5,
  },

  backText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  heading: {
    marginBottom: 10,
  },

  title: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.muted,
  },

  createCard: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 12,

    borderRadius: 12,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary,
  },

  cardSubtitle: {
    marginTop: 2,
    marginBottom: 10,

    fontSize: 10,
    lineHeight: 14,

    color: COLORS.muted,
  },

  field: {
    marginBottom: 8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 4,
  },

  label: {
    flex: 1,

    fontSize: 10,
    fontWeight: "700",

    color: COLORS.primary,
  },

  optional: {
    fontSize: 8,
    fontWeight: "600",

    color: COLORS.muted,
  },

  input: {
    height: 36,

    paddingHorizontal: 10,
    paddingVertical: 0,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 8,

    backgroundColor: COLORS.light,

    fontSize: 12,
    color: COLORS.black,
  },

  primaryButton: {
    height: 38,

    marginTop: 2,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

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

    fontSize: 12,
    fontWeight: "800",
  },

  errorBox: {
    paddingHorizontal: 10,
    paddingVertical: 7,

    marginBottom: 10,

    borderRadius: 8,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    color: COLORS.error,

    fontSize: 10,
    lineHeight: 14,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 6,
  },

  listTitle: {
    fontSize: 15,
    fontWeight: "900",

    color: COLORS.primary,
  },

  driverCount: {
    minWidth: 21,
    height: 21,

    marginLeft: 6,

    paddingHorizontal: 5,

    borderRadius: 11,

    textAlign: "center",
    textAlignVertical: "center",

    backgroundColor: COLORS.secondary,

    color: COLORS.white,

    fontSize: 9,
    fontWeight: "800",
  },

  loading: {
    paddingVertical: 20,

    alignItems: "center",
  },

  emptyCard: {
    padding: 14,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 12,
    fontWeight: "800",

    color: COLORS.primary,
  },

  emptyText: {
    marginTop: 3,

    fontSize: 10,
    lineHeight: 15,

    color: COLORS.muted,

    textAlign: "center",
  },

  driverCard: {
    minHeight: 56,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    marginBottom: 6,
  },

  driverCardPressed: {
    opacity: 0.7,
  },

  driverAvatar: {
    width: 34,
    height: 34,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginRight: 8,
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "900",

    color: COLORS.primary,
  },

  driverInfo: {
    flex: 1,

    paddingRight: 6,
  },

  driverName: {
    fontSize: 12,
    fontWeight: "800",

    color: COLORS.black,
  },

  driverSub: {
    marginTop: 1,

    fontSize: 9,

    color: COLORS.secondary,
  },

  driverPhone: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  statusBadge: {
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

  vehicleLabel: {
  marginBottom: 5,

  fontSize: 10,
  fontWeight: "700",

  color:
    COLORS.primary,
},

vehicleOptions: {
  flexDirection: "row",

  gap: 8,
},

vehicleOption: {
  flex: 1,

  height: 38,

  flexDirection: "row",

  alignItems: "center",
  justifyContent: "center",

  gap: 7,

  borderWidth: 1,
  borderColor:
    COLORS.border,

  borderRadius: 8,

  backgroundColor:
    COLORS.light,
},

vehicleOptionSelected: {
  borderColor:
    COLORS.primary,

  backgroundColor:
    COLORS.successBackground,
},

vehicleOptionPressed: {
  opacity: 0.75,
},

vehicleOptionDisabled: {
  opacity: 0.5,
},

radioOuter: {
  width: 16,
  height: 16,

  borderRadius: 8,

  borderWidth: 2,
  borderColor:
    COLORS.muted,

  alignItems: "center",
  justifyContent: "center",
},

radioOuterSelected: {
  borderColor:
    COLORS.primary,
},

radioInner: {
  width: 8,
  height: 8,

  borderRadius: 4,

  backgroundColor:
    COLORS.primary,
},

vehicleOptionText: {
  fontSize: 10,

  fontWeight: "700",

  color:
    COLORS.muted,
},

vehicleOptionTextSelected: {
  color:
    COLORS.primary,
},

driverVehicle: {
  marginTop: 2,

  fontSize: 8,

  fontWeight: "700",

  color:
    COLORS.primary,
},
});
