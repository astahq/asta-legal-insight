import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarContext } from "./SidebarContext";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mobileOpenState, setMobileOpenState] = React.useState(false);

  const isOpen = React.useMemo(() => {
    return isMobile ? mobileOpenState : true;
  }, [isMobile, mobileOpenState]);
  
  const setIsOpen = React.useCallback((open: boolean) => {
    setMobileOpenState(open);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setMobileOpenState((prev) => !prev);
    }
  }, [isMobile]);

  const value = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggleSidebar,
      isMobile,
    }),
    [isOpen, setIsOpen, toggleSidebar, isMobile]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
