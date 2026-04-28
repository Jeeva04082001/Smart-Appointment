import { useEffect, useState } from "react";

function QueueDisplay() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8011/ws/queue/1/");

    ws.onmessage = (e) => {
      setQueue(JSON.parse(e.data));
    };

    return () => ws.close();
  }, []);

  const current = queue.find(q => q.is_serving);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-black text-white">
      
      <h1 className="text-4xl mb-4">Now Serving</h1>

      <h2 className="text-7xl font-bold">
        Token #{current?.token || "--"}
      </h2>

      <div className="mt-6 text-xl">
        Next: {queue[1]?.token || "--"}
      </div>
    </div>
  );
}

export default QueueDisplay;