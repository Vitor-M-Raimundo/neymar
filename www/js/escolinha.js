const API_KEY = 'pk.189efc57c2334b907bc107b028bc4b36';

// Endpoints Overpass com fallback
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

// ---------------- DISTÂNCIA ----------------
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ---------------- LIMPA TEXTO DO ENDEREÇO ----------------
function limparEndereco(displayName) {
  let endereco = displayName;

  // remove "Região Geográfica ..." e "Região Metropolitana ..."
  endereco = endereco.replace(/,?\s*Região [^,]*/g, "");

  // remove "Brazil"
  endereco = endereco.replace(/,?\s*Brazil/g, "");

  // remove CEP ou números no final (ex: ", 09190-610" ou ", 12345")
  endereco = endereco.replace(/,?\s*\d{5}(-\d{3})?$/g, "");

  // remove vírgulas duplicadas e espaços extras
  endereco = endereco.replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim();

  return endereco;
}

// ---------------- OVERPASS COM FALLBACK ----------------
async function fetchOverpassWithFallback(query, perAttemptMs = 20000) {
  let lastErr;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), perAttemptMs);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=UTF-8" },
        body: query,
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (!resp.ok) {
        console.warn(`Overpass falhou em ${url}: ${resp.status}`);
        if (resp.status === 504 || resp.status === 429) continue;
        throw new Error(`HTTP ${resp.status}`);
      }
      return await resp.json();
    } catch (e) {
      console.warn(`Erro ao consultar ${url}:`, e.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("Falha ao consultar Overpass em todos os espelhos");
}

// ---------------- AUTOCOMPLETE ----------------
async function mostrarSugestoes() {
  const inputEl = document.getElementById("endereco");
  const resultados = document.getElementById("resultados");
  if (!inputEl || !resultados) return;

  const query = inputEl.value.trim().replace(/\s+/g, ' ');
  resultados.innerHTML = "";

  // Evita enviar consultas inválidas (muito longas ou com "cara de código")
  const pareceCodigo = /(\bconst\b|\bfunction\b|[{;}=<>])/i.test(query);
  if (query.length < 3 || query.length > 120 || pareceCodigo) {
    toggleClear();
    return;
  }

  try {
    const resp = await fetch(
      `https://us1.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(query)}&limit=8&format=json&countrycodes=br`
    );

    if (!resp.ok) {
      console.warn('Autocomplete falhou:', resp.status);
      resultados.innerHTML = "<li>Erro ao buscar sugestões</li>";
      toggleClear();
      return;
    }

    const data = await resp.json();

    const filtrados = (data || []).filter(item =>
      item.display_name && item.display_name.includes("Brazil")
    );

    if (!filtrados.length) {
      resultados.innerHTML = "<li>Nenhum resultado encontrado no Brasil</li>";
      toggleClear();
      return;
    }

    filtrados.forEach(item => {
      const li = document.createElement("li");
      li.classList.add("resultado-endereco");

      const enderecoFormatado = limparEndereco(item.display_name);
      li.textContent = enderecoFormatado;

      li.onclick = () => {
        inputEl.value = enderecoFormatado;
        localStorage.setItem('ultimoEndereco', enderecoFormatado);
        resultados.innerHTML = "";
        toggleClear();
        // Busca automaticamente ao selecionar a sugestão
        buscarEscolinhas();
      };

      resultados.appendChild(li);
    });

  } catch (err) {
    console.error("Erro no autocomplete:", err);
    resultados.innerHTML = "<li>Erro ao buscar sugestões</li>";
  }

  toggleClear();
}

// ---------------- BUSCAR ESCOLINHAS ----------------
async function buscarEscolinhas() {
  const inputEl = document.getElementById('endereco');
  const resultados = document.getElementById('resultados');
  if (!inputEl || !resultados) return;

  const endereco = inputEl.value.trim();

  if (!endereco) {
    alert('Por favor, digite um endereço.');
    return;
  }

  const esporteSelecionado = (localStorage.getItem('esporteSelecionado') || '').toLowerCase();
  if (!esporteSelecionado) {
    resultados.innerHTML = '<li>Selecione um esporte antes de buscar.</li>';
    return;
  }

  localStorage.setItem('ultimoEndereco', endereco);
  resultados.innerHTML = '<li>Buscando...</li>';

  try {
    const geoResp = await fetch(
      `https://us1.locationiq.com/v1/search?key=${API_KEY}&q=${encodeURIComponent(endereco)}&format=json&countrycodes=br`
    );

    if (!geoResp.ok) {
      console.warn('Geocoding falhou:', geoResp.status);
      resultados.innerHTML = '<li>Erro ao localizar o endereço. Tente novamente.</li>';
      return;
    }

    const geoData = await geoResp.json();

    if (!geoData.length) {
      resultados.innerHTML = '<li>Endereço não encontrado no Brasil.</li>';
      return;
    }

    const latRef = parseFloat(geoData[0].lat);
    const lonRef = parseFloat(geoData[0].lon);

    const overpassQuery = `
[out:json][timeout:25];
(
  node["leisure"="sports_centre"]["sport"="${esporteSelecionado}"](around:5000,${latRef},${lonRef});
  way["leisure"="sports_centre"]["sport"="${esporteSelecionado}"](around:5000,${latRef},${lonRef});
  relation["leisure"="sports_centre"]["sport"="${esporteSelecionado}"](around:5000,${latRef},${lonRef});
);
out center;
`;

    const overpassData = await fetchOverpassWithFallback(overpassQuery);

    resultados.innerHTML = '';

    let locais = (overpassData.elements || []).filter(item => item.tags && item.tags.name);

    if (!locais.length) {
      resultados.innerHTML = '<li>Nenhuma escolinha encontrada para o esporte selecionado.</li>';
      return;
    }

    locais = locais.map(item => {
      const itemLat = item.lat || (item.center && item.center.lat);
      const itemLon = item.lon || (item.center && item.center.lon);
      const distancia = calcularDistancia(latRef, lonRef, itemLat, itemLon);
      return {
        nome: item.tags.name,
        lat: itemLat,
        lon: itemLon,
        distancia
      };
    });

    locais.sort((a, b) => a.distancia - b.distancia);
    localStorage.setItem('resultados', JSON.stringify(locais));

    locais.forEach(loc => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.classList.add('escolinha-button');

      const nomeDiv = document.createElement('div');
      nomeDiv.classList.add('nome-escola');
      nomeDiv.textContent = loc.nome;

      const distanciaDiv = document.createElement('div');
      distanciaDiv.classList.add('distancia-escola');
      distanciaDiv.textContent = `${(loc.distancia / 1000).toFixed(2)} km`;

      button.appendChild(nomeDiv);
      button.appendChild(distanciaDiv);

      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const enderecoDiv = document.getElementById('endereco-escolinha');
        if (!enderecoDiv) return;
        enderecoDiv.style.display = 'block';
        enderecoDiv.textContent = 'Carregando endereço...';

        try {
          const resp = await fetch(
            `https://us1.locationiq.com/v1/reverse.php?key=${API_KEY}&lat=${loc.lat}&lon=${loc.lon}&format=json`
          );

          if (!resp.ok) {
            enderecoDiv.textContent = 'Erro ao obter o endereço.';
            return;
          }

          const data = await resp.json();
          const enderecoFormatado = limparEndereco(data.display_name || '');
          enderecoDiv.textContent = `Endereço: ${enderecoFormatado}`;
        } catch {
          enderecoDiv.textContent = 'Erro ao obter o endereço.';
        }
      });

      li.appendChild(button);
      resultados.appendChild(li);
    });

  } catch (error) {
    console.error('Erro na busca de escolinhas:', error);
    resultados.innerHTML = '<li>Servidor Overpass indisponível ou demorando para responder. Tente novamente mais tarde.</li>';
  }
}

