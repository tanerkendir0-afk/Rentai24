import Constants from "expo-constants";

const ENV = {
  API_BASE_URL:
    Constants.expoConfig?.extra?.apiBaseUrl || "https://app.rentai24.com",
  WS_BASE_URL:
    Constants.expoConfig?.extra?.wsBaseUrl || "wss://app.rentai24.com",
};

export default ENV;
