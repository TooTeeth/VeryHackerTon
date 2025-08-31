import { ToastContainer } from "react-toastify";
import AdsVeryCard from "../../components/EarnPage/AdsVeryCard";
import FarmVeryChatPost from "../../components/EarnPage/FarmVertyChatPost";

export default function EarnPage() {
  return (
    <div>
      <ToastContainer autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover toastStyle={{ marginTop: "80px" }} />
      <FarmVeryChatPost />
      <AdsVeryCard />
    </div>
  );
}