// ---------------- CONFIGURAÇÕES INICIAIS ----------------
document.addEventListener('DOMContentLoaded', () => {
  const esporte = localStorage.getItem('esporteSelecionado') || '';
  const esporteTitulo = document.getElementById('esporte-titulo');
  if (esporte && esporteTitulo) {
    esporteTitulo.textContent = `Escolinhas de ${esporte}`;
  }

  const enderecoSalvo = localStorage.getItem('ultimoEndereco');
  const resultadosSalvos = localStorage.getItem('resultados');

  const inputEl = document.getElementById('endereco');
  const ulResultados = document.getElementById('resultados');

  if (enderecoSalvo && inputEl) {
    inputEl.value = enderecoSalvo;
  }

  if (resultadosSalvos && ulResultados) {
    ulResultados.innerHTML = '';
    const resultados = JSON.parse(resultadosSalvos);
    resultados.forEach(loc => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.classList.add('escolinha-button');

      const nomeDiv = document.createElement('div');
      nomeDiv.classList.add('nome-escola');
      nomeDiv.textContent = loc.nome;

      const distanciaDiv = document.createElement('div');
      distanciaDiv.classList.add('distancia-escola');
      distanciaDiv.textContent = `${(loc.distancia / 1000).toFixed(2)} km`;

      button.appendChild(nomeDiv);
      button.appendChild(distanciaDiv);

      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const enderecoDiv = document.getElementById('endereco-escolinha');
        if (!enderecoDiv) return;
        enderecoDiv.style.display = 'block';
        enderecoDiv.textContent = 'Carregando endereço...';

        try {
          const resp = await fetch(
            `https://us1.locationiq.com/v1/reverse.php?key=${API_KEY}&lat=${loc.lat}&lon=${loc.lon}&format=json`
          );

          if (!resp.ok) {
            enderecoDiv.textContent = 'Erro ao obter o endereço.';
            return;
          }

          const data = await resp.json();
          const enderecoFormatado = limparEndereco(data.display_name || '');
          enderecoDiv.textContent = `Endereço: ${enderecoFormatado}`;
        } catch {
          enderecoDiv.textContent = 'Erro ao obter o endereço.';
        }
      });

      li.appendChild(button);
      ulResultados.appendChild(li);
    });
  }

  // Enter para buscar
  if (inputEl) {
    inputEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        buscarEscolinhas();
      }
    });
  }

  toggleClear();
});

// ---------------- INPUT ----------------
function toggleClear() {
  const inputEl = document.getElementById('endereco');
  const clearBtn = document.querySelector('.icon.clear');
  if (!inputEl || !clearBtn) return;

  if (inputEl.value.trim() !== '') {
    clearBtn.style.display = 'block';
  } else {
    clearBtn.style.display = 'none';
  }
}

function clearInput() {
  const inputEl = document.getElementById('endereco');
  const resultados = document.getElementById('resultados');
  if (!inputEl || !resultados) return;

  inputEl.value = '';
  resultados.innerHTML = '';
  toggleClear();
  inputEl.focus();
}

window.onload = toggleClear;