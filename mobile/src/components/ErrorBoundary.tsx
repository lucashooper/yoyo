import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { humanizeError, logger } from '../services/logger';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  scope?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: humanizeError(error, 'Connection lost — Tap to reconnect'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(this.props.scope ?? 'ErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>{this.props.fallbackTitle ?? 'Something went wrong'}</Text>
          <Text style={styles.body}>{this.state.message || 'Connection lost — Tap to reconnect'}</Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Tap to reconnect</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  buttonText: {
    ...typography.label,
    color: '#fff',
    fontSize: 15,
  },
});
