import RegisterScreen from "@/components/auth/RegisterScreen";
import { useRouter } from "expo-router";
import React from "react";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <RegisterScreen
      onSwitchToLogin={() => {
        router.push("/login");
      }}
    />
  );
}
