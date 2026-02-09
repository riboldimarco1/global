import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  moduleName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName || "Unknown"} crashed:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 gap-3 bg-red-50 dark:bg-red-950/30 rounded-md">
          <div className="text-red-600 dark:text-red-400 font-bold text-lg">
            Error en {this.props.moduleName || "el modulo"}
          </div>
          <div className="text-sm text-red-500 dark:text-red-300 max-w-md text-center">
            {this.state.error?.message || "Ocurrio un error inesperado"}
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            data-testid="button-error-retry"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
