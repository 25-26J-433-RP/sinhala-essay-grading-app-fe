import LoginScreen from "@/components/auth/LoginScreen";
import { useRouter } from "expo-router";
import React from "react";

export default function LoginPage() {
  const router = useRouter();

  return (
    <LoginScreen
      onSwitchToRegister={() => {
        router.push("/register");
      }}
    />
  );
}
