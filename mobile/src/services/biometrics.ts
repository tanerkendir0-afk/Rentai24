import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync("biometricEnabled");
  return stored === "true";
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Authenticate to access RentAI 24",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync("biometricEnabled", enabled.toString());
}
