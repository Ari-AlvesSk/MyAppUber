import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primaryDomain = domains.split(",")[0]?.trim() ?? "";
  const apiBase = primaryDomain
    ? `https://${primaryDomain}/api`
    : "http://localhost:8080/api";

  return {
    ...config,
    name: "Paraúna Mobi",
    slug: "rideshare",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rideshare",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.rideshare.app",
    },
    android: {
      package: "com.rideshare.app",
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        { origin: "https://replit.com/" },
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#00D26A",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiBase,
    },
  };
};
