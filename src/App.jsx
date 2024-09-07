import React, { useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import "./App.css";

function App() {
  const [predictions, setPredictions] = useState({
    day: { predictedLoad: [], actualLoad: [] },
    week: { predictedLoad: [], actualLoad: [] },
    month: { predictedLoad: [], actualLoad: [] },
  });
  const [date, setDate] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPrediction = async (type) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/predict/${type}?date=${date}`
      );
      console.log(`Fetched ${type} prediction:`, response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching prediction:", err);
      setError(`Error fetching ${type} prediction. ${err.message}`);
      return { predicted_load: [], actual_load: [] }; // Return empty data structure to avoid undefined access
    }
  };

  const handlePredict = async () => {
    setError(null);
    setLoading(true);
    if (!date) {
      setError("Please enter a valid date.");
      setLoading(false);
      return;
    }
    try {
      const dayPrediction = await fetchPrediction("day");
      const weekPrediction = await fetchPrediction("week");
      const monthPrediction = await fetchPrediction("month");

      setPredictions({
        day: {
          predictedLoad: dayPrediction.predicted_load,
          actualLoad: dayPrediction.actual_load,
        },
        week: {
          predictedLoad: weekPrediction.predicted_load,
          actualLoad: weekPrediction.actual_load,
        },
        month: {
          predictedLoad: monthPrediction.predicted_load,
          actualLoad: monthPrediction.actual_load,
        },
      });
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createChartData = (predictedLoad = [], actualLoad = []) => {
    console.log("Creating chart data:", { predictedLoad, actualLoad });
    return {
      labels: predictedLoad.length
        ? [...Array(predictedLoad.length).keys()].map((i) => `Step ${i + 1}`)
        : [],
      datasets: [
        {
          label: "Predicted Load",
          data: predictedLoad,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
        },
        {
          label: "Actual Load",
          data: actualLoad,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
        },
      ],
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Load Predictions",
      },
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Time Step",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Load Value",
        },
      },
    },
  };

  console.log("Predictions state:", predictions);

  return (
    <div className="App">
      <h1>Load Prediction</h1>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="YYYY-MM-DD"
      />
      <button onClick={handlePredict}>Predict Future Load</button>
      {loading && <p>Loading predictions...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <h2>Load Prediction Results</h2>
        <div style={{ width: "100%", height: "300px" }}>
          <h3>Daily Prediction</h3>
          <Line
            data={createChartData(
              predictions.day.predictedLoad,
              predictions.day.actualLoad
            )}
            options={options}
          />
        </div>
        <div style={{ width: "100%", height: "300px" }}>
          <h3>Weekly Prediction</h3>
          <Line
            data={createChartData(
              predictions.week.predictedLoad,
              predictions.week.actualLoad
            )}
            options={options}
          />
        </div>
        <div style={{ width: "100%", height: "300px" }}>
          <h3>Monthly Prediction</h3>
          <Line
            data={createChartData(
              predictions.month.predictedLoad,
              predictions.month.actualLoad
            )}
            options={options}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
