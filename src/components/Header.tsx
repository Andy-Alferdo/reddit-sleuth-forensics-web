import React, { Component } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

/**
 * Header Component - Class-based implementation
 * Displays the application header with title and description
 */
class Header extends Component {
  /**
   * Render the header
   */
  public render(): JSX.Element {
    return (
      <header className="h-16 bg-card border-b border-border flex items-center justify-center px-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary">Intel Reddit</h1>
          <p className="text-xs text-muted-foreground">Digital Forensics Suite</p>
        </div>
      </header>
    );
  }
}

export default Header;
