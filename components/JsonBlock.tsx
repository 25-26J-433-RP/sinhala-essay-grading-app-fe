import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function JsonBlock({ obj }: { obj: unknown }) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal>
        <Text style={styles.code}>
          {JSON.stringify(obj, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0b1020",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  code: {
    color: "#e5e7eb",
    fontFamily: "monospace",
    fontSize: 12,
  },
});
