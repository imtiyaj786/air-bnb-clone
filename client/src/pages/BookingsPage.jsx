import { useEffect, useState } from "react";
import AccountNav from "../AccountNav";
import axios from "axios";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    axios.get("/bookings").then((response) => {
      setBookings(response.data);
    });
  }, []);

  return (
    <div className="">
      <AccountNav />
    </div>
  );
}
