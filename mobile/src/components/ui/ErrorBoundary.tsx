import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 bg-background items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-destructive/20 items-center justify-center mb-4">
            <Ionicons name="warning" size={32} color="#ef4444" />
          </View>
          <Text className="text-foreground font-bold text-lg text-center mb-2">
            Something went wrong
          </Text>
          <Text className="text-muted-foreground text-sm text-center mb-6">
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-primary rounded-lg px-6 py-3"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
