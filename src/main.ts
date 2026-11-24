import './style.css'

// These types describe only the fields this app displays.
type WeatherDetails = {
  description: string
  icon: string
}

type CurrentWeather = {
  name: string
  main: { temp: number; humidity: number }
  wind: { speed: number }
  weather: WeatherDetails[]
}

type ForecastItem = {
  dt_txt: string
  main: { temp: number }
  weather: WeatherDetails[]
}

type ForecastResponse = { list: ForecastItem[] }

const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('The app container was not found.')
}

app.innerHTML = `
  <main class="weather-card">
    <header class="page-heading">
      <p class="eyebrow">YOUR LOCAL FORECAST</p>
      <h1>Weather Forecast</h1>
      <p class="intro">A little sunshine, wherever you are.</p>
    </header>

    <form class="search-form" aria-label="Search for a city">
      <label class="sr-only" for="city-input">City name</label>
      <input id="city-input" name="city" type="text" value="Chennai"
        placeholder="Enter a city" autocomplete="off" required />
      <button type="submit">Search</button>
    </form>

    <p class="status" role="status" aria-live="polite"></p>
    <section class="current-section" aria-label="Current weather"></section>
    <section class="forecast-section" aria-label="Five-day forecast">
      <h2>5-Day Forecast</h2>
      <div class="forecast-row"></div>
    </section>
  </main>
`

const form = document.querySelector<HTMLFormElement>('.search-form')!
const cityInput = document.querySelector<HTMLInputElement>('#city-input')!
const searchButton = form.querySelector<HTMLButtonElement>('button')!
const statusMessage = document.querySelector<HTMLParagraphElement>('.status')!
const currentSection = document.querySelector<HTMLElement>('.current-section')!
const forecastRow = document.querySelector<HTMLDivElement>('.forecast-row')!

function iconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${encodeURIComponent(icon)}@2x.png`
}

function showCurrentWeather(city: string, weather: CurrentWeather): void {
  const condition = weather.weather[0]
  currentSection.innerHTML = `
    <div class="current-card">
      <div class="current-heading">
        <div>
          <p class="eyebrow">CURRENT WEATHER</p>
          <h2 class="city-name"></h2>
        </div>
        <img class="current-icon" alt="" />
      </div>
      <p class="temperature">${Math.round(weather.main.temp)}<span>°C</span></p>
      <p class="description"></p>
      <div class="weather-details">
        <p><span>Humidity</span><strong>${weather.main.humidity}%</strong></p>
        <p><span>Wind speed</span><strong>${weather.wind.speed} m/s</strong></p>
      </div>
    </div>
  `

  currentSection.querySelector('.city-name')!.textContent = city
  currentSection.querySelector('.description')!.textContent =
    condition.description.replace(/\b\w/g, (letter) => letter.toUpperCase())
  const icon = currentSection.querySelector<HTMLImageElement>('.current-icon')!
  icon.src = iconUrl(condition.icon)
  icon.alt = condition.description
}

function showForecast(items: ForecastItem[]): void {
  // Use the noon forecast for each date, or the closest available time if noon passed.
  const byDay = new Map<string, ForecastItem[]>()
  for (const item of items) {
    const date = item.dt_txt.slice(0, 10)
    const dayItems = byDay.get(date) ?? []
    dayItems.push(item)
    byDay.set(date, dayItems)
  }

  forecastRow.replaceChildren()
  const days = [...byDay.entries()].slice(0, 5)

  for (const [date, dayItems] of days) {
    const forecast = dayItems.reduce((closest, item) => {
      const minutes = Number(item.dt_txt.slice(11, 13)) * 60 +
        Number(item.dt_txt.slice(14, 16))
      const closestMinutes = Number(closest.dt_txt.slice(11, 13)) * 60 +
        Number(closest.dt_txt.slice(14, 16))
      return Math.abs(minutes - 720) < Math.abs(closestMinutes - 720)
        ? item
        : closest
    })
    const condition = forecast.weather[0]
    const card = document.createElement('article')
    card.className = 'forecast-card'

    const day = document.createElement('h3')
    day.textContent = new Date(`${date}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: 'short' },
    )

    const icon = document.createElement('img')
    icon.src = iconUrl(condition.icon)
    icon.alt = condition.description

    const temperature = document.createElement('p')
    temperature.textContent = `${Math.round(forecast.main.temp)}°C`

    card.append(day, icon, temperature)
    forecastRow.append(card)
  }
}

async function loadWeather(city: string): Promise<void> {
  statusMessage.textContent = 'Loading...'
  statusMessage.className = 'status'
  searchButton.disabled = true
  currentSection.replaceChildren()
  forecastRow.replaceChildren()

  try {
    if (!apiKey) {
      throw new Error('Add VITE_OPENWEATHER_API_KEY to your .env file.')
    }

    const query = `q=${encodeURIComponent(city)}&units=metric&appid=${encodeURIComponent(apiKey)}`
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${query}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${query}`),
    ])

    if (currentResponse.status === 404 || forecastResponse.status === 404) {
      throw new Error('City not found. Check the spelling and try again.')
    }
    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Weather could not be loaded. Please try again.')
    }

    const weather = await currentResponse.json() as CurrentWeather
    const forecast = await forecastResponse.json() as ForecastResponse
    if (!forecast.list.length) {
      throw new Error('No forecast is available for this city.')
    }

    showCurrentWeather(weather.name, weather)
    showForecast(forecast.list)
    statusMessage.textContent = ''
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    statusMessage.classList.add('error')
  } finally {
    searchButton.disabled = false
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const city = cityInput.value.trim()
  if (city) {
    loadWeather(city)
  }
})

loadWeather('Chennai')
