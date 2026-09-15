import { FileText, MoreVertical, UserRound, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

type AppLanguage = "en" | "ar";

type AppHeaderUser = {
  id: string;
  name?: string;
  iqamaId?: string;
  role?: "driver" | "supervisor" | "admin";
};

type AppHeaderProps = {
  language: AppLanguage;

  onLanguageChange: (language: AppLanguage) => void;

  user?: AppHeaderUser | null;

  onProfilePress?: () => void;

  onTermsPress?: () => void;
};

export function AppHeader({
  language,
  onLanguageChange,
  user,
  onProfilePress,
  onTermsPress,
}: AppHeaderProps) {
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
    onProfilePress?.();
  };

  const handleTermsPress = () => {
    closeMenu();
    onTermsPress?.();
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
              onPress={() => onLanguageChange("en")}
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
              onPress={() => onLanguageChange("ar")}
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
            <MoreVertical size={22} color="#111827" />
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

              <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {user && (
              <>
                <View style={styles.userBlock}>
                  <View style={styles.avatar}>
                    <UserRound size={20} color="#111827" />
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

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleProfilePress}
                  activeOpacity={0.7}
                >
                  <UserRound size={19} color="#374151" />

                  <Text style={styles.menuItemText}>{labels.profile}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleTermsPress}
              activeOpacity={0.7}
            >
              <FileText size={19} color="#374151" />

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
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  brandContainer: {
    flex: 1,
  },

  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 1,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  languageToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },

  languageButton: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },

  languageButtonActive: {
    backgroundColor: "#111827",
  },

  languageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  languageTextActive: {
    color: "#FFFFFF",
  },

  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  menu: {
    position: "absolute",
    top: 56,
    width: 280,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
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
    marginBottom: 12,
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },

  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  userSubText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  roleText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "capitalize",
  },

  menuItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
});
