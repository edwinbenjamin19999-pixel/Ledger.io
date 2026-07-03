import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`TabErrorBoundary [${this.props.tabName}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="p-4 rounded-full bg-[#FAEEDA]">
            <AlertTriangle className="w-8 h-8 text-[#7A5417]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {this.props.tabName} kunde inte laddas
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Försök att navigera bort och tillbaka
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto break-words">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Försök igen
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
