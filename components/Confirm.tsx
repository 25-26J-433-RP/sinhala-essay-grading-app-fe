import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<(value: boolean) => void>();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  const show = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setVisible(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.95, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setOpts(null);
    });
  }, [opacity, scale]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      show(options);
    });
  }, [show]);

  const handle = (value: boolean) => {
    resolverRef.current?.(value);
    hide();
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => handle(false)}>
        <Animated.View style={[styles.overlay, { opacity }]}> 
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}> 
            <Text style={styles.title}>{opts?.title}</Text>
            <Text style={styles.message}>{opts?.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => handle(false)}>
                <Text style={styles.buttonText}> {opts?.cancelText || 'Cancel'} </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.confirm]} onPress={() => handle(true)}>
                <Text style={styles.buttonText}> {opts?.confirmText || 'Delete'} </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#23262F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333640',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#B0B3C6',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancel: {
    backgroundColor: '#2a2d37',
    borderWidth: 1,
    borderColor: '#3a3e49',
  },
  confirm: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
