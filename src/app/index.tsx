import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function login() {
    if (id === "123456" && password === "123456") {
      setError("");
      router.replace("/explore");
      return;
    }

    setError("رقم المستخدم أو كلمة المرور غير صحيحة");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>تطبيق التوصيل</Text>

            <Text style={styles.subtitle}>
              سجل الدخول لإدارة السائقين وعمليات التوصيل
            </Text>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>رقم المستخدم</Text>

              <TextInput
                value={id}
                onChangeText={(value) => {
                  setId(value);
                  setError("");
                }}
                placeholder="أدخل رقم المستخدم"
                placeholderTextColor="#9590A8"
                keyboardType="number-pad"
                returnKeyType="next"
                style={styles.input}
              />
            </View>

            <View>
              <Text style={styles.label}>كلمة المرور</Text>

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError("");
                }}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor="#9590A8"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={login}
                style={styles.input}
              />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.button}
              onPress={login}
            >
              <Text style={styles.buttonText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            <Text style={styles.demoText}>
              الحساب التجريبي: 123456 / 123456
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D0E5D5",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 40,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#BBCBCB",
  },

  header: {
    marginBottom: 26,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 29,
    fontWeight: "800",
    color: "#634B66",
    textAlign: "right",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#9590A8",
    textAlign: "right",
  },

  form: {
    gap: 16,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "700",
    color: "#634B66",
    textAlign: "right",
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#BBCBCB",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FBFA",
    fontSize: 14,
    color: "#634B66",
    textAlign: "right",
    writingDirection: "rtl",
  },

  errorBox: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FCE8E8",
  },

  errorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B54747",
    textAlign: "right",
  },

  button: {
    height: 48,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#634B66",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  demoText: {
    textAlign: "center",
    fontSize: 11,
    color: "#9590A8",
  },
});
