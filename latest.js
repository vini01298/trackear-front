/* -----------------------------------------
   CONFIGURAÇÕES E CONSTANTES
------------------------------------------ */

// Quais parâmetros aceitamos manipular
const ALLOWED_KEYS = [
  'pixel_id',
  'click_id',
  'CampaignID',
  'CreativeID',
  'adSETID',
  'utm_campaign',
  'utm_medium',
  'utm_content',
  'utm_source',
  'utm_term'
];

/* -----------------------------------------
   FUNÇÕES UTILITÁRIAS
------------------------------------------ */

/**
 * Lê a URL atual e retorna um objeto { chave: valor }
 */
function getUrlParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  const queryArray = queryString.split("&").filter(Boolean);

  queryArray.forEach(function(param) {
    const [key, value] = param.split("=");
    if (key && value !== undefined) {
      params[key] = decodeURIComponent(value);
    }
  });

  return params;
}

/**
 * Armazena no localStorage apenas as chaves em ALLOWED_KEYS,
 * e, se necessário, gera o utm_term (com fallback para browsers antigos).
 */
function storeParamsInLocalStorage(params) {
  // Salva apenas as chaves permitidas
  ALLOWED_KEYS.forEach(key => {
    if (params[key] !== undefined && params[key] !== 'null' && params[key] !== '') {
      localStorage.setItem(key, params[key]);
    }
  });

  // Se já existir um utm_term na URL, não sobrescreve:
  const alreadyHasUtmTerm = !!params.utm_term;

  // Se NÃO tiver utm_term e tivermos dados suficientes para gerar:
  if (
    !alreadyHasUtmTerm &&
    params.pixel_id &&
    params.click_id &&
    params.CampaignID &&
    params.CreativeID &&
    params.adSETID
  ) {
    const domain = window.location.hostname;
    const slug = window.location.pathname;

    // Monta algo como "pixel_id|click_id|CampaignID|CreativeID|adSETID|dominio/slug"
    const utm_term = [
      params.pixel_id,
      params.click_id,
      params.CampaignID,
      params.CreativeID,
      params.adSETID,
      domain + slug
    ].join('|');

    // Guarda no localStorage
    localStorage.setItem('utm_term', utm_term);

    // Monta a nova URL com o utm_term
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('utm_term', utm_term);

    // Tenta substituir sem reload
    if (window.history && typeof window.history.replaceState === 'function') {
      const oldHref = window.location.href; // para comparar depois

      window.history.replaceState({}, '', currentUrl.toString());

      // Verifica no próximo frame se a URL realmente mudou
      requestAnimationFrame(() => {
        // Se a URL não mudou, force o reload
        if (window.location.href === oldHref) {
          window.location.href = currentUrl.toString();
        }
      });
    } else {
      // Fallback direto para browsers muito antigos
      window.location.href = currentUrl.toString();
    }
  }
}

/**
 * Lê os parâmetros salvos no localStorage,
 * retornando um objeto apenas com valores válidos (não null/undefined/vazio).
 */
function getParamsFromLocalStorage() {
  const storedParams = {};
  ALLOWED_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (value && value !== 'null' && value !== 'undefined' && value !== '') {
      storedParams[key] = value;
    }
  });
  return storedParams;
}

/**
 * Converte um objeto em query string, ignorando valores vazios/nulos
 */
function buildQueryString(params) {
  const entries = Object.entries(params)
    .filter(([key, val]) => val !== null && val !== '' && val !== 'null' && val !== undefined);

  return entries
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join('&');
}

/* -----------------------------------------
   FUNÇÕES PRINCIPAIS
------------------------------------------ */

/**
 * Adiciona os parâmetros (pegos do localStorage) ao final de todos os links <a>
 * sem duplicar valores. (Usa URLSearchParams.set() ao invés de concatenar.)
 */
function addParamsToLinks() {
  const storedParams = getParamsFromLocalStorage();
  const links = document.querySelectorAll('a[href]');

  links.forEach(link => {
    const url = new URL(link.href);

    // Define/atualiza cada param no link, evitando duplicações
    Object.keys(storedParams).forEach(key => {
      url.searchParams.set(key, storedParams[key]);
    });

    link.href = url.toString();
  });
}

/**
 * Redireciona para baseUrl, mantendo os parâmetros do localStorage
 */
function redirecionar(baseUrl) {
  const storedParams = getParamsFromLocalStorage();
  const queryString = buildQueryString(storedParams);

  // Se baseUrl já tiver parâmetros, usamos '&', senão '?'
  const separator = baseUrl.includes('?') ? '&' : '?';
  const newUrl = baseUrl + (queryString ? separator + queryString : '');

  window.location.href = newUrl;
}

/* -----------------------------------------
   FLUXO DE EXECUÇÃO
------------------------------------------ */

// 1) Captura quaisquer parâmetros na URL atual
const params = getUrlParams();

// 2) Armazena-os no localStorage e, se necessário, gera utm_term (com fallback)
storeParamsInLocalStorage(params);

// 3) Quando o DOM terminar de carregar, adiciona os parâmetros
// em todos os links da página
document.addEventListener('DOMContentLoaded', () => {
  addParamsToLinks();
});
