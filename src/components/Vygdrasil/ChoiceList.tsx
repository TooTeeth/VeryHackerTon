// components/Vygddrasil/ChoiceList.tsx

import React from "react";
import { ChoiceItem } from "../../types/vygddrasil.types";

interface ChoiceListProps {
  choices: ChoiceItem[];
  onChoiceClick: (value: string, choiceText: string) => void;
}

export const ChoiceList: React.FC<ChoiceListProps> = ({ choices, onChoiceClick }) => {
  if (choices.length === 0) return null;

  return (
    <ul className="space-y-2">
      {choices.map((item) => (
        <li key={item.id}>
          <button onClick={() => onChoiceClick(item.value, item.choice)} className="text-bronze text-left text-lg font-bold hover:text-gray-300 transition duration-200 ease-in-out">
            &gt; {item.choice}
          </button>
        </li>
      ))}
    </ul>
  );
};
