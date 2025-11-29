import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  type?: ToastType;
  duration?: number; // ms
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setMessage(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback((msg: string, options?: ToastOptions) => {
    clearTimer();
    setMessage(msg);
    setType(options?.type ?? 'success');
    setVisible(true);

    // animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();

    // auto-hide
    const duration = options?.duration ?? 2200;
    timeoutRef.current = setTimeout(() => hide(), duration);
  }, [hide, opacity, translateY]);

  useEffect(() => () => clearTimer(), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const topOffset = (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 12;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible && message && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.container,
              { transform: [{ translateY }], opacity, top: topOffset },
              type === 'success' && styles.success,
              type === 'error' && styles.error,
              type === 'info' && styles.info,
            ]}
          >
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  success: { backgroundColor: '#2ecc71' },
  error: { backgroundColor: '#e74c3c' },
  info: { backgroundColor: '#3498db' },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
