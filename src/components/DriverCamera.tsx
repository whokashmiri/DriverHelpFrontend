import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import { CameraView, type FlashMode } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export type DriverCameraPhoto = {
  uri: string;
  width: number;
  height: number;
  name: string;
  mimeType: "image/jpeg";
  source: "camera" | "gallery";
  capturedAt: string;
};

type DriverCameraProps = {
  visible: boolean;
  cameraPermissionGranted: boolean;
  onClose: () => void;
  onPhotoReady: (photo: DriverCameraPhoto) => void | Promise<void>;
  title?: string;
  uploading?: boolean;
};

type RawPhoto = {
  uri: string;
  width: number;
  height: number;
  source: "camera" | "gallery";
  capturedAt: string;
};

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.7;
const ZOOM_STEP = 0.1;

export default function DriverCamera({
  visible,
  cameraPermissionGranted,
  onClose,
  onPhotoReady,
  title = "Take Photo",
  uploading = false,
}: DriverCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const operationRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [flash, setFlash] = useState<FlashMode>("off");
  const [zoom, setZoom] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [photo, setPhoto] = useState<RawPhoto | null>(null);
  const busy = processing || uploading;

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setPhoto(null);
      setProcessing(false);
      setZoom(0);
      operationRef.current = false;
    }
  }, [visible]);

  const prepareImage = useCallback(async (raw: RawPhoto): Promise<DriverCameraPhoto> => {
    // The camera already produces a JPEG at reduced quality. If its
    // dimensions fit, reuse it without a second JPEG encode.
    if (raw.source === "camera" && raw.width <= MAX_IMAGE_WIDTH) {
      return {
        ...raw,
        name: `spark-go-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      };
    }

    // Gallery images may be HEIC/PNG, so always normalize them to JPEG.
    const context = ImageManipulator.manipulate(raw.uri);
    if (raw.width > MAX_IMAGE_WIDTH) {
      context.resize({ width: MAX_IMAGE_WIDTH, height: null });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    return {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      name: `spark-go-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      source: raw.source,
      capturedAt: raw.capturedAt,
    };
  }, []);

  const takePhoto = async () => {
    if (!cameraReady || !cameraRef.current || busy || operationRef.current) return;
    operationRef.current = true;
    setProcessing(true);
    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
        skipProcessing: false,
        shutterSound: true,
      });
      if (!captured?.uri) throw new Error("Camera did not return an image");
      // Display the captured photo immediately; defer resizing until Use Photo.
      setPhoto({
        uri: captured.uri,
        width: captured.width,
        height: captured.height,
        source: "camera",
        capturedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CAMERA] Capture failed:", error);
      Alert.alert("Camera Error", "Unable to take photo. Please try again.");
    } finally {
      operationRef.current = false;
      setProcessing(false);
    }
  };

  const openGallery = async () => {
    if (busy || operationRef.current) return;
    operationRef.current = true;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const selected = result.assets[0];
      if (!selected?.uri) return;
      setPhoto({
        uri: selected.uri,
        width: selected.width,
        height: selected.height,
        source: "gallery",
        capturedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[CAMERA] Gallery failed:", error);
      Alert.alert("Gallery Error", "Unable to select a photo.");
    } finally {
      operationRef.current = false;
    }
  };

  const cycleFlash = () => {
    setFlash((current) => current === "off" ? "on" : current === "on" ? "auto" : "off");
  };

  const retakePhoto = () => {
    if (busy) return;
    setCameraReady(false);
    setPhoto(null);
  };

  const confirmPhoto = async () => {
    if (!photo || busy || operationRef.current) return;
    operationRef.current = true;
    setProcessing(true);
    try {
      const prepared = await prepareImage(photo);
      await onPhotoReady(prepared);
    } catch (error) {
      console.error("[CAMERA] Photo preparation failed:", error);
      Alert.alert("Photo Error", "Unable to prepare the photo. Please try again.");
    } finally {
      operationRef.current = false;
      setProcessing(false);
    }
  };

  const closeCamera = () => {
    if (!busy && !operationRef.current) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={closeCamera}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={closeCamera} disabled={busy} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Close</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.previewContainer}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
          ) : !cameraPermissionGranted ? (
            <View style={styles.center}>
              <Text style={styles.permissionText}>Camera access is not granted.</Text>
              <Pressable style={styles.secondaryButton} onPress={openGallery}>
                <Text style={styles.secondaryText}>Choose from Gallery</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                mode="picture"
                flash={flash}
                zoom={zoom}
                active={visible}
                onCameraReady={() => setCameraReady(true)}
                onMountError={(event) => {
                  setCameraReady(false);
                  console.error("[CAMERA] Mount error:", event.message);
                }}
              />
              <View style={styles.topControls}>
                <Pressable style={styles.controlButton} disabled={busy} onPress={cycleFlash}>
                  <Text style={styles.controlText}>Flash: {flash.toUpperCase()}</Text>
                </Pressable>
              </View>
              <View style={styles.zoomControls}>
                <Pressable style={styles.zoomButton} disabled={busy} onPress={() => setZoom((z) => Math.max(0, Math.round((z - ZOOM_STEP) * 100) / 100))}>
                  <Text style={styles.zoomText}>−</Text>
                </Pressable>
                <Text style={styles.zoomValue}>Zoom {Math.round(zoom * 100)}%</Text>
                <Pressable style={styles.zoomButton} disabled={busy} onPress={() => setZoom((z) => Math.min(1, Math.round((z + ZOOM_STEP) * 100) / 100))}>
                  <Text style={styles.zoomText}>+</Text>
                </Pressable>
              </View>
            </>
          )}
          {processing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>{photo ? "Preparing photo..." : "Capturing..."}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {photo ? (
            <View style={styles.actionRow}>
              <Pressable onPress={retakePhoto} disabled={busy} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Retake</Text>
              </Pressable>
              <Pressable onPress={confirmPhoto} disabled={busy} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Use Photo</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.captureRow}>
              <Pressable onPress={openGallery} disabled={busy} style={styles.galleryButton}>
                <Text style={styles.galleryText}>Gallery</Text>
              </Pressable>
              <Pressable
                onPress={takePhoto}
                disabled={busy || !cameraReady || !cameraPermissionGranted}
                style={styles.captureOuter}
              >
                <View style={styles.captureInner} />
              </Pressable>
              <View style={styles.galleryButton} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101010",
  },

  headerButton: {
    minWidth: 65,
  },

  headerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  previewContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000000",
  },

  preview: {
    width: "100%",
    height: "100%",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 18,
  },

  permissionText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
  },

  topControls: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  controlButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 25,
  },

  controlText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  zoomControls: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 30,
  },

  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#343434",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "500",
  },

  zoomValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  footer: {
    minHeight: 125,
    backgroundColor: "#101010",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 15,
  },

  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },

  galleryButton: {
    width: 78,
    alignItems: "center",
    justifyContent: "center",
  },

  galleryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#208AEF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#303030",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  secondaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
