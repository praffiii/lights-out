import { Component, type ReactNode } from 'react'

export class CircuitGuard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch() {
    this.props.onError()
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}
