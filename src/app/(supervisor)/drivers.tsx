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

import type { Driver } from "../../types/driver";

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
        name: cleanName,
        iqamaId: cleanIqamaId,
        password,
        phone: cleanPhone || undefined,
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
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { textAlign }]}>{label}</Text>

        {optional && <Text style={styles.optional}>Optional</Text>}
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    marginBottom: 10,
  },

  backText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  heading: {
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },

  createCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,

    borderRadius: 16,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 18,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.primary,
  },

  cardSubtitle: {
    marginTop: 3,
    marginBottom: 16,

    fontSize: 12,
    lineHeight: 18,

    color: COLORS.muted,
  },

  field: {
    marginBottom: 13,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 6,
  },

  label: {
    flex: 1,

    fontSize: 12,
    fontWeight: "700",

    color: COLORS.primary,
  },

  optional: {
    fontSize: 10,
    fontWeight: "600",

    color: COLORS.muted,
  },

  input: {
    height: 43,

    paddingHorizontal: 12,
    paddingVertical: 0,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 10,

    backgroundColor: COLORS.light,

    fontSize: 14,
    color: COLORS.black,
  },

  primaryButton: {
    height: 46,

    marginTop: 3,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

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

    fontSize: 14,
    fontWeight: "800",
  },

  errorBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,

    marginBottom: 16,

    borderRadius: 10,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    color: COLORS.error,

    fontSize: 12,
    lineHeight: 18,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 10,
  },

  listTitle: {
    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,
  },

  driverCount: {
    minWidth: 25,
    height: 25,

    marginLeft: 8,

    paddingHorizontal: 7,

    borderRadius: 13,

    textAlign: "center",
    textAlignVertical: "center",

    backgroundColor: COLORS.secondary,

    color: COLORS.white,

    fontSize: 11,
    fontWeight: "800",
  },

  loading: {
    paddingVertical: 30,

    alignItems: "center",
  },

  emptyCard: {
    padding: 20,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.primary,
  },

  emptyText: {
    marginTop: 5,

    fontSize: 12,
    lineHeight: 18,

    color: COLORS.muted,

    textAlign: "center",
  },

  driverCard: {
    minHeight: 74,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 13,
    paddingVertical: 11,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    marginBottom: 9,
  },

  driverCardPressed: {
    opacity: 0.7,
  },

  driverAvatar: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginRight: 11,
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "900",

    color: COLORS.primary,
  },

  driverInfo: {
    flex: 1,

    paddingRight: 10,
  },

  driverName: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.black,
  },

  driverSub: {
    marginTop: 3,

    fontSize: 11,

    color: COLORS.secondary,
  },

  driverPhone: {
    marginTop: 2,

    fontSize: 10,

    color: COLORS.muted,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: COLORS.successBackground,
  },

  inactiveBadge: {
    backgroundColor: COLORS.errorBackground,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  activeText: {
    color: COLORS.success,
  },

  inactiveText: {
    color: COLORS.error,
  },
});
