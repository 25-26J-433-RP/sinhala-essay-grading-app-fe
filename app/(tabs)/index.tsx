import React from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Button
        title="Scan Photo"
        onPress={() => Alert.alert('Scan Photo', 'This will scan a photo.')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
