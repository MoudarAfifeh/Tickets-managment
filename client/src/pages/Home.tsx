import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";

function Home() {
  const [message, setMessage] = useState("Checking API...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setMessage(`API status: ${data.status}`))
      .catch(() => setMessage("API unreachable"));
  }, []);

  return (
    <div>
      <NavBar />
      <div>Tickets</div>
      <p>{message}</p>
    </div>
  );
}

export default Home;
