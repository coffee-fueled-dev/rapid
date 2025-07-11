import React from "react";

export interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function Link({ to, children, className, onClick }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
      // If onClick prevented default, respect that
      if (e.defaultPrevented) {
        return;
      }
    }

    // The micro-router will intercept this click and handle smart navigation
    // No need to prevent default here - let the router handle it
  };

  return (
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

export interface NavLinkProps extends LinkProps {
  activeClassName?: string;
}

export function NavLink({
  to,
  children,
  className = "",
  activeClassName = "active",
  onClick,
}: NavLinkProps) {
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    const checkActive = () => {
      setIsActive(window.location.pathname === to);
    };

    checkActive();

    // Listen for navigation changes (both popstate and custom navigation events)
    const handleNavigation = () => {
      checkActive();
    };

    window.addEventListener("popstate", handleNavigation);

    // Listen for our custom navigation events
    window.addEventListener("rapid-navigation", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("rapid-navigation", handleNavigation);
    };
  }, [to]);

  const finalClassName = isActive
    ? `${className} ${activeClassName}`.trim()
    : className;

  return (
    <Link to={to} className={finalClassName} onClick={onClick}>
      {children}
    </Link>
  );
}
