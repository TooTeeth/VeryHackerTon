import { ToastContainer } from "react-toastify";

import PlaysecionSection from "../../components/ppage/PlaysecondSection";
import PlayfirstSection from "../../components/ppage/Playfirstsection";

export default function Playpage() {
  return (
    <div>
      <ToastContainer />
      <PlaysecionSection />
      <PlayfirstSection />
    </div>
  );
}
