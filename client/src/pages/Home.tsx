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
      <div className="p-6">
        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Tickets
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

export default Home;
