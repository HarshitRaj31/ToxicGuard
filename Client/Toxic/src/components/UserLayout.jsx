
import { Outlet } from "react-router-dom";
import UserNavbar from "./UserNavbar";

function UserLayout() {
  return (
    <div className="user-layout">
      <UserNavbar />
      <Outlet />
    </div>
  );
}

export default UserLayout;
