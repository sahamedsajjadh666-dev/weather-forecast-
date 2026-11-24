import {useState, useEffect} from "react"
import "./App.css";

function WeatherApp() {
  const [weatherData, setWeatherData] = useState(null);
  const [city, setCity] = useState("Chennai");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city.trim()) {
      return undefined;
    }

    const controller = new AbortController();

    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
        if (!apiKey) {
          throw new Error("Weather API key is not configured");
        }

        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city.trim())}&appid=${apiKey}&units=metric`,
          { signal: controller.signal }
        );

        const weather = await weatherResponse.json();
        if (!weatherResponse.ok) {
          throw new Error(weather.message || "Failed to fetch weather data");
        }

        setWeatherData({
          name: weather.name,
          country: weather.sys?.country,
          temperature: weather.main.temp,
          humidity: weather.main.humidity,
          apparentTemperature: weather.main.feels_like,
          windSpeed: weather.wind?.speed,
          condition: weather.weather?.[0]?.description,
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setError(error.message);
        setWeatherData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(fetchWeatherData, 500);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [city]);

  const handleCityChange = (event) => {
    const nextCity = event.target.value;
    setCity(nextCity);
    setWeatherData(null);

    if (!nextCity.trim()) {
      setLoading(false);
      setError("Please enter a city");
    } else {
      setLoading(true);
      setError(null);
    }
  };

  return (
    <div className="weather-app">
      <h1>Weather App</h1>
      <input
        type="text"
        value={city}
        onChange={handleCityChange}
        placeholder="Enter city"
      />
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {weatherData && (
        <div className="weather-info">
          <h2>{weatherData.name}{weatherData.country ? `, ${weatherData.country}` : ""}</h2>
          <p>{weatherData.temperature}°C</p>
          <p>{weatherData.condition}</p>
          <p>Feels like {weatherData.apparentTemperature}°C</p>
          <p>Humidity: {weatherData.humidity}%</p>
          <p>Wind: {weatherData.windSpeed} km/h</p>
        </div>
      )}
    </div>
  );
}

export default WeatherApp;