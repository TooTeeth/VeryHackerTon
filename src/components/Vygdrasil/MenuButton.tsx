// components/Vygddrasil/MenuButton.tsx

import React from "react";

interface MenuButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  showCheckmark?: boolean;
}

export const MenuButton: React.FC<MenuButtonProps> = ({
  onClick,
  disabled = false,
  children,
  showCheckmark = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-4xl font-bold transition ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:text-gray-300 hover:scale-105 cursor-pointer"
      }`}
    >
      {children} {showCheckmark && "✓"}
    </button>
  );
};
