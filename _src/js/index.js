'use strict';
import { getWeatherInfo } from './hooks/getWeatherInfo';

{
  // 東京の天気を取得
  const getWeather = async () => {
    try {
      // データの取得
      const responseWeather = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.6785&longitude=139.6823&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&past_days=1');
      const responseWeatherJson = await responseWeather.json();
      const responseRain = await fetch('https://weather.tsukumijima.net/api/forecast/city/130010');
      const responseRainJson = await responseRain.json();

      // 天気の情報部分を取得
      const weatherList = responseWeatherJson.daily;
      // 降水確率を取得（今日・明日）
      const chanceOfRainList = responseRainJson.forecasts.slice(0, 2);

      // データを整形して配列に格納する
      const newWeatherList = [];
      for (let i = 1; i < weatherList.time.length; i++) {
        let chanceOfRain = null;
        if (i === 1 || i === 2) {
          chanceOfRain = chanceOfRainList[i - 1].chanceOfRain;
        }
        const weatherObj = {
          index: i,
          time: weatherList.time[i],
          weather_code: weatherList.weather_code[i],
          temperature_2m_max: weatherList.temperature_2m_max[i],
          temperature_2m_min: weatherList.temperature_2m_min[i],
          temperature_2m_max_yesterday: weatherList.temperature_2m_max[i - 1],
          temperature_2m_min_yesterday: weatherList.temperature_2m_min[i - 1],
          chanceOfRain: chanceOfRain,
        };
        newWeatherList.push(weatherObj);
      }

      // 要素を画面に表示
      newWeatherList.map((weather) => {
        const weatherItem = createWeatherItem(weather);
        if (weather.index === 1 || weather.index === 2) {
          document.querySelector('#js-todayWeather').appendChild(weatherItem);
        } else {
          document.querySelector('#js-weekWeather').appendChild(weatherItem);
        }
      });
    } catch (error) {
      console.log(error);
    } finally {
      // ローディングアイコンを消す
      const loaders = document.querySelectorAll('.js-loader');
      loaders.forEach((loader) => {
        loader.style.display = 'none';
      });
    }
  };

  // 天気のアイテムを作成する
  const createWeatherItem = (weather) => {
    // item要素の作成
    let weatherItem = document.createElement('div');
    weatherItem.className = 'c-weather-item';
    if (weather.index === 2) {
      weatherItem.classList.add('tomorrow');
    } else if (weather.index > 2) {
      weatherItem.classList.add('week');
    }

    // headingの作成
    let heading = document.createElement('h3');
    heading.className = 'c-weather-item__heading';

    // 日付のフォーマット
    const date = new Date(weather.time);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const options = { weekday: 'short' };
    const weekday = new Intl.DateTimeFormat('ja-JP', options).format(date);

    if (weather.index === 1) {
      heading.textContent = '今日の天気';
    } else if (weather.index === 2) {
      heading.textContent = '明日の天気';
    } else {
      heading.textContent = `${month}月${day}日 (${weekday})`;
    }

    // contentsの作成
    let contents = document.createElement('div');
    contents.className = 'c-weather-item__contents';

    // 天気の作成
    let weatherDescription = document.createElement('p');
    const weatherInfo = getWeatherInfo(weather.weather_code);
    weatherDescription.textContent = weatherInfo.label;

    let weatherImg = document.createElement('div');
    weatherImg.className = 'c-weather-item__img';

    let img = document.createElement('img');
    img.src = weatherInfo.icon;
    img.alt = weatherInfo.label;
    img.width = 80;
    img.height = 60;

    weatherImg.appendChild(img);

    // 気温の作成
    let weatherTemp = document.createElement('div');
    weatherTemp.className = 'c-weather-item__temp';

    // 最高気温
    let tempMax = document.createElement('p');
    const temMaxCelsius = weather.temperature_2m_max;
    tempMax.className = 'c-weather-item__temp-max';
    tempMax.innerHTML = `<span><span class="c-weather-item__temp-num">${temMaxCelsius}</span>℃</span>`;

    // 最高気温の前日比
    let tempMaxDiff = document.createElement('span');
    const yesterdayMaxTemp = weather.temperature_2m_max_yesterday;
    let diff = getTempDiff(temMaxCelsius, yesterdayMaxTemp);
    tempMaxDiff.textContent = diff;
    tempMax.appendChild(tempMaxDiff);

    // 最低気温
    let tempMin = document.createElement('p');
    const temMinCelsius = weather.temperature_2m_min;
    tempMin.className = 'c-weather-item__temp-min';
    tempMin.innerHTML = `<span><span class="c-weather-item__temp-num">${temMinCelsius}</span>℃</span>`;

    // 最低気温の前日比
    let tempMinDiff = document.createElement('span');
    const yesterdayMinTemp = weather.temperature_2m_min_yesterday;
    diff = getTempDiff(temMinCelsius, yesterdayMinTemp);
    tempMinDiff.textContent = diff;
    tempMin.appendChild(tempMinDiff);

    weatherTemp.appendChild(tempMax);
    weatherTemp.appendChild(tempMin);

    // contentsにすべての要素を追加
    contents.appendChild(weatherDescription);
    contents.appendChild(weatherImg);
    contents.appendChild(weatherTemp);

    // 降水確率
    if (weather.index === 1 || weather.index === 2) {
      let precipitationTable = document.createElement('table');
      precipitationTable.className = 'c-weather-item__precipitation';

      let timeRow = document.createElement('tr');
      timeRow.innerHTML = `
        <th>時間</th>
        <td>0-6時</td>
        <td>6-12時</td>
        <td>12-18時</td>
        <td>18-24時</td>
      `;
      precipitationTable.appendChild(timeRow);

      let precipitationRow = document.createElement('tr');
      const chanceOfRainArray = Object.values(weather.chanceOfRain);
      let precipitationCol = `<th>降水</th>`;
      chanceOfRainArray.map((rain) => {
        precipitationCol += `<td>${rain}</td>`;
      });

      precipitationRow.innerHTML = precipitationCol;
      precipitationTable.appendChild(precipitationRow);
      contents.appendChild(precipitationTable);
    }

    // weatherItemにheadingとcontentsを追加
    weatherItem.appendChild(heading);
    weatherItem.appendChild(contents);

    return weatherItem;
  };

  // 気温の差を取得する
  const getTempDiff = (todayTemp, yesterdayTemp) => {
    let diff = Math.floor(todayTemp - yesterdayTemp);
    if (diff > 0) {
      diff = `+${diff}`;
    }
    return `[${diff}]`;
  };

  getWeather();
}
