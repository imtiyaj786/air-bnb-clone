import { useContext, useState } from "react";
import { UserContext } from "../UserContext";
import { Navigate, useParams } from "react-router-dom";
import axios from "axios";
import PlacesPage from "./PlacesPage";
import AccountNav from "../AccountNav";

export default function AccountPage() {
  const { ready, user, setUser } = useContext(UserContext);
  const [toHomePage, setToHomePage] = useState(null);

  // here by default undefined is coming for profile page
  let { subpage } = useParams();
  if (subpage === undefined) {
    subpage = "profile";
  }

  // for logout
  async function logout() {
    await axios.post("/logout");
    setToHomePage("/");
    setUser(null);
  }

  if (!ready) {
    return "Loading...";
  }
  if (ready && !user && !toHomePage) {
    return <Navigate to={"/login"} />;
  }

  if (toHomePage) {
    return <Navigate to={toHomePage} />;
  }

  return (
    <div>
      {/* account nav */}
      <AccountNav />
      {subpage === "profile" && (
        <div className="text-center max-w-lg mx-auto">
          Logged in as {user.name} ({user.email}) <br />
          <button onClick={logout} className="primary max-w-sm mt-2">
            Logout
          </button>
        </div>
      )}
      {/* this is for showing place */}
      {subpage === "places" && <PlacesPage />}
    </div>
  );
}
