import { Plugin } from '../src/core/plugin-system.js';
import axios from 'axios';

/**
 * Weather Integration Plugin
 * 
 * Provides weather information using OpenWeatherMap API.
 * 
 * Features:
 * - Current weather conditions
 * - Temperature and feels like
 * - Humidity and wind speed
 * - Weather descriptions
 * - City-based lookup
 */
export default class WeatherPlugin extends Plugin {
  constructor() {
    super('integrations-weather', '1.0.0', 'Weather information via OpenWeatherMap');
  }
  
  async onLoad() {
    console.log('🌤️ Weather plugin loaded');
    console.log('   Features: Current weather, Conditions');
  }
  
  async onUnload() {
    console.log('🌤️ Weather plugin unloaded');
  }
  
  // Get weather for a city
  async getWeather(city = 'Cape Town') {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const response = await axios.get(url);
    
    return {
      temp: response.data.main.temp,
      feels_like: response.data.main.feels_like,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      wind: response.data.wind.speed,
      icon: response.data.weather[0].icon,
      city: response.data.name,
      country: response.data.sys.country
    };
  }
}
