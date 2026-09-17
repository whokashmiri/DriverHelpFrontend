import { FileText, MoreVertical, UserRound, X } from "lucide-react-native";

import { useMemo, useState } from "react";

import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../hooks/useAuth";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",
};

export function AppHeader() {
  const { user } = useAuth();

  const { language, setLanguage } = useLanguage();

  const [menuVisible, setMenuVisible] = useState(false);

  const isArabic = language === "ar";

  const labels = useMemo(
    () => ({
      profile: isArabic ? "الملف الشخصي" : "Profile",

      terms: isArabic ? "الشروط والأحكام" : "Terms & Conditions",

      english: "EN",
      arabic: "ع",
    }),
    [isArabic],
  );

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleProfilePress = () => {
    closeMenu();

    if (user?.role === "driver") {
      router.push("/(driver)/profile");

      return;
    }

    if (user?.role === "supervisor") {
      router.push("/(supervisor)/profile");
    }
  };

  const handleTermsPress = () => {
    closeMenu();

    router.push("/terms");
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <Text style={styles.brand}>TOSH</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.languageToggle}>
            <Pressable
              onPress={() => setLanguage("en")}
              style={[
                styles.languageButton,

                language === "en" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageText,

                  language === "en" && styles.languageTextActive,
                ]}
              >
                {labels.english}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLanguage("ar")}
              style={[
                styles.languageButton,

                language === "ar" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageText,

                  language === "ar" && styles.languageTextActive,
                ]}
              >
                {labels.arabic}
              </Text>
            </Pressable>
          </View>

          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <MoreVertical size={21} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Pressable
            style={[styles.menu, isArabic ? styles.menuLeft : styles.menuRight]}
            onPress={() => {}}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>TOSH</Text>

              <TouchableOpacity
                onPress={closeMenu}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {user && (
              <>
                <View style={styles.userBlock}>
                  <View style={styles.avatar}>
                    <UserRound size={19} color={COLORS.primary} />
                  </View>

                  <View style={styles.userInfo}>
                    {!!user.name && (
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.name}
                      </Text>
                    )}

                    {!!user.iqamaId && (
                      <Text style={styles.userSubText} numberOfLines={1}>
                        {user.iqamaId}
                      </Text>
                    )}

                    {!!user.role && (
                      <Text style={styles.roleText}>{user.role}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleProfilePress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIcon}>
                    <UserRound size={18} color={COLORS.secondary} />
                  </View>

                  <Text style={styles.menuItemText}>{labels.profile}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleTermsPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <FileText size={18} color={COLORS.secondary} />
              </View>

              <Text style={styles.menuItemText}>{labels.terms}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 58,

    paddingHorizontal: 16,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: COLORS.white,

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: "#D3D8D8",
  },

  brandContainer: {
    flex: 1,
  },

  brand: {
    fontSize: 15,
    fontWeight: "900",

    color: COLORS.primary,

    letterSpacing: 1.3,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  languageToggle: {
    flexDirection: "row",
    alignItems: "center",

    padding: 3,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  languageButton: {
    minWidth: 32,
    height: 28,

    paddingHorizontal: 7,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 7,
  },

  languageButtonActive: {
    backgroundColor: COLORS.primary,
  },

  languageText: {
    fontSize: 11,
    fontWeight: "700",

    color: COLORS.secondary,
  },

  languageTextActive: {
    color: COLORS.white,
  },

  menuButton: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  overlay: {
    flex: 1,

    backgroundColor: "rgba(10, 9, 12, 0.30)",
  },

  menu: {
    position: "absolute",

    top: 54,

    width: 270,

    padding: 14,

    borderRadius: 16,

    backgroundColor: COLORS.white,

    shadowColor: COLORS.black,

    shadowOpacity: 0.14,
    shadowRadius: 16,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  menuRight: {
    right: 12,
  },

  menuLeft: {
    left: 12,
  },

  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 8,
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,

    letterSpacing: 0.8,
  },

  closeButton: {
    width: 32,
    height: 32,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  userBlock: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 10,
    paddingHorizontal: 3,
  },

  avatar: {
    width: 40,
    height: 40,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    marginRight: 10,

    borderWidth: 1,
    borderColor: "#D4DEDE",
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.black,
  },

  userSubText: {
    marginTop: 2,

    fontSize: 12,

    color: COLORS.secondary,
  },

  roleText: {
    marginTop: 2,

    fontSize: 10,
    fontWeight: "700",

    color: COLORS.primary,

    textTransform: "capitalize",
  },

  divider: {
    height: StyleSheet.hairlineWidth,

    backgroundColor: "#D8DEDE",

    marginVertical: 5,
  },

  menuItem: {
    minHeight: 46,

    flexDirection: "row",
    alignItems: "center",

    gap: 10,

    paddingHorizontal: 8,

    borderRadius: 10,
  },

  menuIcon: {
    width: 30,
    height: 30,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,
  },

  menuItemText: {
    flex: 1,

    fontSize: 13,
    fontWeight: "700",

    color: COLORS.black,
  },
});
