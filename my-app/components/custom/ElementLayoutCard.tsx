import React from "react";
import { IconType } from "react-icons"; // If you're using react-icons

interface LayoutProps {
  icon: IconType; // Expecting a React component for the icon
  label: string;
}

interface ElementLayoutCardProps {
  layout: LayoutProps;
}

const ElementLayoutCard: React.FC<ElementLayoutCardProps> = ({ layout }) => {
  return (
    <div className="dark:bg-gray-800 flex flex-col items-center justify-center dark:border border-dashed border-transparent dark:border-gray-500 hover:dark:border-gray-300 rounded-xl p-3 group hover:shadow-md cursor-pointer transition-colors duration-300">
      {layout.icon && (
        <layout.icon className="p-2 h-9 w-9 dark:bg-black group-hover:text-primary group-hover:bg-purple-100 rounded-full" />
      )}
      <h2 className="text-sm group-hover:text-primary">{layout.label}</h2>
    </div>
  );
};

export default ElementLayoutCard;

